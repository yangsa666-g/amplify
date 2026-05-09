import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private analysisService: AnalysisService) {}

  @Post('run')
  run(@Request() req: any, @Body() body: { documentId: string; model: string }) {
    return this.analysisService.run(req.user.userId, body.documentId, body.model);
  }

  @Get('recent')
  findRecent(@Request() req: any) {
    return this.analysisService.findRecent(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.analysisService.findOne(id, req.user.userId);
  }
}
