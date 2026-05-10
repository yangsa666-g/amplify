import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CompareService } from './compare.service';

@Controller('compare')
@UseGuards(JwtAuthGuard)
export class CompareController {
  constructor(private compareService: CompareService) {}

  @Post('run')
  run(
    @CurrentUser() user: AuthUser,
    @Body() body: { oldDocumentId: string; newDocumentId: string; diffMode?: 'unified' | 'side_by_side' },
  ) {
    return this.compareService.run(user.userId, body.oldDocumentId, body.newDocumentId, body.diffMode);
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
