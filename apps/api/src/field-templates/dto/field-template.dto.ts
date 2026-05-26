import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsArray, ValidateNested, MaxLength } from 'class-validator';

export class FieldTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fieldName!: string;

  @IsString()
  @MaxLength(2000)
  fieldDescription!: string;

  @IsInt()
  sortOrder!: number;
}

export class FieldTemplateBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldTemplateItemDto)
  items!: FieldTemplateItemDto[];
}
