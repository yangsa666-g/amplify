import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export class SubmitTemplateRequestDto {
  @IsIn(['field', 'prompt'])
  templateKind!: 'field' | 'prompt';

  @IsString()
  @IsNotEmpty()
  templateId!: string;
}

export class RejectTemplateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
