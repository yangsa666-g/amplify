import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class PromptTemplateBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  content!: string;
}
