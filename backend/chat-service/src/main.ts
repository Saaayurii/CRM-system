import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3011;

  // Redis WebSocket adapter
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Chat Service API')
    .setDescription('Real-time Chat API with WebSocket for Construction CRM')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  // Cloudflare tunnel strips trailing slash before query string:
  // /socket.io/?EIO=4 → /socket.io?EIO=4
  // Engine.io path is '/socket.io/' so the check fails. Fix: prepend a raw HTTP listener
  // that restores the slash BEFORE engine.io's request handler runs.
  app.getHttpServer().prependListener('request', (req: any) => {
    if (req.url?.startsWith('/socket.io?')) {
      req.url = req.url.replace('/socket.io?', '/socket.io/?');
    }
  });

  logger.log(`Chat Service is running on port ${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
  logger.log(`WebSocket: ws://localhost:${port}/chat`);
}

bootstrap();
