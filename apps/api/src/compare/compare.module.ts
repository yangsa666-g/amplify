import { Module } from '@nestjs/common';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { ModelsModule } from '../models/models.module';
import { AiModule } from '../analysis/ai.module';

@Module({
  imports: [PromptTemplatesModule, ModelsModule, AiModule],
  controllers: [CompareController],
  providers: [CompareService],
  exports: [CompareService],
})
export class CompareModule {}
