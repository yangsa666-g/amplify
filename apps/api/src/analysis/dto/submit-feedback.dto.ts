import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitFeedbackDto {
  // 1 = thumbs up, -1 = thumbs down
  @IsIn([1, -1])
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
