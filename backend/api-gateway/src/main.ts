import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { createUploadsAuthMiddleware } from './common/middleware/uploads-auth';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Шлюз стоит за nginx в docker-сети: доверяем приватным хопам, чтобы req.ip
  // был реальным клиентским адресом из X-Forwarded-For, а не IP прокси-контейнера.
  // Иначе сессии и rate-limit видят один и тот же 172.x для всех пользователей.
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  // Не раскрываем стек: убираем `X-Powered-By: Express` (аудит #7).
  app.disable('x-powered-by');

  // Заголовки безопасности на ответах шлюза (API + /uploads) — аудит #5.
  // Фронт (Next.js) выставляет свой набор в next.config.ts; здесь дублируем
  // базовый минимум для прямых ответов gateway, которые не проходят через Next.
  const isProd = process.env.NODE_ENV === 'production';
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // SAMEORIGIN (не DENY): same-origin превью PDF/файлов из /uploads в <iframe>
    // должно работать, при этом внешний клик-джекинг закрыт. Совпадает с фронтом.
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (isProd) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
      );
    }
    next();
  });

  const configService = app.get(ConfigService);

  // Авторизация статики `/uploads/*` — ДО useStaticAssets, чтобы проверка токена
  // (cookie `crm_at` / Bearer / ?token=) отрабатывала раньше отдачи файла
  // (аудит #2). Логотипы (`/uploads/logos/*`) остаются публичными.
  //
  // За флагом `UPLOADS_AUTH` (по умолчанию ВЫКЛ): защита читает токен из cookie
  // `crm_at`, которую браузер шлёт на `<img>`/PDF. Пока cookie-слой не задеплоен,
  // включение сломало бы отдачу файлов (браузер не может прислать токен на `<img>`
  // без cookie). Включать `UPLOADS_AUTH=true` только ПОСЛЕ выката cookie-миграции.
  if (process.env.UPLOADS_AUTH === 'true') {
    app.use('/uploads', createUploadsAuthMiddleware(configService));
    logger.log('Uploads auth enabled (/uploads/* requires a valid token)');
  }

  // Serve uploaded chat files statically at /uploads/*
  // Файлы загружаются с уникальными именами (timestamp/uuid) и не меняются —
  // отдаём с длинным кэшем, чтобы браузер не перекачивал картинки/аватары при
  // каждом заходе в чат (раньше без заголовков каждый рендер бил по серверу).
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    maxAge: '30d',
    immutable: true,
  });
  const port = configService.get<number>('port') || 3000;
  const corsOrigin = configService.get<string>('cors.origin');

  // Enable CORS
  const origins = corsOrigin?.includes(',')
    ? corsOrigin.split(',').map((o: string) => o.trim())
    : corsOrigin;
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Account-Id'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger: только в non-production окружениях
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Construction CRM API')
      .setDescription('API Gateway for Construction CRM System')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Health', 'Service health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(
      `Swagger documentation available at http://localhost:${port}/api/docs`,
    );
  }

  await app.listen(port);
  logger.log(`API Gateway is running on port ${port}`);
}

bootstrap();
