import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // hard cap 50 MB; service enforces configured limit
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.documentsService.upload(user, file);
  }

  @Get(':id/text')
  async getText(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const text = await this.documentsService.getExtractedText(id, user);
    return { text };
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: any) {
    await this.documentsService.downloadToResponse(id, user, res);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.findOne(id, user);
  }
}
