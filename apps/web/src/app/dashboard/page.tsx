'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useAnalytics, useExecutions } from '@/hooks/use-api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Workflow,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';

  const { data: analyticsData, isLoading: analyticsLoading } = useAnalytics(orgId);
  const { data: executionsData, isLoading: executionsLoading } = useExecutions(orgId, {}, 5);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = analyticsData ? [
    {
      label: 'Total Workflows',
      value: analyticsData.totalWorkflows || '0',
      icon: Workflow,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Active Workflows',
      value: analyticsData.activeWorkflows || '0',
      icon: Zap,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Executions',
      value: analyticsData.totalExecutions?.toLocaleString() || '0',
      icon: PlayCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Success Rate',
      value: analyticsData.successRate ? `${analyticsData.successRate}%` : '0%',
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
  ] : [];

  const executions = executionsData?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success">Success</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'RUNNING':
        return <Badge variant="info">Running</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="pt-14 md:pl-64">
        <div className="p-4 md:p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of your automation workflows
            </p>
          </div>

          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {stat.label}
                          </p>
                          <p className="text-3xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div
                          className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                        >
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Executions</CardTitle>
                </CardHeader>
                <CardContent>
                  {executionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : executions.length > 0 ? (
                    <div className="space-y-4">
                      {executions.map((exec: any) => (
                        <div
                          key={exec.id}
                          className="flex items-center justify-between py-3 border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-4">
                            {exec.status === 'RUNNING' ? (
                              <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                            ) : exec.status === 'SUCCESS' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : exec.status === 'FAILED' ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{exec.workflow?.name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatTimeAgo(exec.createdAt)}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(exec.status)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No executions yet. Run a workflow to see results here.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <button
                      onClick={() => router.push('/workflows/new')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <Zap className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Create New Workflow</p>
                        <p className="text-sm text-muted-foreground">
                          Build a new automation from scratch
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => router.push('/executions')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <PlayCircle className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-medium">View All Executions</p>
                        <p className="text-sm text-muted-foreground">
                          Check recent workflow runs
                        </p>
                      </div>
                    </button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Credits Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">This Month</span>
                        <span className="font-medium">
                          {(analyticsData?.aiCreditsUsed || 0).toLocaleString()} / {(analyticsData?.aiCreditsLimit || 100000).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.min(
                              ((analyticsData?.aiCreditsUsed || 0) / (analyticsData?.aiCreditsLimit || 100000)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${analyticsData?.estimatedAiCost?.toFixed(2) || '0.00'} estimated cost for this month
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}