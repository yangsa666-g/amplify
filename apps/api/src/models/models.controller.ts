import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
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
  getModels(@CurrentUser() user: AuthUser) {
    return this.modelsService.getModels(user.selectedOrganizationId ?? user.organizationId);
  }
}

@Controller('admin/models')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminModelsController {
  constructor(private modelsService: ModelsService) {}

  @Get()
  getAdminModels(@CurrentUser() user: AuthUser) {
    return this.modelsService.getAdminModels(user.selectedOrganizationId ?? user.organizationId);
  }

  @Get('configuration-status')
  getConfigurationStatus() {
    return this.modelsService.getConfigurationStatus();
  }

  @Post()
  createModel(@CurrentUser() user: AuthUser, @Body() body: CreateOpenAICompatibleModelDto) {
    return this.modelsService.createAdminModel(
      body,
      user.selectedOrganizationId ?? user.organizationId,
    );
  }

  @Post('test-connection')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  testConnection(@CurrentUser() user: AuthUser, @Body() body: TestOpenAICompatibleModelDto) {
    return this.modelsService.testConnection(
      body,
      user.selectedOrganizationId ?? user.organizationId,
    );
  }

  @Patch('order')
  reorderModels(@CurrentUser() user: AuthUser, @Body() body: ReorderModelCatalogDto) {
    return this.modelsService.reorderAdminModels(
      body,
      user.selectedOrganizationId ?? user.organizationId,
    );
  }

  @Patch(':modelName')
  updateModel(
    @Param('modelName') modelName: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateModelCatalogDto,
  ) {
    return this.modelsService.updateAdminModel(
      decodeURIComponent(modelName),
      body,
      user.selectedOrganizationId ?? user.organizationId,
    );
  }

  @Delete(':modelName')
  deleteModel(@Param('modelName') modelName: string, @CurrentUser() user: AuthUser) {
    return this.modelsService.deleteAdminModel(
      decodeURIComponent(modelName),
      user.selectedOrganizationId ?? user.organizationId,
    );
  }
}
