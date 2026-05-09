import { Module } from '@nestjs/common';
import { FieldTemplatesController, AdminFieldTemplatesController } from './field-templates.controller';
import { FieldTemplatesService } from './field-templates.service';

@Module({
  controllers: [FieldTemplatesController, AdminFieldTemplatesController],
  providers: [FieldTemplatesService],
  exports: [FieldTemplatesService],
})
export class FieldTemplatesModule {}
