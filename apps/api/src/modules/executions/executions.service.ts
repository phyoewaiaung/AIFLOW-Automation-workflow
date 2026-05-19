import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Queue } from 'bullmq';
import { config } from '@autoflow/configs';

@Injectable()
export class ExecutionsService {
  private executionQueue: Queue;

  constructor(private prisma: PrismaService) {
    this.executionQueue = new Queue('workflow-execution', {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
    });
  }

  private async checkAccess(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return membership;
  }

  async findAll(organizationId: string, userId: string, filters: {
    workflowId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    await this.checkAccess(organizationId, userId);

    const where: any = { organizationId };

    if (filters.workflowId) {
      where.workflowId = filters.workflowId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [executions, total] = await Promise.all([
      this.prisma.execution.findMany({
        where,
        include: {
          workflow: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 20,
        skip: filters.offset || 0,
      }),
      this.prisma.execution.count({ where }),
    ]);

    return {
      data: executions,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
      limit: filters.limit || 20,
      hasMore: (filters.offset || 0) + executions.length < total,
    };
  }

  async findById(id: string, userId: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        workflow: {
          include: {
            nodes: true,
            edges: true,
          },
        },
        logs: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    await this.checkAccess(execution.organizationId, userId);

    return execution;
  }

  async findLogs(executionId: string, userId: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    await this.checkAccess(execution.organizationId, userId);

    return this.prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async startExecution(workflowId: string, userId: string, triggerData: any) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.checkAccess(workflow.organizationId, userId);

    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        organizationId: workflow.organizationId,
        triggerData,
        status: 'PENDING',
        createdById: userId,
      },
    });

    await this.executionQueue.add('execute-workflow', {
      executionId: execution.id,
      workflowId: execution.workflowId,
    });

    return execution;
  }

  async cancel(id: string, userId: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    await this.checkAccess(execution.organizationId, userId);

    if (execution.status !== 'PENDING' && execution.status !== 'RUNNING') {
      throw new ForbiddenException('Cannot cancel execution in current status');
    }

    return this.prisma.execution.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  async retry(id: string, userId: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    await this.checkAccess(execution.organizationId, userId);

    const newExecution = await this.prisma.execution.create({
      data: {
        workflowId: execution.workflowId,
        organizationId: execution.organizationId,
        triggerData: execution.triggerData,
        status: 'PENDING',
        createdById: userId,
      },
    });

    await this.executionQueue.add('execute-workflow', {
      executionId: newExecution.id,
      workflowId: newExecution.workflowId,
    });

    return newExecution;
  }

  async updateStatus(id: string, status: string, error?: string) {
    return this.prisma.execution.update({
      where: { id },
      data: {
        status: status as any,
        ...(error && { error }),
        ...((status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED') && {
          completedAt: new Date(),
        }),
      },
    });
  }

  async addLog(executionId: string, data: {
    nodeId?: string;
    level: string;
    message: string;
    data?: any;
  }) {
    return this.prisma.executionLog.create({
      data: {
        executionId,
        nodeId: data.nodeId,
        level: data.level as any,
        message: data.message,
        data: data.data || {},
      },
    });
  }
}