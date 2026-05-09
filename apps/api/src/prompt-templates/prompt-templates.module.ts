import { Module } from '@nestjs/common';
import { PromptTemplatesController, AdminPromptTemplatesController } from './prompt-templates.controller';
import { PromptTemplatesService } from './prompt-templates.service';

@Module({
  controllers: [PromptTemplatesController, AdminPromptTemplatesController],
  providers: [PromptTemplatesService],
  exports: [PromptTemplatesService],
})
export class PromptTemplatesModule {}
