'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useToastStore } from '@/store/use-toast-store';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { WorkflowCanvas, WorkflowCanvasHandle } from '@/components/workflow/workflow-canvas';
import { useWorkflow, useSaveWorkflowNodes, useAgents, useTriggerExecution } from '@/hooks/use-api';
import { Save, Play, ArrowLeft, Loader2 } from 'lucide-react';

export default function WorkflowEditPage() {
  const router = useRouter();
  const params = useParams();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const canvasRef = useRef<WorkflowCanvasHandle>(null);
  const saveWorkflow = useSaveWorkflowNodes();
  const triggerExecution = useTriggerExecution();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  const workflowId = params.id as string;
  const isNew = workflowId === 'new';

  const { data: workflow, isLoading: workflowLoading } = useWorkflow(isNew ? '' : workflowId);
  const { data: agentsList } = useAgents(organization?.id || '');

  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
    }
  }, [workflow]);

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || isNew) return;
    const { nodes, edges } = canvasRef.current.getData();
    await saveWorkflow.mutateAsync({
      id: workflowId,
      data: {
        nodes: nodes.map((n: any) => ({
          id: n.id,
          type: n.data?.type || n.type,
          positionX: n.position.x,
          positionY: n.position.y,
          data: n.data,
        })),
        edges: edges.map((e: any) => ({
          id: e.id,
          sourceId: e.source,
          targetId: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      },
    });
    addToast('Workflow saved', 'success');
    router.push('/workflows');
  }, [workflowId, isNew, saveWorkflow, addToast, router]);

  const handleTest = useCallback(async () => {
    if (isNew) return;
    const result = await triggerExecution.mutateAsync({ workflowId, data: { test: true, source: 'manual' } });
    addToast('Execution started', 'info');
    router.push(`/executions/${result.id}`);
  }, [workflowId, isNew, triggerExecution, addToast, router]);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="fixed top-14 left-0 right-0 h-14 bg-card/80 backdrop-blur-xl border-b border-border z-20">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/workflows')}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent border-none text-lg font-semibold focus:outline-none focus:ring-0"
            />
            <span className="text-sm text-muted-foreground">Draft</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={triggerExecution.isPending || isNew}>
              {triggerExecution.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Test
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveWorkflow.isPending || isNew}>
              {saveWorkflow.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-28 h-screen">
        {workflowLoading && !isNew ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WorkflowCanvas
            ref={canvasRef}
            workflowId={isNew ? undefined : workflowId}
            agents={agentsList?.map((a: any) => ({ id: a.id, name: a.name })) || []}
            initialNodes={workflow?.nodes?.map((n: any) => ({
              id: n.id,
              type: 'custom',
              position: { x: n.positionX, y: n.positionY },
              data: n.data,
            }))}
            initialEdges={workflow?.edges?.map((e: any) => ({
              id: e.id,
              source: e.sourceId,
              target: e.targetId,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            }))}
          />
        )}
      </div>

    </div>
  );
}