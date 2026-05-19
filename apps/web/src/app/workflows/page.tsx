'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useWorkflows, useDeleteWorkflow, useActivateWorkflow, useDeactivateWorkflow, useTriggerExecution } from '@/hooks/use-api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MoreVertical, Play, Edit, Trash2, Power, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function WorkflowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';

  const [searchQuery, setSearchQuery] = useState('');

  const { data: workflows, isLoading: workflowsLoading } = useWorkflows(orgId);
  const deleteWorkflow = useDeleteWorkflow();
  const activateWorkflow = useActivateWorkflow();
  const deactivateWorkflow = useDeactivateWorkflow();
  const triggerExecution = useTriggerExecution();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      await deleteWorkflow.mutateAsync(id);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    if (active) {
      await deactivateWorkflow.mutateAsync(id);
    } else {
      await activateWorkflow.mutateAsync(id);
    }
  };

  const handleRun = async (id: string) => {
    await triggerExecution.mutateAsync({ workflowId: id });
  };

  const filteredWorkflows = (workflows || []).filter((w: any) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="pt-14 md:pl-64">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Workflows</h1>
              <p className="text-muted-foreground mt-1">
                Manage and monitor your automation workflows
              </p>
            </div>
            <Button onClick={() => router.push('/workflows/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workflows..."
              className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {workflowsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No workflows found</p>
              <Button onClick={() => router.push('/workflows/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first workflow
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkflows.map((workflow: any) => (
                <Card key={workflow.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{workflow.name}</h3>
                        <Badge variant={workflow.active ? 'success' : 'secondary'}>
                          {workflow.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <button
                        className="p-1 hover:bg-muted rounded"
                        onClick={() => handleToggleActive(workflow.id, workflow.active)}
                        title={workflow.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className={`w-4 h-4 ${workflow.active ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {workflow.description || 'No description'}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {workflow._count?.executions || 0}
                        </span>{' '}
                        executions
                      </div>
                      <div className="text-muted-foreground">
                        Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/workflows/${workflow.id}`)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRun(workflow.id)}
                        disabled={triggerExecution.isPending}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(workflow.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}