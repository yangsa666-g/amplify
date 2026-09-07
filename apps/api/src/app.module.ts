import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ModelsModule } from './models/models.module';
import { DocumentsModule } from './documents/documents.module';
import { FieldTemplatesModule } from './field-templates/field-templates.module';
import { PromptTemplatesModule } from './prompt-templates/prompt-templates.module';
import { AnalysisModule } from './analysis/analysis.module';
import { CompareModule } from './compare/compare.module';
import { HistoryModule } from './history/history.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TemplateRequestsModule } from './template-requests/template-requests.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { AuditModule } from './audit/audit.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global baseline rate limit (per client IP). Sensitive endpoints tighten
    // this further with @Throttle (see auth/analysis/compare controllers).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ModelsModule,
    DocumentsModule,
    FieldTemplatesModule,
    PromptTemplatesModule,
    AnalysisModule,
    CompareModule,
    HistoryModule,
    AdminModule,
    NotificationsModule,
    TemplateRequestsModule,
    ExternalApiModule,
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
