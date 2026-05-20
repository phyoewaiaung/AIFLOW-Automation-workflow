import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Clock, Bot, Mail, MessageSquare, Globe, Code, GitBranch } from 'lucide-react';

interface CustomNodeData {
  label: string;
  type: string;
}

const nodeIcons: Record<string, React.ElementType> = {
  trigger: Zap,
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

const nodeStyles: Record<string, { border: string; badge: string; iconColor: string }> = {
  webhook: { border: 'border-blue-500/50', badge: 'bg-blue-500', iconColor: 'text-blue-400' },
  'trigger-webhook': { border: 'border-blue-500/50', badge: 'bg-blue-500', iconColor: 'text-blue-400' },
  schedule: { border: 'border-purple-500/50', badge: 'bg-purple-500', iconColor: 'text-purple-400' },
  'trigger-schedule': { border: 'border-purple-500/50', badge: 'bg-purple-500', iconColor: 'text-purple-400' },
  'ai-agent': { border: 'border-emerald-500/50', badge: 'bg-emerald-500', iconColor: 'text-emerald-400' },
  'ai-classify': { border: 'border-emerald-500/50', badge: 'bg-emerald-500', iconColor: 'text-emerald-400' },
  'ai-email-generator': { border: 'border-emerald-500/50', badge: 'bg-emerald-500', iconColor: 'text-emerald-400' },
  'http-request': { border: 'border-orange-500/50', badge: 'bg-orange-500', iconColor: 'text-orange-400' },
  http: { border: 'border-orange-500/50', badge: 'bg-orange-500', iconColor: 'text-orange-400' },
  'send-email': { border: 'border-cyan-500/50', badge: 'bg-cyan-500', iconColor: 'text-cyan-400' },
  email: { border: 'border-cyan-500/50', badge: 'bg-cyan-500', iconColor: 'text-cyan-400' },
  'slack-message': { border: 'border-pink-500/50', badge: 'bg-pink-500', iconColor: 'text-pink-400' },
  slack: { border: 'border-pink-500/50', badge: 'bg-pink-500', iconColor: 'text-pink-400' },
  condition: { border: 'border-yellow-500/50', badge: 'bg-yellow-500', iconColor: 'text-yellow-400' },
};

const defaultStyle = { border: 'border-border', badge: 'bg-muted', iconColor: 'text-foreground' };

export const WorkflowNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  const Icon = nodeIcons[nodeData.type] || Code;
  const s = nodeStyles[nodeData.type] || defaultStyle;

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border-2 shadow-lg transition-shadow ${selected
        ? `${s.border} bg-muted ring-2 ring-primary/30`
        : `${s.border} bg-muted hover:shadow-xl`
        }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />

      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${s.badge} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm text-card-foreground">{nodeData.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{nodeData.type}</p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />
    </div>
  );
});

WorkflowNode.displayName = 'WorkflowNode';