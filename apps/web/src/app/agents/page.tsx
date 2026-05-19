'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useAgents, useCreateAgent, useDeleteAgent } from '@/hooks/use-api';
import { agents as agentsApi } from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Bot, Edit, MessageSquare, Trash2, Loader2, X } from 'lucide-react';

export default function AgentsPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';

  const { data: agentsList, isLoading: agentsLoading } = useAgents(orgId);
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !orgId) return;
    await createAgent.mutateAsync({
      name: newName,
      description: newDescription,
      instructions: newInstructions,
      organizationId: orgId,
    });
    setNewName('');
    setNewDescription('');
    setNewInstructions('');
    setShowCreate(false);
  };

  const handleTest = async (id: string) => {
    if (!testInput.trim()) return;
    setTestingId(id);
    setTestResult(null);
    try {
      const result = await agentsApi.test(id, testInput);
      setTestResult(result.output);
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTestingId(null);
    }
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
              <h1 className="text-3xl font-bold">AI Agents</h1>
              <p className="text-muted-foreground mt-1">Manage your AI agents and their configurations</p>
            </div>
            <Button onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showCreate ? 'Cancel' : 'New Agent'}
            </Button>
          </div>

          {showCreate && (
            <Card>
              <CardContent className="p-5">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Name</label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., Lead Classifier"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <Input
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="What does this agent do?"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">System Instructions</label>
                    <textarea
                      value={newInstructions}
                      onChange={(e) => setNewInstructions(e.target.value)}
                      placeholder="You are an AI assistant that..."
                      className="w-full h-24 px-3 py-2 bg-card border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <Button type="submit" disabled={createAgent.isPending || !newName.trim()}>
                    {createAgent.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Create Agent
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {agentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !agentsList || agentsList.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No AI agents yet</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentsList.map((agent: any) => (
                <Card key={agent.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <Badge variant="success">Active</Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">{agent.description || 'No description'}</p>

                    <div className="text-sm text-muted-foreground mb-4">
                      Model: <span className="font-medium text-foreground">{agent.model}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter test input..."
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      {testResult && testingId === agent.id && (
                        <div className="text-sm p-2 bg-muted rounded-md">{testResult}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleTest(agent.id)}
                        disabled={testingId === agent.id || !testInput.trim()}
                      >
                        {testingId === agent.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <MessageSquare className="w-3 h-3 mr-1" />
                        )}
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAgent.mutateAsync(agent.id)}
                        disabled={deleteAgent.isPending}
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