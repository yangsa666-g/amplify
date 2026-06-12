import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AzureOpenAIService } from './azure-openai.service';
import { AnthropicService } from './anthropic.service';
import { FieldTemplatesModule } from '../field-templates/field-templates.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { DocumentsModule } from '../documents/documents.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [FieldTemplatesModule, PromptTemplatesModule, DocumentsModule, ModelsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, AzureOpenAIService, AnthropicService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
