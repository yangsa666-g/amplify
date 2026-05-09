import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModelsService } from './models.service';

@Controller('models')
@UseGuards(JwtAuthGuard)
export class ModelsController {
  constructor(private modelsService: ModelsService) {}

  @Get()
  getModels() {
    return this.modelsService.getModels();
  }
}
