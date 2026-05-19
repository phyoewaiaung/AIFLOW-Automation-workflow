import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { slugify, randomString } from '@autoflow/utils';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
    });
    return memberships.map((m) => m.organization);
  }

  async findById(id: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: id, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: true },
        },
        _count: {
          select: {
            workflows: true,
            executions: true,
            integrations: true,
          },
        },
      },
    });

    return organization;
  }

  async create(userId: string, data: { name: string }) {
    const slug = slugify(data.name) + '-' + randomString(6);

    const org = await this.prisma.organization.create({
      data: {
        name: data.name,
        slug,
      },
    });

    await this.prisma.membership.create({
      data: {
        userId,
        organizationId: org.id,
        role: 'OWNER',
      },
    });

    return org;
  }

  async update(id: string, userId: string, data: { name?: string; logo?: string }) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: id, userId },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async getMembers(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: true },
    });
  }
}