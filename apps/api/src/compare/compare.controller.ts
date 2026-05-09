import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompareService } from './compare.service';

@Controller('compare')
@UseGuards(JwtAuthGuard)
export class CompareController {
  constructor(private compareService: CompareService) {}

  @Post('run')
  run(
    @Request() req: any,
    @Body() body: { oldDocumentId: string; newDocumentId: string; diffMode?: 'unified' | 'side_by_side' },
  ) {
    return this.compareService.run(req.user.userId, body.oldDocumentId, body.newDocumentId, body.diffMode);
  }

  @Get('recent')
  findRecent(@Request() req: any) {
    return this.compareService.findRecent(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.compareService.findOne(id, req.user.userId);
  }
}
