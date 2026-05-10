import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AzureOpenAIService } from './azure-openai.service';
import { FieldTemplatesModule } from '../field-templates/field-templates.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [FieldTemplatesModule, PromptTemplatesModule, DocumentsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, AzureOpenAIService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
