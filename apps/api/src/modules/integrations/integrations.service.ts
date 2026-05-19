import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  private async checkAccess(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return membership;
  }

  async findAll(organizationId: string, userId: string) {
    await this.checkAccess(organizationId, userId);

    return this.prisma.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    await this.checkAccess(integration.organizationId, userId);

    return integration;
  }

  async create(organizationId: string, userId: string, data: {
    name: string;
    type: string;
    config: Record<string, unknown>;
  }) {
    await this.checkAccess(organizationId, userId);

    return this.prisma.integration.create({
      data: {
        name: data.name,
        type: data.type as any,
        config: data.config as any,
        organizationId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      name?: string;
      config?: Record<string, unknown>;
      active?: boolean;
    }
  ) {
    const integration = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: integration.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.integration.update({
      where: { id },
      data: data as any,
    });
  }

  async delete(id: string, userId: string) {
    const integration = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: integration.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.integration.delete({ where: { id } });
    return { success: true };
  }

  async testConnection(id: string, userId: string) {
    const integration = await this.findById(id, userId);

    return {
      success: true,
      message: `Connection test for ${integration.type} not implemented yet`,
    };
  }
}