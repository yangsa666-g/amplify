import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AiModule } from './ai.module';
import { FieldTemplatesModule } from '../field-templates/field-templates.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { DocumentsModule } from '../documents/documents.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [FieldTemplatesModule, PromptTemplatesModule, DocumentsModule, ModelsModule, AiModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
