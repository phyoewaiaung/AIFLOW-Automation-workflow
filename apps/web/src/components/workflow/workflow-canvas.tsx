'use client';

import { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
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

const defaultNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
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
}

export const WorkflowCanvas = forwardRef<WorkflowCanvasHandle, WorkflowCanvasProps>(
  function WorkflowCanvas({ workflowId, initialNodes, initialEdges }, ref) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || defaultEdges);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

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
        const newNode: Node = {
          id,
          type: 'custom',
          position: {
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100,
          },
          data: { label, type },
        };
        setNodes((nds) => [...nds, newNode]);
      },
      [setNodes]
    );

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
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <div className="w-72 border-l border-border bg-card p-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Add Node</h3>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase mb-2">Triggers</p>
              <button
                onClick={() => addNode('webhook', 'Webhook')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Webhook
              </button>
              <button
                onClick={() => addNode('schedule', 'Schedule')}
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
                onClick={() => addNode('ai-email', 'Email Generator')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Email Generator
              </button>
            </div>
            <div className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground uppercase mb-2">Actions</p>
              <button
                onClick={() => addNode('http', 'HTTP Request')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                HTTP Request
              </button>
              <button
                onClick={() => addNode('email', 'Send Email')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Send Email
              </button>
              <button
                onClick={() => addNode('slack', 'Slack Message')}
                className="w-full p-2 text-left text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
              >
                Slack Message
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

          {selectedNode && (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3">Node Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Label</label>
                  <input
                    type="text"
                    className="w-full mt-1 p-2 bg-muted border border-border rounded-md text-sm"
                    defaultValue={
                      nodes.find((n) => n.id === selectedNode)?.data.label
                    }
                  />
                </div>
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