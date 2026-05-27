import { IsIn, IsOptional } from 'class-validator';
import type { ExpiryOption } from '../api-key.service';

export class CreateApiKeyDto {
  @IsOptional()
  @IsIn(['1m', '3m', '6m', '1y', 'never'])
  expiry?: ExpiryOption;
}
