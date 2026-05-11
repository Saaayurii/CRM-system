import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  robots: { index: true, follow: false },
};

const LAST_UPDATED = '07 мая 2025 г.';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 64 64">
                <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">3.15 CRM</span>
          </div>
          <Link
            href="/auth/login"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Войти
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Политика конфиденциальности</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
          Последнее обновление: {LAST_UPDATED}
        </p>

        <div className="space-y-10 text-[15px] leading-7">

          <Section title="1. Общие положения">
            <p>
              Настоящая Политика конфиденциальности регулирует порядок сбора, использования и хранения персональных данных пользователей CRM-системы управления строительными проектами (далее — «Система»).
            </p>
            <p>
              Используя Систему, вы подтверждаете, что ознакомились с настоящей Политикой и даёте согласие на обработку ваших персональных данных в описанном ниже объёме.
            </p>
          </Section>

          <Section title="2. Какие данные мы собираем">
            <p>Система собирает и обрабатывает следующие категории данных:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Идентификационные данные:</strong> имя, фамилия, отчество, должность.</li>
              <li><strong>Контактные данные:</strong> адрес электронной почты, номер телефона.</li>
              <li><strong>Учётные данные:</strong> логин, хешированный пароль (в открытом виде не хранится).</li>
              <li><strong>Рабочие данные:</strong> задачи, проекты, комментарии, переписка внутри чата Системы.</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип браузера, данные сессии, журналы действий (audit log).</li>
              <li><strong>Загружаемые файлы:</strong> документы, фотографии, аватары, прикреплённые к задачам и проектам.</li>
            </ul>
          </Section>

          <Section title="3. Цели обработки данных">
            <p>Собранные данные используются исключительно для:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>аутентификации и авторизации пользователей в Системе;</li>
              <li>организации совместной работы сотрудников: ведения задач, проектов, общения в чате;</li>
              <li>отправки уведомлений, связанных с рабочими процессами (email, in-app);</li>
              <li>формирования отчётов и аналитики для руководителей организации;</li>
              <li>обеспечения безопасности и расследования инцидентов через журнал аудита;</li>
              <li>технической поддержки и устранения ошибок.</li>
            </ul>
            <p className="mt-3">
              Данные не передаются третьим лицам в коммерческих целях и не используются для таргетированной рекламы.
            </p>
          </Section>

          <Section title="4. Хранение и защита данных">
            <p>
              Все данные хранятся на серверах, размещённых в защищённой инфраструктуре. Доступ к базам данных ограничен и предоставляется только авторизованным администраторам системы.
            </p>
            <p>Меры защиты включают:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>шифрование паролей с использованием современных алгоритмов хеширования (bcrypt);</li>
              <li>передачу данных по защищённому протоколу HTTPS/TLS;</li>
              <li>JWT-токены с ограниченным сроком действия для управления сессиями;</li>
              <li>ролевую модель доступа — каждый пользователь видит только те данные, которые соответствуют его роли;</li>
              <li>журналирование всех критических действий (audit log).</li>
            </ul>
          </Section>

          <Section title="5. Сроки хранения">
            <p>
              Персональные данные хранятся в течение всего срока существования учётной записи. После удаления аккаунта личные идентификаторы обезличиваются, рабочие данные (задачи, сообщения) сохраняются в архивном виде для обеспечения непрерывности бизнес-процессов.
            </p>
            <p>
              Журналы аудита хранятся не более 12 месяцев, после чего автоматически архивируются или удаляются.
            </p>
          </Section>

          <Section title="6. Передача данных третьим лицам">
            <p>
              Система не продаёт и не передаёт персональные данные пользователей сторонним организациям, за исключением случаев:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>прямого согласия пользователя;</li>
              <li>требований законодательства Российской Федерации;</li>
              <li>технической необходимости (например, отправка email через SMTP-провайдера — данные передаются только для доставки сообщения).</li>
            </ul>
          </Section>

          <Section title="7. Права пользователей">
            <p>Каждый пользователь Системы вправе:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>получить информацию о составе обрабатываемых персональных данных;</li>
              <li>обновить или исправить свои данные через раздел настроек профиля;</li>
              <li>запросить удаление учётной записи, обратившись к администратору системы;</li>
              <li>отозвать согласие на обработку данных — в этом случае использование Системы прекращается.</li>
            </ul>
          </Section>

          <Section title="8. Файлы cookie и локальное хранилище">
            <p>
              Система использует файлы cookie и localStorage исключительно для технических целей:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>хранения refresh-токена для поддержания сессии;</li>
              <li>сохранения пользовательских предпочтений (тема оформления, черновики форм);</li>
              <li>кеширования данных для работы в оффлайн-режиме.</li>
            </ul>
            <p className="mt-3">
              Счётчики, маркетинговые и аналитические cookie сторонних сервисов не используются.
            </p>
          </Section>

          <Section title="9. Уведомления об изменениях">
            <p>
              В случае существенных изменений настоящей Политики пользователи будут уведомлены через интерфейс Системы. Продолжение использования Системы после публикации изменений означает согласие с обновлённой редакцией.
            </p>
          </Section>

          <Section title="10. Контактная информация">
            <p>
              По вопросам обработки персональных данных обращайтесь к администратору вашей организации или системному администратору CRM-системы через внутренний чат или электронную почту, указанную при регистрации организации.
            </p>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400 dark:text-gray-500">
          <span>© {new Date().getFullYear()} 3.15 CRM. Все права защищены.</span>
          <div className="flex gap-4">
            <Link href="/auth/login" className="hover:text-violet-500 transition-colors">Войти в систему</Link>
            <Link href="/auth/register" className="hover:text-violet-500 transition-colors">Регистрация</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="space-y-3 text-gray-600 dark:text-gray-300">{children}</div>
    </section>
  );
}
