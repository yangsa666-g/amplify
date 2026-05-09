import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
