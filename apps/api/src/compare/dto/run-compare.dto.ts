import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { ReasoningEffort } from '../../models/model-registry';

export class RunCompareDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  documentIds!: string[];

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsString()
  promptTemplateId?: string;

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high', 'xhigh'])
  reasoningEffort?: ReasoningEffort;
}
