import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CompareService } from './compare.service';
import { RunCompareDto } from './dto/run-compare.dto';

@Controller('compare')
@UseGuards(JwtAuthGuard)
export class CompareController {
  constructor(private compareService: CompareService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('run')
  run(@CurrentUser() user: AuthUser, @Body() body: RunCompareDto) {
    return this.compareService.run(
      user.userId,
      body.oldDocumentId,
      body.newDocumentId,
      body.diffMode,
    );
  }

  @Get('recent')
  findRecent(@CurrentUser() user: AuthUser) {
    return this.compareService.findRecent(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.compareService.findOne(id, user.userId);
  }
}
