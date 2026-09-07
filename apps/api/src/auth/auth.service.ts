import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticationSettingsService } from '../authentication-settings/authentication-settings.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private authenticationSettings: AuthenticationSettingsService,
  ) {}

  async validateUser(email: string, password: string) {
    if (!(await this.authenticationSettings.isLocalAuthEnabled())) {
      throw new ForbiddenException('Local authentication is disabled');
    }
    const user = await this.usersService.findByEmail(email);
    if (!user || user.authProvider !== 'local' || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'disabled') {
      throw new ForbiddenException('Account is disabled');
    }
    if (user.role !== 'super_admin') {
      const organization = (user as any).organization;
      if (!organization || organization.status === 'disabled') {
        throw new ForbiddenException('Organization is disabled');
      }
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    authProvider: string;
    organizationId?: string | null;
    organization?: { name: string } | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        authProvider: user.authProvider,
        organizationId: user.organizationId ?? null,
        organizationName: user.organization?.name ?? null,
      },
    };
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record || record.expiresAt < new Date()) {
      if (record) await this.prisma.refreshToken.delete({ where: { tokenHash } });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(record.userId);
    if (!user || user.status === 'disabled') {
      await this.prisma.refreshToken.delete({ where: { tokenHash } });
      throw new UnauthorizedException('User not found or disabled');
    }
    if (user.role !== 'super_admin') {
      const organization = (user as any).organization;
      if (!organization || organization.status === 'disabled') {
        await this.prisma.refreshToken.delete({ where: { tokenHash } });
        throw new UnauthorizedException('Organization is disabled');
      }
    }
    if (
      user.authProvider === 'local' &&
      !(await this.authenticationSettings.isLocalAuthEnabled())
    ) {
      await this.prisma.refreshToken.delete({ where: { tokenHash } });
      throw new UnauthorizedException('Local authentication is disabled');
    }

    // Token rotation: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { tokenHash } });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async revokeUserRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async revokeRefreshToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (!(await this.authenticationSettings.isLocalAuthEnabled())) {
      throw new BadRequestException('Local authentication is disabled');
    }
    const user = await this.usersService.findById(userId);
    if (!user || user.authProvider !== 'local' || !user.passwordHash) {
      throw new BadRequestException('Password change not supported for this account');
    }
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Old password is incorrect');
    if (newPassword.length < 8)
      throw new BadRequestException('New password must be at least 8 characters');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePasswordHash(userId, hash);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(raw);
    const expiresInDays = this.parseExpiryDays(
      this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    );
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const id = crypto.randomBytes(10).toString('hex');
    await this.prisma.refreshToken.create({ data: { id, userId, tokenHash, expiresAt } });
    return raw;
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private parseExpiryDays(value: string): number {
    const match = value.match(/^(\d+)d$/);
    return match ? parseInt(match[1], 10) : 7;
  }
}
