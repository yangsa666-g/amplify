import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or disabled');
    }
    if (
      user.role !== 'super_admin' &&
      (!user.organization || user.organization.status !== 'active')
    ) {
      throw new ForbiddenException('Organization is disabled');
    }

    const requestedOrganizationId = this.singleHeaderValue(req.headers['x-organization-id']);
    let selectedOrganization = null;
    if (user.role === 'super_admin' && requestedOrganizationId) {
      selectedOrganization = await this.prisma.organization.findUnique({
        where: { id: requestedOrganizationId },
      });
      if (!selectedOrganization || selectedOrganization.status !== 'active') {
        throw new ForbiddenException('Selected organization is not available');
      }
    } else if (
      user.role !== 'super_admin' &&
      requestedOrganizationId &&
      requestedOrganizationId !== user.organizationId
    ) {
      throw new ForbiddenException('Cannot switch to another organization');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authProvider: user.authProvider,
      status: user.status,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      selectedOrganizationId: selectedOrganization?.id ?? user.organizationId,
      selectedOrganizationName: selectedOrganization?.name ?? user.organization?.name ?? null,
    };
  }

  private singleHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }
}
