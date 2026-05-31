import type { Metadata } from 'next';
import LandingClient from './LandingClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.3stroy15.pro';

export const metadata: Metadata = {
  title: '3.15 CRM — система управления строительными проектами',
  description:
    'Облачная CRM для строительных компаний: проекты и объекты, задачи и бригады, склад материалов, поставщики, финансы и бюджеты, контроль качества, HR, корпоративный чат, документы и аналитика. Клиентский портал и гибкие тарифы.',
  keywords: [
    'CRM для строительства',
    'управление строительными проектами',
    'строительная CRM',
    'учёт материалов',
    'контроль качества на стройке',
    'управление бригадами',
    'клиентский портал застройщика',
    '3.15 CRM',
    'СтройCRM',
  ],
  alternates: { canonical: `${BASE_URL}/landing` },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: `${BASE_URL}/landing`,
    siteName: '3.15 CRM',
    title: '3.15 CRM — управляйте стройкой целиком',
    description:
      'Проекты, задачи, материалы, финансы, контроль качества, HR и чат — всё в одной системе. Клиентский портал и гибкие тарифы.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3.15 CRM — управляйте стройкой целиком',
    description:
      'Облачная CRM для строительных компаний: проекты, материалы, финансы, контроль качества и клиентский портал.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '3.15 CRM',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android (PWA)',
  description:
    'Облачная CRM для управления строительными проектами: задачи, материалы, финансы, контроль качества, HR, чат и клиентский портал.',
  url: `${BASE_URL}/landing`,
  inLanguage: 'ru',
  offers: [
    {
      '@type': 'Offer',
      name: 'Старт',
      price: '4900',
      priceCurrency: 'RUB',
      description: 'До 10 пользователей, базовые модули.',
    },
    {
      '@type': 'Offer',
      name: 'Бизнес',
      price: '12900',
      priceCurrency: 'RUB',
      description: 'До 50 пользователей, все модули, клиентский портал.',
    },
    {
      '@type': 'Offer',
      name: 'Корпоративный',
      price: '0',
      priceCurrency: 'RUB',
      description: 'Безлимит пользователей, on-premise, индивидуальная стоимость.',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '124',
  },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
