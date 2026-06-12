import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/providers/ThemeProvider';
import AuthProvider from '@/providers/AuthProvider';
import OfflineBanner from '@/components/ui/OfflineBanner';
import ServiceWorkerInit from '@/components/layout/ServiceWorkerInit';

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: '3.15 CRM',
    template: '%s | 3.15 CRM',
  },
  description: 'Система управления строительными проектами — задачи, персонал, материалы, финансы.',
  keywords: ['CRM', 'строительство', 'управление проектами', 'HR', 'задачи'],
  authors: [{ name: '3.15 CRM' }],
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
      { rel: 'icon', url: '/favicon.ico' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '3.15 CRM',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    title: '3.15 CRM',
    description: 'Система управления строительными проектами',
    siteName: '3.15 CRM',
  },
  twitter: {
    card: 'summary',
    title: '3.15 CRM',
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
        <meta name="apple-mobile-web-app-title" content="3.15 CRM" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="msapplication-tap-highlight" content="no" />
        {/* Apply theme/accent/font-size before paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var raw = localStorage.getItem('appearance');
            var a = raw ? JSON.parse(raw) : null;
            var sys = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            var dark = false;
            if (a) {
              var night = false;
              if (a.nightMode === 'scheduled' && a.nightStart && a.nightEnd) {
                var p = function (s) { var x = s.split(':'); return (+x[0]) * 60 + (+x[1]); };
                var d = new Date(); var cur = d.getHours() * 60 + d.getMinutes();
                var st = p(a.nightStart), en = p(a.nightEnd);
                night = st < en ? (cur >= st && cur < en) : (cur >= st || cur < en);
              }
              dark = a.mode === 'night' || (a.mode === 'system' && sys) ||
                ((a.mode === 'classic' || a.mode === 'day') && ((a.nightMode === 'system' && sys) || night));
              var accent = a.accentSetByUser ? a.accent : (localStorage.getItem('companyAccent') || a.accent);
              if (accent && accent !== 'violet') document.documentElement.setAttribute('data-accent', accent);
              if (a.bubbleColor && a.bubbleColor !== 'accent') document.documentElement.setAttribute('data-bubble', a.bubbleColor);
              if (a.density === 'compact') document.documentElement.setAttribute('data-density', 'compact');
              if (a.liquidGlass) document.documentElement.setAttribute('data-glass', '');
              if (a.fontSize && a.fontSize !== 16) document.documentElement.style.fontSize = a.fontSize + 'px';
              if (a.chatFontSize && a.chatFontSize !== 14) document.documentElement.style.setProperty('--chat-font-size', a.chatFontSize + 'px');
            } else {
              dark = localStorage.getItem('theme') === 'dark';
            }
            if (dark) {
              document.documentElement.classList.add('dark');
              document.documentElement.style.colorScheme = 'dark';
            }
          } catch (e) {}
        `}} />
        {/* Capture beforeinstallprompt before React mounts */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaInstallPrompt = e;
            window.dispatchEvent(new Event('pwainstallready'));
          });
          window.addEventListener('appinstalled', function() {
            window.__pwaInstallPrompt = null;
            window.__pwaInstalled = true;
            window.dispatchEvent(new Event('pwainstalled'));
          });
        `}} />
      </head>
      <body className={`${inter.variable} font-inter antialiased bg-[#e9e9e9] dark:bg-gray-900 text-gray-800 dark:text-gray-100`}>
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
