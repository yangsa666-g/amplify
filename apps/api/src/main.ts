import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Amplify External API')
    .setDescription(
      `External API for contract analysis and comparison.\n\n` +
      `**Authentication:** All endpoints require an \`X-API-Key\` header.\n` +
      `Obtain an API key from the Admin panel → System Settings → API Keys.\n\n` +
      `**Typical workflow:**\n` +
      `1. Upload a contract document (\`POST /v1/documents/upload\`)\n` +
      `2. Run analysis (\`POST /v1/analysis/run\`) or compare two documents (\`POST /v1/compare/run\`)\n` +
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
