import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/http/problem-details.filter';
import { LoggingInterceptor } from './shared/observability/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3000);
  const isProduction = config.get<string>('app.env') === 'production';

  // ---------------------------------------------------------------------------
  // Security & infrastructure
  // ---------------------------------------------------------------------------
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
  app.use(compression());

  app.enableCors({
    origin: config.get<string>('app.corsOrigin', '*').split(','),
    credentials: true,
    exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
  });

  app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ---------------------------------------------------------------------------
  // Validation, error handling, logging
  // ---------------------------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ---------------------------------------------------------------------------
  // Swagger (dev / non-prod only)
  // ---------------------------------------------------------------------------
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AqarFlow API')
      .setDescription('Real Estate CRM Platform — Public REST API')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'jwt',
      )
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'apiKey')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // ---------------------------------------------------------------------------
  app.enableShutdownHooks();

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🏠 AqarFlow API listening on http://localhost:${port}`);
  if (!isProduction) {
    // eslint-disable-next-line no-console
    console.log(`📘 Swagger docs:  http://localhost:${port}/docs`);
  }
}

void bootstrap();
