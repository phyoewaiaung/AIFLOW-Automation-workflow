'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Clock, Bot, Mail, MessageSquare, Globe, Code, GitBranch } from 'lucide-react';

interface CustomNodeData {
  label: string;
  type: string;
}

const nodeIcons: Record<string, React.ElementType> = {
  webhook: Zap,
  schedule: Clock,
  'ai-agent': Bot,
  'ai-classify': Bot,
  'ai-email': Mail,
  http: Globe,
  email: Mail,
  slack: MessageSquare,
  condition: GitBranch,
};

const nodeColors: Record<string, string> = {
  webhook: 'bg-blue-500',
  schedule: 'bg-purple-500',
  'ai-agent': 'bg-emerald-500',
  'ai-classify': 'bg-emerald-500',
  'ai-email': 'bg-emerald-500',
  http: 'bg-orange-500',
  email: 'bg-cyan-500',
  slack: 'bg-pink-500',
  condition: 'bg-yellow-500',
};

export const WorkflowNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  const Icon = nodeIcons[nodeData.type] || Code;
  const colorClass = nodeColors[nodeData.type] || 'bg-gray-500';

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-muted !border-2 !border-background"
      />

      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-md ${colorClass} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm">{nodeData.label}</p>
          <p className="text-xs text-muted-foreground">{nodeData.type}</p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-muted !border-2 !border-background"
      />
    </div>
  );
});

WorkflowNode.displayName = 'WorkflowNode';