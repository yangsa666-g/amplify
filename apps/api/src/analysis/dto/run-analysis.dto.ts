import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import type { ReasoningEffort } from '../azure-openai.service';

export class RunAnalysisDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsString()
  fieldTemplateId?: string;

  @IsOptional()
  @IsString()
  promptTemplateId?: string;

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high', 'xhigh'])
  reasoningEffort?: ReasoningEffort;
}
