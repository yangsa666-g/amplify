import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModelsService } from './models.service';
import { UpdateModelCatalogDto } from './dto/model-catalog.dto';

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

  @Patch(':modelName')
  updateModel(@Param('modelName') modelName: string, @Body() body: UpdateModelCatalogDto) {
    return this.modelsService.updateAdminModel(decodeURIComponent(modelName), body);
  }
}
