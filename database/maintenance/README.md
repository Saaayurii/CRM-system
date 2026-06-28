# Резервное копирование БД

Еженедельный дамп прод-базы `construction_crm` (контейнер `crm-postgres`) → REG.RU S3
(бакет `crm-315`, префикс `backups/db/`). Скрипт переиспользует те же `AWS_S3_*`
креды, что и загрузки приложения (читает `backend/.env` на сервере — в git не хранятся).

## Что делает `pg_backup.sh`

1. `pg_dump --clean --if-exists --no-owner` из контейнера `crm-postgres`, gzip.
2. Проверка, что дамп не пустой (> 10 КБ), иначе аборт без заливки.
3. Заливка в `s3://crm-315/backups/db/construction_crm-YYYY-MM-DD.sql.gz`
   **через контейнер `crm-api-gateway`** (`docker cp` дампа внутрь + `node` с
   `@aws-sdk/client-s3`). Так переиспользуется тот же путь, что у приложения:
   те же креды и — главное — то же доверие к TLS. REG.RU отдаёт цепочку с
   корнем, которого нет в CA-bundle у `amazon/aws-cli` (Python/certifi) →
   `self-signed certificate in chain`; Node-бандл его принимает. Заливать через
   gateway надёжнее, чем глушить проверку сертификата (`--no-verify-ssl`) на
   дампе со всеми данными клиентов.
4. Локально хранит последние `LOCAL_RETENTION` (по умолчанию 8 ≈ 2 месяца) для
   быстрого restore, остальные удаляет. В S3 — все (ротацию там можно повесить
   на bucket lifecycle, см. ниже).

> Требование: контейнер `crm-api-gateway` должен быть запущен (для прода это
> всегда так — если он лёг, прод и так недоступен). Дамп снимается до заливки;
> если gateway недоступен, локальная копия остаётся, скрипт выходит с ошибкой.

## Установка cron на сервере

```bash
ssh -p 13022 admin_315@87.249.8.218
crontab -e
# Воскресенье 03:17
17 3 * * 0  /opt/crm-system/database/maintenance/pg_backup.sh >> /var/log/crm-pg-backup.log 2>&1
```

Первый прогон вручную (проверить, что креды читаются и заливка идёт):

```bash
/opt/crm-system/database/maintenance/pg_backup.sh
```

> Пользователь cron должен иметь доступ к `docker` (группа `docker` или root).

## Restore (ВНИМАНИЕ: перезапишет базу)

```bash
# скачать нужный дамп из S3 (через тот же aws-cli контейнер) или взять локальный
gunzip -c construction_crm-YYYY-MM-DD.sql.gz \
  | docker exec -i crm-postgres psql -U postgres -d construction_crm
```

Дамп сделан с `--clean --if-exists`, поэтому пересоздаёт объекты поверх текущих.

## Переменные (override через окружение)

| Переменная | Дефолт | Назначение |
|------------|--------|------------|
| `ENV_FILE` | `<repo>/backend/.env` | откуда брать `AWS_S3_*` |
| `BACKUP_DIR` | `<script>/local` | где держать локальные копии |
| `PG_CONTAINER` | `crm-postgres` | имя контейнера Postgres |
| `PG_DB` | `construction_crm` | имя БД |
| `LOCAL_RETENTION` | `8` | сколько локальных дампов хранить |

## RPO / RTO

- **RPO** (макс. потеря данных): до **7 дней** при недельном расписании. Если нужно
  меньше — поставь крон чаще (ежедневно `0 3 * * *`) или включи WAL-archiving / PITR
  (это уже отдельный шаг, см. приоритет #4 в обсуждении инфраструктуры).
- **RTO** (время восстановления): один `gunzip | psql` на свежем `crm-postgres`,
  обычно минуты для базы такого размера.

## Опционально: автоудаление старых дампов в S3

REG.RU S3 поддерживает bucket lifecycle. Чтобы не копить дампы вечно, можно повесить
правило «удалять `backups/db/` объекты старше N дней» через `aws s3api
put-bucket-lifecycle-configuration --endpoint-url https://s3.regru.cloud`. Не входит
в скрипт намеренно — это разовая настройка бакета, а не задача каждого прогона.
