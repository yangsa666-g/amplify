import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private analysisService: AnalysisService) {}

  @Post('run')
  run(
    @CurrentUser() user: AuthUser,
    @Body() body: { documentId: string; model: string; fieldTemplateId?: string; promptTemplateId?: string },
  ) {
    return this.analysisService.run(user.userId, body.documentId, body.model, body.fieldTemplateId, body.promptTemplateId);
  }

  @Get('recent')
  findRecent(@CurrentUser() user: AuthUser) {
    return this.analysisService.findRecent(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.findOne(id, user.userId);
  }

  @Post(':id/feedback')
  submitFeedback(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.analysisService.submitFeedback(id, user.userId, body.rating, body.comment);
  }

  @Get(':id/feedback')
  getFeedback(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.getFeedback(id, user.userId);
  }
}
