import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PLATFORM_AUTHENTICATION_SETTING_ID = 'platform';

export interface AuthenticationConfiguration {
  localAuthEnabled: boolean;
}

@Injectable()
export class AuthenticationSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfiguration(): Promise<AuthenticationConfiguration> {
    const setting = await this.prisma.authenticationSetting.findUnique({
      where: { id: PLATFORM_AUTHENTICATION_SETTING_ID },
      select: { localAuthEnabled: true },
    });

    return { localAuthEnabled: setting?.localAuthEnabled ?? true };
  }

  async isLocalAuthEnabled(): Promise<boolean> {
    return (await this.getConfiguration()).localAuthEnabled;
  }

  async updateConfiguration(localAuthEnabled: boolean): Promise<AuthenticationConfiguration> {
    return this.prisma.$transaction(async (tx) => {
      const setting = await tx.authenticationSetting.upsert({
        where: { id: PLATFORM_AUTHENTICATION_SETTING_ID },
        create: {
          id: PLATFORM_AUTHENTICATION_SETTING_ID,
          localAuthEnabled,
        },
        update: { localAuthEnabled },
        select: { localAuthEnabled: true },
      });

      if (!localAuthEnabled) {
        await tx.refreshToken.deleteMany({
          where: { user: { authProvider: 'local' } },
        });
      }

      return setting;
    });
  }
}
