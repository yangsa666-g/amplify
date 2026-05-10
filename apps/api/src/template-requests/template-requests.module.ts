import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TemplateRequestsController } from './template-requests.controller';
import { TemplateRequestsService } from './template-requests.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TemplateRequestsController],
  providers: [TemplateRequestsService],
})
export class TemplateRequestsModule {}
