'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Bot, Play, Edit, Trash2, MessageSquare } from 'lucide-react';

export default function AgentsPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth } = useAuthStore();

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

  const agents = [
    { id: '1', name: 'Lead Classifier', description: 'Classifies incoming leads based on criteria', model: 'gpt-4', status: 'active' },
    { id: '2', name: 'Email Writer', description: 'Generates personalized email responses', model: 'gpt-4', status: 'active' },
    { id: '3', name: 'Support Assistant', description: 'Handles customer support inquiries', model: 'gpt-3.5-turbo', status: 'inactive' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pt-14 md:pl-64">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AI Agents</h1>
              <p className="text-muted-foreground mt-1">Manage your AI agents and their configurations</p>
            </div>
            <Button><Plus className="w-4 h-4 mr-2" />New Agent</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <Badge variant={agent.status === 'active' ? 'success' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{agent.description}</p>

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>Model: {agent.model}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageSquare className="w-3 h-3 mr-1" />Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}