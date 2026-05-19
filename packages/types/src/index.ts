export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export type IntegrationType = 'GMAIL' | 'SLACK' | 'TELEGRAM' | 'DISCORD' | 'NOTION' | 'GOOGLE_SHEETS' | 'HTTP_API' | 'WEBHOOK';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  createdAt: Date;
  user?: User;
  organization?: Organization;
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  type: string;
  positionX: number;
  positionY: number;
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  workflowId: string;
  sourceId: string;
  targetId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  data: Record<string, unknown> | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  triggerConfig: Record<string, unknown> | null;
  definition: Record<string, unknown>;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface Execution {
  id: string;
  workflowId: string;
  organizationId: string;
  triggerData: Record<string, unknown>;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  createdAt: Date;
  createdById: string;
  workflow?: Workflow;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeId: string | null;
  level: LogLevel;
  message: string;
  data: Record<string, unknown> | null;
  timestamp: Date;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  model: string;
  instructions: string;
  tools: string[];
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  config: Record<string, unknown>;
  active: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  organizationId: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface WorkflowNodeType {
  type: string;
  label: string;
  category: 'trigger' | 'ai' | 'logic' | 'action' | 'data';
  icon: string;
  description: string;
  inputs: string[];
  outputs: string[];
  configSchema: Record<string, unknown>;
}

export interface AnalyticsOverview {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  aiCreditsUsed: number;
}

export interface ExecutionFilters {
  workflowId?: string;
  status?: ExecutionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface WebSocketEvents {
  'execution:start': { executionId: string; workflowId: string };
  'execution:progress': { executionId: string; nodeId: string; status: ExecutionStatus };
  'execution:complete': { executionId: string; status: ExecutionStatus; duration: number };
  'execution:error': { executionId: string; error: string; nodeId?: string };
  'log:stream': { executionId: string; log: ExecutionLog };
  'notification:new': { type: string; message: string; data?: Record<string, unknown> };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}