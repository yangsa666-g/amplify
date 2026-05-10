import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { ApiKeyController } from './api-keys/api-key.controller';
import { ApiKeyService } from './api-keys/api-key.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminDashboardController, ApiKeyController],
  providers: [AdminDashboardService, ApiKeyService],
  exports: [ApiKeyService],
})
export class AdminModule {}
