import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RunCompareDto {
  @IsString()
  @IsNotEmpty()
  oldDocumentId!: string;

  @IsString()
  @IsNotEmpty()
  newDocumentId!: string;

  @IsOptional()
  @IsIn(['unified', 'side_by_side'])
  diffMode?: 'unified' | 'side_by_side';
}
