import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private async checkAccess(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });
    if (!membership) throw new ForbiddenException('Access denied');
    return membership;
  }

  async findAll(organizationId: string, userId: string) {
    await this.checkAccess(organizationId, userId);
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      select: { id: true, name: true, key: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, data: { name: string }) {
    await this.checkAccess(organizationId, userId);
    const rawKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    return this.prisma.apiKey.create({
      data: {
        name: data.name,
        key: rawKey,
        organizationId,
        userId,
      },
      select: { id: true, name: true, key: true, createdAt: true },
    });
  }

  async delete(id: string, userId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');
    await this.checkAccess(key.organizationId, userId);
    await this.prisma.apiKey.delete({ where: { id } });
    return { success: true };
  }
}
