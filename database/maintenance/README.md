# Резервное копирование БД

Еженедельный дамп прод-базы `construction_crm` (контейнер `crm-postgres`) → REG.RU S3
(бакет `crm-315`, префикс `backups/db/`). Скрипт переиспользует те же `AWS_S3_*`
креды, что и загрузки приложения (читает `backend/.env` на сервере — в git не хранятся).

## Что делает `pg_backup.sh`

1. `pg_dump --clean --if-exists --no-owner` из контейнера `crm-postgres`, gzip.
2. Проверка, что дамп не пустой (> 10 КБ), иначе аборт без заливки.
3. Заливка в `s3://crm-315/backups/db/construction_crm-YYYY-MM-DD.sql.gz`
   **через контейнер `crm-api-gateway`** (дамп стримится в `node` по stdin,
   `@aws-sdk/client-s3`; без временных файлов внутри контейнера). Так
   переиспользуется тот же путь, что у приложения:
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

### Алерт о провале
При любом ненулевом выходе `pg_backup.sh` шлёт broadcast-уведомление супер-админам
(roleId 1, `notificationType: error`) через `notifications-service`
(`/notifications/internal/broadcast`), маршрутизируя запрос через gateway-контейнер.
Так молча падающий cron не останется незамеченным. На успехе пишет heartbeat
`backups/.last_success` (unix-время) — для внешнего мониторинга на «протухание».

## Проверка восстановления — `pg_restore_verify.sh`

Непроверенный бэкап = кот Шрёдингера. Скрипт скачивает **последний** дамп из S3
(через gateway), разворачивает его во **временную** БД `construction_crm_restore_check`,
проверяет целостность gzip и считает строки в `accounts`/`users` (прод-дамп не пустой),
затем дропает временную БД. **Прод не трогается.** Падение → тот же алерт супер-админам.

```bash
/opt/crm-system/database/maintenance/pg_restore_verify.sh
```

Ежемесячный cron (1-го числа, 04:00):
```bash
0 4 1 * *  /opt/crm-system/database/maintenance/pg_restore_verify.sh >> /var/log/crm-pg-restore-verify.log 2>&1
```

## Restore (ВНИМАНИЕ: перезапишет прод-базу)

```bash
# взять локальную копию из backups/ ИЛИ скачать дамп из S3 через gateway:
docker exec -e BK_KEY="backups/db/construction_crm-YYYY-MM-DD.sql.gz" crm-api-gateway node -e '
const {S3Client,GetObjectCommand}=require("@aws-sdk/client-s3");
const s3=new S3Client({region:process.env.AWS_S3_REGION||"ru-1",endpoint:process.env.AWS_S3_ENDPOINT,forcePathStyle:true,credentials:{accessKeyId:process.env.AWS_S3_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_S3_SECRET_ACCESS_KEY}});
s3.send(new GetObjectCommand({Bucket:process.env.AWS_S3_BUCKET_NAME,Key:process.env.BK_KEY})).then(r=>r.Body.pipe(process.stdout)).catch(e=>{console.error(e.message);process.exit(1)});
' > restore.sql.gz

gunzip -c restore.sql.gz \
  | docker exec -i crm-postgres psql -U postgres -d construction_crm
```

Дамп сделан с `--clean --if-exists`, поэтому пересоздаёт объекты поверх текущих.

## Переменные (override через окружение)

| Переменная | Дефолт | Назначение |
|------------|--------|------------|
| `ENV_FILE` | `<repo>/backend/.env` | откуда брать `AWS_S3_*` |
| `BACKUP_DIR` | `<script>/backups` | где держать локальные копии (под `.gitignore`) |
| `PG_CONTAINER` | `crm-postgres` | имя контейнера Postgres |
| `GATEWAY_CONTAINER` | `crm-api-gateway` | контейнер для заливки/скачивания S3 |
| `PG_DB` | `construction_crm` | имя БД |
| `LOCAL_RETENTION` | `8` | сколько локальных дампов хранить |
| `ALERT_ACCOUNT_ID` | `1` | аккаунт, чьи супер-админы получают алерт о провале |
| `VERIFY_DB` | `construction_crm_restore_check` | временная БД для restore-drill |

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
