import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

// Flatten class-validator errors (incl. nested) to the first human-readable
// message so responses keep a single-string `message` — which is what the web
// client's error handlers expect (`e.response?.data?.message`).
function firstValidationMessage(errors: ValidationError[]): string {
  for (const err of errors) {
    if (err.constraints) {
      const msgs = Object.values(err.constraints);
      if (msgs.length) return msgs[0];
    }
    if (err.children?.length) {
      const nested = firstValidationMessage(err.children);
      if (nested) return nested;
    }
  }
  return 'Validation failed';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Trust the first proxy hop (nginx, per Dockerfile.azure) so rate limiting and
  // logging see the real client IP from X-Forwarded-For rather than the proxy's.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // Secret enables signed cookies (used by the Entra SSO transaction cookie).
  // JWT_SECRET is guaranteed present by env validation (see config/env.validation.ts).
  app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(firstValidationMessage(errors)),
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Amplify External API')
    .setDescription(
      `External API for document analysis and comparison.\n\n` +
        `**Authentication:** All endpoints require an \`X-API-Key\` header.\n` +
        `Obtain an API key from the Admin panel → System Settings → API Keys.\n\n` +
        `**Typical workflow:**\n` +
        `1. Upload one or more documents (\`POST /v1/documents/upload\`)\n` +
        `2. Run analysis (\`POST /v1/analysis/run\`) or compare 2–5 ordered documents with AI (\`POST /v1/compare/run\`)\n` +
        `3. Retrieve results (\`GET /v1/analysis/{id}\` or \`GET /v1/compare/{id}\`)`,
    )
    .setVersion('1.0')
    .addTag('External API')
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'X-API-Key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}
bootstrap();
