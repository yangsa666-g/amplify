import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AnalysisService } from './analysis.service';
import { RunAnalysisDto } from './dto/run-analysis.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Controller('analysis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private analysisService: AnalysisService) {}

  // Each run triggers paid LLM calls — cap how fast a single user can fire them.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('run')
  run(@CurrentUser() user: AuthUser, @Body() body: RunAnalysisDto) {
    return this.analysisService.run(
      user.userId,
      body.documentId,
      body.model,
      body.fieldTemplateId,
      body.promptTemplateId,
      body.reasoningEffort,
    );
  }

  @Get('recent')
  findRecent(@CurrentUser() user: AuthUser) {
    return this.analysisService.findRecent(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.findOne(id, user.userId, user.role);
  }

  @Post(':id/feedback')
  submitFeedback(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: SubmitFeedbackDto,
  ) {
    return this.analysisService.submitFeedback(id, user.userId, body.rating, body.comment);
  }

  @Get(':id/feedback')
  getFeedback(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.getFeedback(id, user.userId);
  }
}
