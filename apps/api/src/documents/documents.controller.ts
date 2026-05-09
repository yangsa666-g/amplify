import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { getUploadDir } from '../common/storage';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, getUploadDir()),
        filename: (_req, file, cb) => {
          const unique = crypto.randomBytes(8).toString('hex');
          cb(null, `${unique}${path.extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // hard cap 50MB; service enforces configured limit
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.documentsService.upload(req.user.userId, file);
  }

  @Get(':id/text')
  async getText(@Param('id') id: string, @Request() req: any) {
    const text = await this.documentsService.getExtractedText(id, req.user.userId);
    return { text };
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Request() req: any, @Res() res: any) {
    const doc = await this.documentsService.findOne(id, req.user.userId);
    res.download((doc as any).storagePath, doc.fileName);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.findOne(id, req.user.userId);
  }
}
