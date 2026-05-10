import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../../admin/api-keys/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers['x-api-key'];
    if (!rawKey) throw new UnauthorizedException('Missing X-API-Key header');
    const user = await this.apiKeyService.validateKey(rawKey);
    if (!user) throw new UnauthorizedException('Invalid or expired API key');
    request.user = user;
    return true;
  }
}
