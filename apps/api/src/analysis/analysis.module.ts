import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AiFoundryService } from './ai-foundry.service';
import { FieldTemplatesModule } from '../field-templates/field-templates.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [FieldTemplatesModule, PromptTemplatesModule, DocumentsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, AiFoundryService],
})
export class AnalysisModule {}
