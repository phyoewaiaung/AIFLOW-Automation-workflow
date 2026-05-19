'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas';
import { Save, Play, Settings, ArrowLeft } from 'lucide-react';

export default function WorkflowEditPage() {
  const router = useRouter();
  const params = useParams();
  const { isLoading, token, checkAuth } = useAuthStore();
  const [workflowName, setWorkflowName] = useState('New Workflow');

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

  const workflowId = params.id as string;
  const isNew = workflowId === 'new';

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
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-28 h-screen">
        <WorkflowCanvas workflowId={isNew ? undefined : workflowId} />
      </div>
    </div>
  );
}