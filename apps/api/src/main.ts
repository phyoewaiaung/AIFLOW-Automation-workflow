import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from '@autoflow/configs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: config.web.url,
      credentials: true,
    },
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AutoFlow AI API')
    .setDescription('AI Autonomous Business Automation Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(config.server.port, config.server.host);
  console.log(`🚀 API running on http://${config.server.host}:${config.server.port}`);
}

bootstrap();