import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { config } from '@autoflow/configs';

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

const apiBase = config.web.apiUrl.replace(/\/+$/, '');

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

  private addWebhookUrl(workflow: any) {
    return {
      ...workflow,
      webhookUrl: `${apiBase}/api/workflows/webhook/${workflow.id}`,
    };
  }

  async findAll(organizationId: string, userId: string) {
    await this.checkAccess(organizationId, userId);

    const workflows = await this.prisma.workflow.findMany({
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

    return workflows.map((w) => this.addWebhookUrl(w));
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

    return this.addWebhookUrl(workflow);
  }

  async create(organizationId: string, userId: string, data: {
    name: string;
    description?: string;
    triggerConfig?: TriggerConfig;
  }) {
    await this.checkAccess(organizationId, userId);

    const created = await this.prisma.workflow.create({
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

    return this.addWebhookUrl(created);
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

    const updated = await this.prisma.workflow.update({
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

    return this.addWebhookUrl(updated);
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

    const activated = await this.prisma.workflow.update({
      where: { id },
      data: { active: true },
    });

    return this.addWebhookUrl(activated);
  }

  async deactivate(id: string, userId: string) {
    const workflow = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: workflow.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const deactivated = await this.prisma.workflow.update({
      where: { id },
      data: { active: false },
    });

    return this.addWebhookUrl(deactivated);
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

  private detectCycle(nodes: { id: string }[], edges: { sourceId: string; targetId: string }[]) {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adjacency.set(n.id, []);
    });

    edges.forEach((e) => {
      inDegree.set(e.targetId, (inDegree.get(e.targetId) || 0) + 1);
      adjacency.get(e.sourceId)?.push(e.targetId);
    });

    const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
    let sortedCount = 0;

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sortedCount++;

      for (const neighbor of adjacency.get(nodeId) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sortedCount !== nodes.length) {
      const cyclicNodes = nodes.filter((n) => (inDegree.get(n.id) || 0) > 0).map((n) => n.id);
      const orphanEdges = edges.filter((e) => !nodes.some((n) => n.id === e.sourceId) || !nodes.some((n) => n.id === e.targetId));
      if (orphanEdges.length > 0) {
        throw new BadRequestException(
          `Workflow has ${orphanEdges.length} edge(s) referencing deleted nodes (e.g. ${orphanEdges[0].sourceId} -> ${orphanEdges[0].targetId}). Delete those edges and try again.`
        );
      }
      throw new BadRequestException(`Workflow contains a cycle involving nodes: ${cyclicNodes.join(', ')}`);
    }
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

    this.detectCycle(data.nodes, data.edges);

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