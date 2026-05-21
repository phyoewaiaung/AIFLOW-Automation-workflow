'use client';

import { useCallback, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowNode } from './workflow-node';
import { Link2, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useToastStore } from '@/store/use-toast-store';
import { integrations as integrationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';

interface AgentOption {
  id: string;
  name: string;
}

const defaultNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 200 },
    data: { label: 'Webhook Trigger', type: 'webhook' },
  },
];

const defaultEdges: Edge[] = [];

export interface WorkflowCanvasHandle {
  getData: () => { nodes: Node[]; edges: Edge[] };
}

interface WorkflowCanvasProps {
  workflowId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  agents?: AgentOption[];
}

export const WorkflowCanvas = forwardRef<WorkflowCanvasHandle, WorkflowCanvasProps>(
  function WorkflowCanvas({ workflowId, initialNodes, initialEdges, agents = [] }, ref) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || defaultEdges);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const nodeTypes = useMemo(() => ({ custom: WorkflowNode }), []);

    const updateNodeData = useCallback(
      (nodeId: string, updates: Record<string, unknown>) => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
          )
        );
      },
      [setNodes]
    );

    useImperativeHandle(ref, () => ({
      getData: () => ({ nodes, edges }),
    }));

    const onConnect = useCallback(
      (params: Connection) => {
        setEdges((eds) => addEdge(params, eds));
      },
      [setEdges]
    );

    const onNodeClick = useCallback((_: any, node: Node) => {
      setSelectedNode(node.id);
    }, []);

    const addNode = useCallback(
      (type: string, label: string) => {
        const id = `node-${Date.now()}`;
        const extraData: Record<string, unknown> = {};
        if (type === 'ai-agent') {
          extraData.input = '';
        }
        if (type === 'ai-classify') {
          extraData.prompt = '';
        }
        if (type === 'ai-email-generator') {
          extraData.recipient = '';
        }
        if (type === 'http-request') {
          extraData.url = '';
          extraData.method = 'GET';
        }
        if (type === 'send-email') {
          extraData.to = '';
          extraData.subject = '';
        }
        if (type === 'slack-message') {
          extraData.channel = '#general';
          extraData.message = '';
        }
        if (type === 'discord-message') {
          extraData.message = '';
        }
        if (type === 'condition') {
          extraData.condition = 'always-true';
        }
        const newNode: Node = {
          id,
          type: 'custom',
          position: {
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100,
          },
          data: { label, type, ...extraData },
        };
        setNodes((nds) => [...nds, newNode]);
      },
      [setNodes]
    );

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const webhookUrl = workflowId ? `${apiUrl}/api/workflows/webhook/${workflowId}` : null;
    const addToast = useToastStore((s) => s.addToast);

    const selectedNodeData = nodes.find((n) => n.id === selectedNode);

    return (
      <div className="flex h-full">
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor="hsl(240 5% 65%)"
              nodeStrokeColor="hsl(240 4% 16%)"
              bgColor="hsl(240 6% 7%)"
              maskColor="rgba(0,0,0,0.6)"
            />
          </ReactFlow>
        </div>

        <div className="w-72 border-l border-border bg-card p-4 space-y-4 overflow-y-auto">
          <div>
            <h3 className="font-semibold mb-3">Add Node</h3>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase mb-2">Triggers</p>
              <button
                onClick={() => addNode('trigger-webhook', 'Webhook')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Webhook
              </button>
              <button
                onClick={() => addNode('trigger-schedule', 'Schedule')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Schedule
              </button>
            </div>
            <div className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground uppercase mb-2">AI</p>
              <button
                onClick={() => addNode('ai-agent', 'AI Agent')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                AI Agent
              </button>
              <button
                onClick={() => addNode('ai-classify', 'AI Classification')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                AI Classification
              </button>
              <button
                onClick={() => addNode('ai-email-generator', 'Email Generator')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Email Generator
              </button>
            </div>
            <div className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground uppercase mb-2">Actions</p>
              <button
                onClick={() => addNode('http-request', 'HTTP Request')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                HTTP Request
              </button>
              <button
                onClick={() => addNode('send-email', 'Send Email')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Send Email
              </button>
              <button
                onClick={() => addNode('slack-message', 'Slack Message')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Slack Message
              </button>
              <button
                onClick={() => addNode('discord-message', 'Discord Message')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Discord Message
              </button>
            </div>
            <div className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground uppercase mb-2">Logic</p>
              <button
                onClick={() => addNode('condition', 'Condition')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Condition
              </button>
            </div>
          </div>

          {selectedNode && selectedNodeData && (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3">Node Configuration</h3>
              <div className="space-y-3">
                <div key={`${selectedNode}-label`}>
                  <label className="text-sm text-muted-foreground">Label</label>
                  <input
                    type="text"
                    className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                    defaultValue={selectedNodeData.data.label as string}
                    onChange={(e) => updateNodeData(selectedNode, { label: e.target.value })}
                  />
                </div>

                {selectedNodeData.data.type === 'trigger-webhook' && webhookUrl && (
                  <div key={`${selectedNode}-webhook`} className="space-y-2">
                    <label className="text-sm text-muted-foreground">Webhook URL</label>
                    <div className="flex items-center gap-1.5 p-2 bg-muted border border-border rounded-md">
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <code className="text-xs text-muted-foreground truncate flex-1">
                        {webhookUrl}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(webhookUrl);
                          addToast('Webhook URL copied', 'success');
                        }}
                        className="p-1 hover:bg-muted/80 rounded transition-colors shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send a POST request to this URL to trigger the workflow. The request body is passed as trigger data.
                    </p>
                  </div>
                )}

                {selectedNodeData.data.type === 'ai-agent' && (
                  <div key={`${selectedNode}-ai-agent`}>
                    <label className="text-sm text-muted-foreground">AI Agent</label>
                    <select
                      className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                      defaultValue={selectedNodeData.data.agentId as string || ''}
                      onChange={(e) => updateNodeData(selectedNode, { agentId: e.target.value })}
                    >
                      <option value="">Select an agent...</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <label className="text-sm text-muted-foreground mt-3 block">Input / Prompt</label>
                    <textarea
                      className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                      rows={3}
                      placeholder='Leave blank to use previous node output, or type a custom prompt here'
                      defaultValue={selectedNodeData.data.input as string || ''}
                      onChange={(e) => updateNodeData(selectedNode, { input: e.target.value })}
                    />
                  </div>
                )}

                {selectedNodeData.data.type === 'ai-email-generator' && (
                  <div key={`${selectedNode}-ai-email`}>
                    <label className="text-sm text-muted-foreground">Recipient</label>
                    <input
                      type="text"
                      className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                      defaultValue={selectedNodeData.data.recipient as string || ''}
                      onChange={(e) => updateNodeData(selectedNode, { recipient: e.target.value })}
                    />
                  </div>
                )}

                {selectedNodeData.data.type === 'ai-classify' && (
                  <div key={`${selectedNode}-ai-classify`}>
                    <label className="text-sm text-muted-foreground">Classification Prompt</label>
                    <textarea
                      className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                      rows={3}
                      defaultValue={selectedNodeData.data.prompt as string || ''}
                      onChange={(e) => updateNodeData(selectedNode, { prompt: e.target.value })}
                    />
                  </div>
                )}

                {selectedNodeData.data.type === 'http-request' && (
                  <div key={`${selectedNode}-http`}>
                    <div>
                      <label className="text-sm text-muted-foreground">URL</label>
                      <input
                        type="text"
                        className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                        defaultValue={selectedNodeData.data.url as string || ''}
                        onChange={(e) => updateNodeData(selectedNode, { url: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Method</label>
                      <select
                        className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                        defaultValue={selectedNodeData.data.method as string || 'GET'}
                        onChange={(e) => updateNodeData(selectedNode, { method: e.target.value })}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNodeData.data.type === 'send-email' && (
                  <div key={`${selectedNode}-email`}>
                    <div>
                      <label className="text-sm text-muted-foreground">To</label>
                      <input
                        type="text"
                        className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                        defaultValue={selectedNodeData.data.to as string || ''}
                        onChange={(e) => updateNodeData(selectedNode, { to: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Subject</label>
                      <input
                        type="text"
                        className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                        defaultValue={selectedNodeData.data.subject as string || ''}
                        onChange={(e) => updateNodeData(selectedNode, { subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Body</label>
                      <textarea
                        className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                        rows={4}
                        defaultValue={selectedNodeData.data.body as string || ''}
                        onChange={(e) => updateNodeData(selectedNode, { body: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {selectedNodeData.data.type === 'slack-message' && (
                  <SlackChannelConfig
                    key={`${selectedNode}-slack`}
                    selectedNode={selectedNode}
                    selectedNodeData={selectedNodeData}
                    updateNodeData={updateNodeData}
                  />
                )}

                {selectedNodeData.data.type === 'discord-message' && (
                  <DiscordChannelConfig
                    key={`${selectedNode}-discord`}
                    selectedNode={selectedNode}
                    selectedNodeData={selectedNodeData}
                    updateNodeData={updateNodeData}
                  />
                )}

                {selectedNodeData.data.type === 'condition' && (
                  <div key={`${selectedNode}-condition`}>
                    <label className="text-sm text-muted-foreground">Condition</label>
                    <select
                      className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                      defaultValue={selectedNodeData.data.condition as string || 'always-true'}
                      onChange={(e) => updateNodeData(selectedNode, { condition: e.target.value })}
                    >
                      <option value="always-true">Always True</option>
                      <option value="always-false">Always False</option>
                      <option value="data-driven">Data Driven</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={() => {
                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
                    setSelectedNode(null);
                  }}
                  className="w-full p-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  Delete Node
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

function SlackChannelConfig({
  selectedNode,
  selectedNodeData,
  updateNodeData,
}: {
  selectedNode: string;
  selectedNodeData: Node;
  updateNodeData: (id: string, data: Record<string, any>) => void;
}) {
  const [channels, setChannels] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const organization = useAuthStore((s) => s.organization);

  const loadChannels = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const integrations = await integrationsApi.list(organization.id);
      const slack = integrations.find((i: any) => i.type === 'SLACK');
      if (!slack) {
        useToastStore.getState().addToast('Connect Slack in Integrations page first', 'error');
        return;
      }
      const chs = await integrationsApi.fetchSlackChannels(slack.id);
      setChannels(chs);
    } catch (err: any) {
      useToastStore.getState().addToast(err?.message || 'Failed to load channels', 'error');
    } finally {
      setLoading(false);
    }
  }, [organization]);

  const currentChannel = (selectedNodeData.data.channel as string) || '#general';

  return (
    <div key={`${selectedNode}-slack`}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-muted-foreground">Channel</label>
          <button
            onClick={loadChannels}
            disabled={loading}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Load channels
          </button>
        </div>
        {channels ? (
          <select
            className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
            value={channels.find((ch) => `#${ch.name}` === currentChannel || ch.id === currentChannel) ? currentChannel : ''}
            onChange={(e) => updateNodeData(selectedNode, { channel: e.target.value })}
          >
            <option value="" disabled>Select a channel</option>
            {channels.map((ch: any) => (
              <option key={ch.id} value={`#${ch.name}`}>
                # {ch.name}{ch.isPrivate ? ' (private)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
            defaultValue={currentChannel}
            onChange={(e) => updateNodeData(selectedNode, { channel: e.target.value })}
          />
        )}
      </div>
      <div className="mt-3">
        <label className="text-sm text-muted-foreground">Message</label>
        <textarea
          className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
          rows={3}
          defaultValue={selectedNodeData.data.message as string || ''}
          onChange={(e) => updateNodeData(selectedNode, { message: e.target.value })}
        />
      </div>
    </div>
  );
}

function DiscordChannelConfig({
  selectedNode,
  selectedNodeData,
  updateNodeData,
}: {
  selectedNode: string;
  selectedNodeData: Node;
  updateNodeData: (id: string, data: Record<string, any>) => void;
}) {
  const [channels, setChannels] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const organization = useAuthStore((s) => s.organization);

  const loadChannels = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const integrations = await integrationsApi.list(organization.id);
      const discord = integrations.find((i: any) => i.type === 'DISCORD');
      if (!discord) {
        useToastStore.getState().addToast('Connect Discord in Integrations page first', 'error');
        return;
      }
      const chs = await integrationsApi.fetchDiscordChannels(discord.id);
      setChannels(chs);
    } catch (err: any) {
      useToastStore.getState().addToast(err?.message || 'Failed to load channels', 'error');
    } finally {
      setLoading(false);
    }
  }, [organization]);

  const currentChannel = (selectedNodeData.data.channel as string) || '';

  const grouped = useMemo(() => {
    if (!channels) return null;
    const groups: Record<string, any[]> = {};
    for (const ch of channels) {
      if (!groups[ch.guildName]) groups[ch.guildName] = [];
      groups[ch.guildName].push(ch);
    }
    return groups;
  }, [channels]);

  return (
    <div key={`${selectedNode}-discord`}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-muted-foreground">Channel</label>
          <button
            onClick={loadChannels}
            disabled={loading}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Load channels
          </button>
        </div>
        {channels && grouped ? (
          <select
            className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
            value={channels.find((ch) => ch.id === currentChannel || ch.name === currentChannel) ? currentChannel : ''}
            onChange={(e) => updateNodeData(selectedNode, { channel: e.target.value })}
          >
            <option value="" disabled>Select a channel</option>
            {Object.entries(grouped).map(([guildName, chs]) => (
              <optgroup key={guildName} label={guildName}>
                {chs.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    # {ch.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
            placeholder="Channel ID (click Load channels above)"
            defaultValue={currentChannel}
            onChange={(e) => updateNodeData(selectedNode, { channel: e.target.value })}
          />
        )}
      </div>
      <div className="mt-3">
        <label className="text-sm text-muted-foreground">Message</label>
        <textarea
          className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
          rows={3}
          defaultValue={selectedNodeData.data.message as string || ''}
          onChange={(e) => updateNodeData(selectedNode, { message: e.target.value })}
        />
      </div>
    </div>
  );
}