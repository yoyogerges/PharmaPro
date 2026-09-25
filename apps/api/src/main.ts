import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { AbstractHttpAdapter } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule, validationPipeOptions } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ENV } from './env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: ENV.corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  app.useGlobalFilters(new AllExceptionsFilter(app.getHttpAdapter() as AbstractHttpAdapter));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PharmaPro API')
    .setDescription('Pharmacy management system REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(ENV.port);
  // eslint-disable-next-line no-console
  console.log(`PharmaPro API running at http://localhost:${ENV.port}/api/v1`);
}

void bootstrap();