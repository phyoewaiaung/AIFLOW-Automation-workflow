import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private async checkAccess(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });
    if (!membership) throw new ForbiddenException('Access denied');
  }

  async findAll(organizationId: string, userId: string) {
    await this.checkAccess(organizationId, userId);
    return this.prisma.notification.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: { title: string; message: string; type?: NotificationType; link?: string }
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        organizationId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        link: data.link,
      },
    });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(organizationId: string, userId: string) {
    await this.checkAccess(organizationId, userId);
    await this.prisma.notification.updateMany({
      where: { organizationId, userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
