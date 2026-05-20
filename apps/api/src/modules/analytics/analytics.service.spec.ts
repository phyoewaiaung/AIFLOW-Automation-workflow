import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  const mockPrisma = {
    membership: {
      findFirst: jest.fn(),
    },
    workflow: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    execution: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return overview stats', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({ id: 'mem-1', role: 'ADMIN' });
      mockPrisma.workflow.count.mockResolvedValueOnce(10);
      mockPrisma.workflow.count.mockResolvedValueOnce(5);
      mockPrisma.execution.count.mockResolvedValueOnce(100);
      mockPrisma.execution.findMany.mockResolvedValue([]);
      mockPrisma.execution.count.mockResolvedValueOnce(75);

      const result = await service.getOverview('org-1', 'user-1');

      expect(result.totalWorkflows).toBe(10);
      expect(result.activeWorkflows).toBe(5);
      expect(result.totalExecutions).toBe(100);
      expect(result.successRate).toBe(75);
    });

    it('should return 0% success rate when no executions exist', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.workflow.count.mockResolvedValue(0);
      mockPrisma.workflow.count.mockResolvedValue(0);
      mockPrisma.execution.count.mockResolvedValue(0);
      mockPrisma.execution.findMany.mockResolvedValue([]);
      mockPrisma.execution.count.mockResolvedValue(0);

      const result = await service.getOverview('org-1', 'user-1');

      expect(result.successRate).toBe(0);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      await expect(service.getOverview('org-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getExecutionStats', () => {
    it('should return grouped execution counts', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.execution.groupBy.mockResolvedValue([
        { status: 'SUCCESS', _count: 50 },
        { status: 'FAILED', _count: 10 },
        { status: 'RUNNING', _count: 3 },
      ]);

      const result = await service.getExecutionStats('org-1', 'user-1');

      expect(result.SUCCESS).toBe(50);
      expect(result.FAILED).toBe(10);
      expect(result.RUNNING).toBe(3);
      expect(result.PENDING).toBe(0);
      expect(result.CANCELLED).toBe(0);
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow stats', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.workflow.findMany.mockResolvedValue([
        { id: 'wf-1', name: 'Test Workflow', active: true, _count: { executions: 25 } },
        { id: 'wf-2', name: 'Inactive WF', active: false, _count: { executions: 5 } },
      ]);

      const result = await service.getWorkflowStats('org-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'wf-1', name: 'Test Workflow', active: true, executionCount: 25 });
      expect(result[1]).toEqual({ id: 'wf-2', name: 'Inactive WF', active: false, executionCount: 5 });
    });
  });
});
