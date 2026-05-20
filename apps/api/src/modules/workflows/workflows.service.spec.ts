import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { PrismaService } from '../../prisma.service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let prisma: any;

  const mockPrisma = {
    membership: { findFirst: jest.fn() },
    workflow: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    workflowNode: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    workflowEdge: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  const mockWorkflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    active: false,
    organizationId: 'org-1',
    createdById: 'user-1',
    nodes: [],
    edges: [],
  };

  const mockMembership = { id: 'mem-1', userId: 'user-1', organizationId: 'org-1', role: 'OWNER' };

  describe('create', () => {
    it('should create a workflow', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.workflow.create.mockResolvedValue(mockWorkflow);

      const result = await service.create('org-1', 'user-1', { name: 'Test Workflow', description: 'A test workflow' });

      expect(result.name).toBe('Test Workflow');
      expect(mockPrisma.workflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Test Workflow', organizationId: 'org-1' }),
        })
      );
    });

    it('should throw ForbiddenException for non-member', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      await expect(service.findById('wf-1', 'unauthorized-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('should return a workflow for authorized user', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.membership.findFirst.mockResolvedValue(mockMembership);

      const result = await service.findById('wf-1', 'user-1');

      expect(result.id).toBe('wf-1');
      expect(result.name).toBe('Test Workflow');
    });

    it('should throw NotFoundException for missing workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.findById('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate / deactivate', () => {
    it('should activate a workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.membership.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.workflow.update.mockResolvedValue({ ...mockWorkflow, active: true });

      const result = await service.activate('wf-1', 'user-1');
      expect(result.active).toBe(true);
    });

    it('should deactivate a workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({ ...mockWorkflow, active: true });
      mockPrisma.membership.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.workflow.update.mockResolvedValue({ ...mockWorkflow, active: false });

      const result = await service.deactivate('wf-1', 'user-1');
      expect(result.active).toBe(false);
    });

    it('should throw ForbiddenException for member role', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.membership.findFirst.mockResolvedValue({ ...mockMembership, role: 'MEMBER' });

      await expect(service.activate('wf-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('saveNodesAndEdges', () => {
    it('should save nodes and edges in a transaction', async () => {
      const nodes = [{ id: 'n1', type: 'trigger-webhook', positionX: 0, positionY: 0, data: { type: 'trigger-webhook', label: 'Webhook' } }];
      const edges = [{ id: 'e1', sourceId: 'n1', targetId: 'n2' }];

      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.membership.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      mockPrisma.workflow.findUnique.mockResolvedValue({ ...mockWorkflow, nodes, edges });

      await service.saveNodesAndEdges('wf-1', 'user-1', { nodes, edges });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.workflowNode.deleteMany).toHaveBeenCalledWith({ where: { workflowId: 'wf-1' } });
      expect(mockPrisma.workflowEdge.deleteMany).toHaveBeenCalledWith({ where: { workflowId: 'wf-1' } });
    });
  });
});
