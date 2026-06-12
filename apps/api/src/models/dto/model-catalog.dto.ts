import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
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
