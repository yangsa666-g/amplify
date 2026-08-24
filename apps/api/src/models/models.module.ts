import { Module } from '@nestjs/common';
import { AdminModelsController, ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { ModelCredentialsService } from './model-credentials.service';
import { OpenAICompatibleService } from './openai-compatible.service';

@Module({
  controllers: [ModelsController, AdminModelsController],
  providers: [ModelsService, ModelCredentialsService, OpenAICompatibleService],
  exports: [ModelsService, OpenAICompatibleService],
})
export class ModelsModule {}
