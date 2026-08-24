import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { ApiKeyService } from '../admin/api-keys/api-key.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { DocumentsModule } from '../documents/documents.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { CompareModule } from '../compare/compare.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';

@Module({
  imports: [
    PrismaModule,
    DocumentsModule,
    AnalysisModule,
    CompareModule,
    ModelsModule,
    PromptTemplatesModule,
  ],
  controllers: [ExternalApiController],
  providers: [ApiKeyService, ApiKeyGuard],
})
export class ExternalApiModule {}
