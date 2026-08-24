import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModelsService } from './models.service';
import {
  CreateOpenAICompatibleModelDto,
  ReorderModelCatalogDto,
  TestOpenAICompatibleModelDto,
  UpdateModelCatalogDto,
} from './dto/model-catalog.dto';

@Controller('models')
@UseGuards(JwtAuthGuard)
export class ModelsController {
  constructor(private modelsService: ModelsService) {}

  @Get()
  getModels() {
    return this.modelsService.getModels();
  }
}

@Controller('admin/models')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminModelsController {
  constructor(private modelsService: ModelsService) {}

  @Get()
  getAdminModels() {
    return this.modelsService.getAdminModels();
  }

  @Get('configuration-status')
  getConfigurationStatus() {
    return this.modelsService.getConfigurationStatus();
  }

  @Post()
  createModel(@Body() body: CreateOpenAICompatibleModelDto) {
    return this.modelsService.createAdminModel(body);
  }

  @Post('test-connection')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  testConnection(@Body() body: TestOpenAICompatibleModelDto) {
    return this.modelsService.testConnection(body);
  }

  @Patch('order')
  reorderModels(@Body() body: ReorderModelCatalogDto) {
    return this.modelsService.reorderAdminModels(body);
  }

  @Patch(':modelName')
  updateModel(@Param('modelName') modelName: string, @Body() body: UpdateModelCatalogDto) {
    return this.modelsService.updateAdminModel(decodeURIComponent(modelName), body);
  }

  @Delete(':modelName')
  deleteModel(@Param('modelName') modelName: string) {
    return this.modelsService.deleteAdminModel(decodeURIComponent(modelName));
  }
}
