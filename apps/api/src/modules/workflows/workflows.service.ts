import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

interface WorkflowNodeData {
  type: string;
  label: string;
  [key: string]: unknown;
}

interface WorkflowEdgeData {
  [key: string]: unknown;
}

interface TriggerConfig {
  type: string;
  [key: string]: unknown;
}

@Injectable()
export class WorkflowsService {
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

    return this.prisma.workflow.findMany({
      where: { organizationId },
      include: {
        nodes: true,
        edges: true,
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
        organization: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.checkAccess(workflow.organizationId, userId);

    return workflow;
  }

  async create(organizationId: string, userId: string, data: {
    name: string;
    description?: string;
    triggerConfig?: TriggerConfig;
  }) {
    await this.checkAccess(organizationId, userId);

    return this.prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        triggerConfig: (data.triggerConfig || {}) as any,
        definition: {} as any,
        organizationId,
        createdById: userId,
      } as any,
      include: {
        nodes: true,
        edges: true,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      triggerConfig?: TriggerConfig;
      definition?: Record<string, unknown>;
    }
  ) {
    const workflow = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: workflow.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...data,
        triggerConfig: (data.triggerConfig || workflow.triggerConfig) as any,
        definition: (data.definition || {}) as any,
      } as any,
      include: {
        nodes: true,
        edges: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    const workflow = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: workflow.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.$transaction([
      this.prisma.executionLog.deleteMany({ where: { execution: { workflowId: id } } }),
      this.prisma.execution.deleteMany({ where: { workflowId: id } }),
      this.prisma.workflowNode.deleteMany({ where: { workflowId: id } }),
      this.prisma.workflowEdge.deleteMany({ where: { workflowId: id } }),
      this.prisma.workflow.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  async activate(id: string, userId: string) {
    const workflow = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: workflow.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.workflow.update({
      where: { id },
      data: { active: true },
    });
  }

  async deactivate(id: string, userId: string) {
    const workflow = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: workflow.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.workflow.update({
      where: { id },
      data: { active: false },
    });
  }

  async addNode(
    workflowId: string,
    userId: string,
    nodeData: {
      type: string;
      positionX: number;
      positionY: number;
      data: WorkflowNodeData;
    }
  ) {
    const workflow = await this.findById(workflowId, userId);

    return this.prisma.workflowNode.create({
      data: {
        workflowId,
        type: nodeData.type,
        positionX: nodeData.positionX,
        positionY: nodeData.positionY,
        data: nodeData.data as any,
      },
    });
  }

  async updateNode(
    workflowId: string,
    nodeId: string,
    userId: string,
    data: {
      positionX?: number;
      positionY?: number;
      data?: WorkflowNodeData;
    }
  ) {
    await this.findById(workflowId, userId);

    const node = await this.prisma.workflowNode.findFirst({
      where: { id: nodeId, workflowId },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return this.prisma.workflowNode.update({
      where: { id: nodeId },
      data: data as any,
    });
  }

  async deleteNode(workflowId: string, nodeId: string, userId: string) {
    await this.findById(workflowId, userId);

    await this.prisma.workflowNode.delete({ where: { id: nodeId } });
    await this.prisma.workflowEdge.deleteMany({
      where: {
        OR: [{ sourceId: nodeId }, { targetId: nodeId }],
      },
    });

    return { success: true };
  }

  async addEdge(
    workflowId: string,
    userId: string,
    edgeData: {
      sourceId: string;
      targetId: string;
      sourceHandle?: string;
      targetHandle?: string;
      data?: WorkflowEdgeData;
    }
  ) {
    await this.findById(workflowId, userId);

    const sourceNode = await this.prisma.workflowNode.findFirst({
      where: { id: edgeData.sourceId, workflowId },
    });
    const targetNode = await this.prisma.workflowNode.findFirst({
      where: { id: edgeData.targetId, workflowId },
    });

    if (!sourceNode || !targetNode) {
      throw new NotFoundException('Source or target node not found');
    }

    return this.prisma.workflowEdge.create({
      data: {
        workflowId,
        sourceId: edgeData.sourceId,
        targetId: edgeData.targetId,
        sourceHandle: edgeData.sourceHandle,
        targetHandle: edgeData.targetHandle,
        data: edgeData.data as any || {},
      },
    });
  }

  async deleteEdge(workflowId: string, edgeId: string, userId: string) {
    await this.findById(workflowId, userId);

    await this.prisma.workflowEdge.delete({ where: { id: edgeId } });
    return { success: true };
  }

  async saveNodesAndEdges(
    workflowId: string,
    userId: string,
    data: {
      nodes: Array<{
        id: string;
        type: string;
        positionX: number;
        positionY: number;
        data: WorkflowNodeData;
      }>;
      edges: Array<{
        id: string;
        sourceId: string;
        targetId: string;
        sourceHandle?: string;
        targetHandle?: string;
        data?: WorkflowEdgeData;
      }>;
    }
  ) {
    const workflow = await this.findById(workflowId, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowNode.deleteMany({ where: { workflowId } });
      await tx.workflowEdge.deleteMany({ where: { workflowId } });
      await tx.workflowNode.createMany({
        data: data.nodes.map((node) => ({
          id: node.id,
          workflowId,
          type: node.type,
          positionX: node.positionX,
          positionY: node.positionY,
          data: node.data as any,
        })),
      });
      await tx.workflowEdge.createMany({
        data: data.edges.map((edge) => ({
          id: edge.id,
          workflowId,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          data: (edge.data as any) || {},
        })),
      });
    });

    return this.findById(workflowId, userId);
  }
}