import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_DEFAULTS_ORGANIZATION_ID } from '../auth/access-context';
import type { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { AuthenticationSettingsService } from '../authentication-settings/authentication-settings.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private authenticationSettings: AuthenticationSettingsService,
  ) {}

  async findAll() {
    return this.prisma.organization.findMany({
      where: { id: { not: PLATFORM_DEFAULTS_ORGANIZATION_ID } },
      include: {
        _count: { select: { users: true, documents: true, analysisJobs: true, compareJobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    this.assertManageableOrganization(id);
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            authProvider: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  async create(input: CreateOrganizationDto) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Organization name is required');
    const firstAdmin = input.firstAdmin;
    if (!firstAdmin) throw new BadRequestException('First Admin is required');

    await this.assertNameAvailable(name);
    const authProvider = firstAdmin.authProvider;
    if (authProvider === 'local' && !firstAdmin.password) {
      throw new BadRequestException('Password is required for local Admin');
    }
    if (authProvider === 'local' && !(await this.authenticationSettings.isLocalAuthEnabled())) {
      throw new BadRequestException('Local authentication is disabled');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: firstAdmin.email } });
    if (existingUser) throw new ConflictException('A user with this email already exists');

    const passwordHash =
      authProvider === 'local' ? await bcrypt.hash(firstAdmin.password as string, 10) : null;
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name } });
      const admin = await tx.user.create({
        data: {
          name: firstAdmin.name,
          email: firstAdmin.email,
          passwordHash,
          authProvider,
          role: 'admin',
          status: 'active',
          organizationId: organization.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          authProvider: true,
          createdAt: true,
        },
      });
      return { ...organization, firstAdmin: admin };
    });
  }

  async update(id: string, input: UpdateOrganizationDto) {
    this.assertManageableOrganization(id);
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException('Organization not found');
    if (input.name && input.name.trim() !== organization.name) {
      await this.assertNameAvailable(input.name.trim(), id);
    }
    return this.prisma.organization.update({
      where: { id },
      data: { ...(input.name ? { name: input.name.trim() } : {}) },
    });
  }

  async updateStatus(id: string, status: 'active' | 'disabled') {
    this.assertManageableOrganization(id);
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException('Organization not found');
    return this.prisma.organization.update({ where: { id }, data: { status } });
  }

  private async assertNameAvailable(name: string, excludingId?: string) {
    const existing = await this.prisma.organization.findFirst({
      where: {
        id: excludingId ? { not: excludingId } : undefined,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) throw new ConflictException('Organization name already exists');
  }

  private assertManageableOrganization(id: string) {
    if (id === PLATFORM_DEFAULTS_ORGANIZATION_ID) {
      throw new NotFoundException('Organization not found');
    }
  }
}
