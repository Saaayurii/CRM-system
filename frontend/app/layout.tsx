import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/providers/ThemeProvider';
import AuthProvider from '@/providers/AuthProvider';
import OfflineBanner from '@/components/ui/OfflineBanner';
import ServiceWorkerInit from '@/components/layout/ServiceWorkerInit';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'CRM Система',
    template: '%s | CRM Система',
  },
  description: 'Система управления строительными проектами — задачи, персонал, материалы, финансы.',
  keywords: ['CRM', 'строительство', 'управление проектами', 'HR', 'задачи'],
  authors: [{ name: 'CRM Система' }],
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'apple-touch-icon-precomposed', url: '/apple-touch-icon-precomposed.png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CRM',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    title: 'CRM Система',
    description: 'Система управления строительными проектами',
    siteName: 'CRM Система',
  },
  twitter: {
    card: 'summary',
    title: 'CRM Система',
    description: 'Система управления строительными проектами',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CRM" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.variable} font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <OfflineBanner />
          <ServiceWorkerInit />
        </ThemeProvider>
      </body>
    </html>
  );
}
