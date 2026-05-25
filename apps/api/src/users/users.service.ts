import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdPublic(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, status: true, authProvider: true, createdAt: true },
    });
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, status: true, authProvider: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(name: string, email: string, password: string, role: 'admin' | 'user' = 'user') {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { name, email, passwordHash, role, authProvider: 'local', status: 'active' },
      select: { id: true, email: true, name: true, role: true, status: true, authProvider: true, createdAt: true },
    });
  }

  async findByEntraOid(entraOid: string) {
    return this.prisma.user.findUnique({ where: { entraOid } });
  }

  // Creates an SSO user provisioned just-in-time from Entra claims (no password).
  async createEntraUser(data: { entraOid: string; email: string; name: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        entraOid: data.entraOid,
        authProvider: 'entra',
        passwordHash: null,
        role: 'user',
        status: 'active',
      },
    });
  }

  // Links an Entra identity onto an existing (local) account and switches it to SSO.
  async linkEntraOid(id: string, entraOid: string) {
    return this.prisma.user.update({
      where: { id },
      data: { entraOid, authProvider: 'entra' },
    });
  }

  // Keeps the display name in sync with Entra on each login. Email is intentionally
  // left untouched: it is @unique and changing it could collide with another row.
  async syncEntraProfile(id: string, name: string) {
    return this.prisma.user.update({ where: { id }, data: { name } });
  }

  async updateUser(id: string, data: { name?: string; email?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictException('Email already in use');
    }
    return this.prisma.user.update({
      where: { id },
      data: { ...(data.name ? { name: data.name } : {}), ...(data.email ? { email: data.email } : {}) },
      select: { id: true, email: true, name: true, role: true, status: true, authProvider: true, createdAt: true },
    });
  }

  async updateStatus(id: string, status: 'active' | 'disabled') {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async updateRole(id: string, role: 'admin' | 'user') {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
