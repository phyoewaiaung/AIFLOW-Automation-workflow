'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useExecution, useCancelExecution, useRetryExecution, useTriggerExecution } from '@/hooks/use-api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle, XCircle, RefreshCw, Ban, RotateCw, ExternalLink, Play, Loader2 } from 'lucide-react';
import { connectSocket, subscribeToExecution, unsubscribeFromExecution } from '@/lib/socket';

const statusConfig: Record<string, { label: string; variant: any; icon: any; color: string }> = {
  SUCCESS: { label: 'Success', variant: 'success', icon: CheckCircle, color: 'text-green-500' },
  FAILED: { label: 'Failed', variant: 'destructive', icon: XCircle, color: 'text-red-500' },
  RUNNING: { label: 'Running', variant: 'info', icon: RefreshCw, color: 'text-blue-500' },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock, color: 'text-yellow-500' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary', icon: XCircle, color: 'text-muted-foreground' },
};

export default function ExecutionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const executionId = params.id as string;
  const { isLoading, token, checkAuth, user } = useAuthStore();

  const { data: initialExecution, isLoading: execLoading, refetch } = useExecution(executionId);
  const cancelExecution = useCancelExecution();
  const retryExecution = useRetryExecution();
  const triggerExecution = useTriggerExecution();

  const [execution, setExecution] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  const addLog = useCallback((log: any) => {
    setLogs((prev) => [...prev, log]);
  }, []);

  useEffect(() => {
    if (initialExecution) {
      setExecution(initialExecution);
      setLogs(initialExecution.logs || []);
    }
  }, [initialExecution]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    subscribeToExecution(executionId);

    socket.on('execution:status', (data: any) => {
      setExecution((prev: any) => prev ? { ...prev, status: data.status, error: data.error || prev.error } : prev);
    });

    socket.on('log:stream', (data: any) => {
      if (data.log) addLog(data.log);
    });

    socket.on('execution:complete', (data: any) => {
      setExecution((prev: any) => prev ? { ...prev, status: data.status, error: data.error || prev.error } : prev);
      refetch();
    });

    return () => {
      unsubscribeFromExecution(executionId);
    };
  }, [user?.id, executionId, addLog, refetch]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const status = execution?.status || 'PENDING';
  const config = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  const formatDuration = (start?: string, end?: string | null) => {
    if (!start) return '-';
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pt-14 md:pl-64">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/executions')}
              className="p-2 hover:bg-muted rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Execution Details</h1>
              <p className="text-sm text-muted-foreground font-mono">{executionId}</p>
            </div>
          </div>

          {execLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !execution ? (
            <div className="text-center py-12 text-muted-foreground">Execution not found</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <StatusIcon className={`w-8 h-8 ${config.color}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Workflow</p>
                    <p className="font-medium">{execution.workflow?.name || 'Unknown'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{formatDuration(execution.startedAt, execution.completedAt)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Actions</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/workflows/${execution.workflowId}`)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Workflow
                      </Button>
                      {status === 'RUNNING' && (
                        <Button size="sm" variant="outline" onClick={() => cancelExecution.mutateAsync(executionId)}>
                          <Ban className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      )}
                      {(status === 'FAILED' || status === 'CANCELLED') && (
                        <Button size="sm" variant="outline" onClick={() => retryExecution.mutateAsync(executionId)}>
                          <RotateCw className="w-3 h-3 mr-1" /> Retry
                        </Button>
                      )}
                      {(status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const result = await triggerExecution.mutateAsync({ workflowId: execution.workflowId });
                            router.push(`/executions/${result.id}`);
                          }}
                        >
                          <Play className="w-3 h-3 mr-1" /> Rerun
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {execution.error && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-muted p-3 rounded-md overflow-auto">{execution.error}</pre>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Execution Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!logs || logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No logs available</p>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log: any, i: number) => (
                        <div
                          key={i}
                          className="flex gap-3 p-2 text-sm rounded-md hover:bg-muted/50 font-mono"
                        >
                          <span className="text-muted-foreground shrink-0 w-16">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`shrink-0 w-16 uppercase text-xs font-bold ${
                              log.level === 'ERROR' ? 'text-red-500' :
                              log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-500'
                            }`}
                          >
                            {log.level}
                          </span>
                          {log.nodeId && (
                            <span className="text-muted-foreground shrink-0 truncate max-w-[120px]">
                              [{log.nodeId.slice(0, 8)}]
                            </span>
                          )}
                          <span className="text-foreground">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}