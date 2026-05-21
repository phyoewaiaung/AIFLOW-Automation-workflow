'use client';

import { useState, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, RefreshCw, Zap, Bot, Mail, MessageSquare, Globe, GitBranch, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

const nodeIcons: Record<string, React.ElementType> = {
  'trigger-webhook': Zap,
  'trigger-schedule': Clock,
  'ai-agent': Bot,
  'ai-classify': Bot,
  'ai-email-generator': Mail,
  'http-request': Globe,
  'send-email': Mail,
  'slack-message': MessageSquare,
  condition: GitBranch,
};

const nodeColors: Record<string, string> = {
  'trigger-webhook': 'bg-blue-500',
  'trigger-schedule': 'bg-purple-500',
  'ai-agent': 'bg-emerald-500',
  'ai-classify': 'bg-emerald-500',
  'ai-email-generator': 'bg-emerald-500',
  'http-request': 'bg-orange-500',
  'send-email': 'bg-cyan-500',
  'slack-message': 'bg-pink-500',
  condition: 'bg-yellow-500',
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const defaultIcon = Code;

interface TimelineNode {
  nodeId: string;
  type: string;
  label: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  status: 'pending' | 'running' | 'success' | 'failed';
  logs: any[];
}

function buildTimelineData(execution: any, logs: any[]): TimelineNode[] {
  const workflowNodes: any[] = execution?.workflow?.nodes || [];
  const nodeMap = new Map<string, any>();
  for (const wn of workflowNodes) {
    nodeMap.set(wn.id, wn);
  }

  const logGroups = new Map<string, any[]>();
  for (const log of logs) {
    const key = log.nodeId || '__system__';
    if (!logGroups.has(key)) logGroups.set(key, []);
    logGroups.get(key)!.push(log);
  }

  const seen = new Set<string>();
  const result: TimelineNode[] = [];

  for (const log of logs) {
    if (!log.nodeId) continue;
    if (seen.has(log.nodeId)) continue;
    seen.add(log.nodeId);

    const wn = nodeMap.get(log.nodeId);
    const nodeLogs = logGroups.get(log.nodeId) || [];

    const startedLog = nodeLogs.find((l) => l.startedAt);
    const completedLog = nodeLogs.find((l) => l.completedAt);
    const errorLog = nodeLogs.find((l) => l.level === 'ERROR');

    let startedAt: string | null = startedLog?.startedAt || null;
    let completedAt: string | null = completedLog?.completedAt || null;
    let duration: number | null = completedLog?.duration || null;

    if (!completedAt && execution.status === 'RUNNING' && startedAt) {
      duration = Date.now() - new Date(startedAt).getTime();
    }

    let status: TimelineNode['status'] = 'pending';
    if (errorLog) status = 'failed';
    else if (completedAt) status = 'success';
    else if (startedAt) status = 'running';
    else if (execution.status === 'SUCCESS') status = 'success';

    result.push({
      nodeId: log.nodeId,
      type: wn?.data?.type || wn?.type || 'unknown',
      label: wn?.data?.label || wn?.type || 'Unknown Node',
      startedAt,
      completedAt,
      duration,
      status,
      logs: nodeLogs,
    });
  }

  return result;
}

function Code({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function NodeStatusIcon({ status }: { status: TimelineNode['status'] }) {
  switch (status) {
    case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
    case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    default: return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
}

export function ExecutionTimeline({ execution, logs }: { execution: any; logs: any[] }) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAllLogs, setShowAllLogs] = useState(false);

  const nodes = useMemo(() => buildTimelineData(execution, logs), [execution, logs]);

  const totalDuration = useMemo(() => {
    if (execution?.startedAt && execution?.completedAt) {
      return new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime();
    }
    return null;
  }, [execution]);

  const maxDuration = useMemo(() => {
    let max = 0;
    for (const n of nodes) {
      if (n.duration && n.duration > max) max = n.duration;
    }
    return max || 1;
  }, [nodes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">Execution Timeline</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{nodes.length} nodes</span>
          {totalDuration !== null && <span>Total: {formatMs(totalDuration)}</span>}
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {execution?.status === 'RUNNING' ? 'Waiting for nodes...' : 'No node execution data available'}
        </div>
      ) : (
        <div className="relative p-4">
          {/* Vertical timeline line */}
          <div className="absolute left-[35px] top-0 bottom-0 w-px bg-border" />

          {nodes.map((node, idx) => {
            const Icon = nodeIcons[node.type] || defaultIcon;
            const dotColor = nodeColors[node.type] || 'bg-muted';
            const isExpanded = expandedNodes.has(node.nodeId);
            const nonSysLogs = node.logs.filter((l) => l.level !== 'SYSTEM');
            const barWidth = node.duration ? Math.max((node.duration / maxDuration) * 100, 5) : 0;

            return (
              <div key={node.nodeId} className="relative mb-4 last:mb-0">
                {/* Timeline dot */}
                <div className={`absolute left-[27px] top-5 w-[17px] h-[17px] rounded-full border-2 border-background ${dotColor} z-10 flex items-center justify-center`}>
                  {node.status === 'success' && <CheckCircle className="w-3 h-3 text-white" />}
                  {node.status === 'failed' && <XCircle className="w-3 h-3 text-white" />}
                  {node.status === 'running' && <Loader2 className="w-3 h-3 text-white animate-spin" />}
                </div>

                {/* Node card */}
                <div className="ml-16">
                  <div
                    className="bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => toggleNode(node.nodeId)}
                  >
                    {/* Node header */}
                    <div className="flex items-center gap-3 p-3">
                      <div className={`w-8 h-8 rounded-lg ${dotColor} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{node.label}</p>
                          <NodeStatusIcon status={node.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{node.type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {node.duration !== null ? (
                          <p className="text-sm font-mono text-muted-foreground">{formatMs(node.duration)}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{node.status === 'running' ? 'Running...' : 'Pending'}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Duration bar */}
                    {node.duration !== null && (
                      <div className="px-3 pb-1">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${node.status === 'failed' ? 'bg-red-500' : 'bg-primary'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded logs */}
                  {isExpanded && nonSysLogs.length > 0 && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-muted pl-4">
                      {nonSysLogs.map((log, i) => (
                        <div key={i} className="flex gap-2 py-1 text-xs font-mono">
                          <span className="text-muted-foreground shrink-0 w-14">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={`shrink-0 w-12 uppercase font-bold text-[10px] ${
                            log.level === 'ERROR' ? 'text-red-500' :
                            log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-500'
                          }`}>
                            {log.level}
                          </span>
                          <span className="text-foreground break-all">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && nonSysLogs.length === 0 && (
                    <div className="ml-4 mt-1 pl-4 py-1 text-xs text-muted-foreground italic">
                      No logs for this node
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* System logs toggle */}
      {logs.some((l) => !l.nodeId) && (
        <div className="border-t border-border p-3">
          <button
            onClick={() => setShowAllLogs(!showAllLogs)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAllLogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            System Logs ({logs.filter((l) => !l.nodeId).length})
          </button>
          {showAllLogs && (
            <div className="mt-2 space-y-1">
              {logs.filter((l) => !l.nodeId).map((log, i) => (
                <div key={i} className="flex gap-2 py-1 text-xs font-mono pl-6">
                  <span className="text-muted-foreground w-14 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`shrink-0 w-12 uppercase font-bold text-[10px] ${
                    log.level === 'ERROR' ? 'text-red-500' :
                    log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-500'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
