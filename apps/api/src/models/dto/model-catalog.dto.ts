import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import type { ReasoningEffort } from '../model-registry';

export class UpdateModelCatalogDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high', 'xhigh'])
  defaultReasoningEffort?: ReasoningEffort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  endpoint?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  upstreamModelName?: string;

  @IsOptional()
  @IsIn(['chat_completions', 'responses'])
  apiProtocol?: 'chat_completions' | 'responses';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  supportsReasoning?: boolean;
}

export class CreateOpenAICompatibleModelDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  endpoint!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  upstreamModelName!: string;

  @IsOptional()
  @IsIn(['chat_completions', 'responses'])
  apiProtocol: 'chat_completions' | 'responses' = 'chat_completions';

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  apiKey!: string;

  @IsOptional()
  @IsBoolean()
  supportsReasoning = false;

  @IsOptional()
  @IsBoolean()
  enabled = true;
}

export class TestOpenAICompatibleModelDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/)
  name?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  endpoint?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  upstreamModelName?: string;

  @IsOptional()
  @IsIn(['chat_completions', 'responses'])
  apiProtocol?: 'chat_completions' | 'responses';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  supportsReasoning?: boolean;
}

export class ModelOrderItemDto {
  @IsString()
  modelName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder!: number;
}

export class ReorderModelCatalogDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModelOrderItemDto)
  models!: ModelOrderItemDto[];
}
