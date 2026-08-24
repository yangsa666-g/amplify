import { Module } from '@nestjs/common';
import { ModelsModule } from '../models/models.module';
import { AiService } from './ai.service';
import { AzureOpenAIService } from './azure-openai.service';
import { AnthropicService } from './anthropic.service';

@Module({
  imports: [ModelsModule],
  providers: [AiService, AzureOpenAIService, AnthropicService],
  exports: [AiService],
})
export class AiModule {}
