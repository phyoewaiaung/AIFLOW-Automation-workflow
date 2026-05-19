'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useExecutions, useCancelExecution, useRetryExecution } from '@/hooks/use-api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, Clock, CheckCircle, XCircle, RefreshCw, Ban, RotateCw, Loader2 } from 'lucide-react';

export default function ExecutionsPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: executionsData, isLoading: executionsLoading } = useExecutions(orgId, statusFilter ? { status: statusFilter } : undefined);
  const cancelExecution = useCancelExecution();
  const retryExecution = useRetryExecution();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const executions = executionsData?.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'RUNNING': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <Badge variant="success">Success</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      case 'RUNNING': return <Badge variant="info">Running</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      case 'CANCELLED': return <Badge variant="secondary">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Running...';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleCancel = async (id: string) => {
    await cancelExecution.mutateAsync(id);
  };

  const handleRetry = async (id: string) => {
    await retryExecution.mutateAsync(id);
  };

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
              <h1 className="text-3xl font-bold">Executions</h1>
              <p className="text-muted-foreground mt-1">View and manage workflow executions</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={statusFilter === '' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'RUNNING' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('RUNNING')}
            >
              Running
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'SUCCESS' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('SUCCESS')}
            >
              Success
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'FAILED' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('FAILED')}
            >
              Failed
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              {executionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : executions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No executions found. Run a workflow to see results here.
                </p>
              ) : (
                <div className="space-y-4">
                  {executions.map((exec: any) => (
                    <div key={exec.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(exec.status)}
                        <div>
                          <p className="font-medium">{exec.workflow?.name || 'Unknown Workflow'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTimeAgo(exec.createdAt)} • {formatDuration(exec.startedAt, exec.completedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(exec.status)}
                        {exec.status === 'RUNNING' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(exec.id)}
                            disabled={cancelExecution.isPending}
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        )}
                        {exec.status === 'FAILED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(exec.id)}
                            disabled={retryExecution.isPending}
                          >
                            <RotateCw className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/executions/${exec.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}