import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const [totalWorkflows, activeWorkflows, executions, recentExecutions] =
      await Promise.all([
        this.prisma.workflow.count({ where: { organizationId } }),
        this.prisma.workflow.count({
          where: { organizationId, active: true },
        }),
        this.prisma.execution.count({ where: { organizationId } }),
        this.prisma.execution.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { workflow: true },
        }),
      ]);

    const successfulExecutions = await this.prisma.execution.count({
      where: { organizationId, status: 'SUCCESS' },
    });

    const successRate = executions > 0 ? (successfulExecutions / executions) * 100 : 0;

    return {
      totalWorkflows,
      activeWorkflows,
      totalExecutions: executions,
      successRate: Math.round(successRate * 10) / 10,
      avgExecutionTime: 0,
      recentExecutions,
      aiCreditsUsed: 0,
      aiCreditsLimit: 100000,
      estimatedAiCost: 0,
    };
  }

  async getExecutionStats(
    organizationId: string,
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const where: any = { organizationId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const executions = await this.prisma.execution.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const statusCounts = executions.reduce((acc: any, e: any) => {
      acc[e.status] = e._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      PENDING: statusCounts.PENDING || 0,
      RUNNING: statusCounts.RUNNING || 0,
      SUCCESS: statusCounts.SUCCESS || 0,
      FAILED: statusCounts.FAILED || 0,
      CANCELLED: statusCounts.CANCELLED || 0,
    };
  }

  async getWorkflowStats(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const workflows = await this.prisma.workflow.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    return workflows.map((w: any) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      executionCount: w._count.executions,
    }));
  }
}