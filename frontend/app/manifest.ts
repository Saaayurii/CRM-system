import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CRM Система',
    short_name: 'CRM',
    description: 'Система управления строительными проектами',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#7c3aed',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    lang: 'ru',
    icons: [
      {
        src: '/favicon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Задачи',
        url: '/dashboard/tasks',
        description: 'Мои задачи',
      },
      {
        name: 'Проекты',
        url: '/dashboard/projects',
        description: 'Проекты',
      },
    ],
  };
}
