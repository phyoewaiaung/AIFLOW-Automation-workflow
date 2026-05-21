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
import { Plus, Bot, MessageSquare, Trash2, Loader2, X, Zap, Cpu } from 'lucide-react';

const PROVIDERS: Record<string, { name: string; icon: any; models: string[] }> = {
  openai: {
    name: 'OpenAI',
    icon: Zap,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
  },
  groq: {
    name: 'Groq',
    icon: Cpu,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b', 'meta-llama/llama-4-scout-17b-16e-instruct'],
  },
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'text-green-400',
  groq: 'text-orange-400',
};

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
  const [newProvider, setNewProvider] = useState('groq');
  const [newModel, setNewModel] = useState('llama-3.3-70b-versatile');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const handleProviderChange = (provider: string) => {
    setNewProvider(provider);
    const meta = PROVIDERS[provider];
    if (meta) setNewModel(meta.models[0]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !orgId) return;
    await createAgent.mutateAsync({
      name: newName,
      description: newDescription,
      instructions: newInstructions,
      provider: newProvider,
      model: newModel,
      organizationId: orgId,
    });
    setNewName('');
    setNewDescription('');
    setNewInstructions('');
    setNewProvider('groq');
    setNewModel('llama-3.3-70b-versatile');
    setShowCreate(false);
  };

  const handleTest = async (id: string) => {
    const input = testInputs[id] || '';
    if (!input.trim()) return;
    setTestingId(id);
    setTestResults((prev) => ({ ...prev, [id]: '' }));
    try {
      const result = await agentsApi.test(id, input);
      setTestResults((prev) => ({ ...prev, [id]: result.output }));
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [id]: `Error: ${err.message}` }));
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Provider</label>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(PROVIDERS).map(([key, meta]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleProviderChange(key)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                              newProvider === key
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border bg-muted text-muted-foreground hover:border-muted-foreground/30'
                            }`}
                          >
                            <meta.icon className="w-4 h-4" />
                            {meta.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Model</label>
                      <select
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                      >
                        {(PROVIDERS[newProvider]?.models || []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Name</label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Lead Classifier" required />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What does this agent do?" />
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
              {agentsList.map((agent: any) => {
                const pMeta = PROVIDERS[agent.provider] || PROVIDERS.openai;
                const PIcon = pMeta.icon;
                return (
                  <Card key={agent.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${agent.provider === 'groq' ? 'bg-orange-500/10' : 'bg-green-500/10'} flex items-center justify-center`}>
                            <PIcon className={`w-5 h-5 ${PROVIDER_COLORS[agent.provider] || 'text-green-400'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{agent.name}</h3>
                            <Badge variant="success">Active</Badge>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{agent.description || 'No description'}</p>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <PIcon className={`w-3.5 h-3.5 ${PROVIDER_COLORS[agent.provider] || 'text-green-400'}`} />
                        <span className="font-medium text-foreground">{pMeta.name}</span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className="font-medium text-foreground">{agent.model}</span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter test input..."
                            value={testInputs[agent.id] || ''}
                            onChange={(e) => setTestInputs((prev) => ({ ...prev, [agent.id]: e.target.value }))}
                            className="text-sm"
                          />
                        </div>
                        {testResults[agent.id] && (
                          <div className="text-sm p-2 bg-muted rounded-md">{testResults[agent.id]}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-border">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleTest(agent.id)}
                          disabled={testingId === agent.id || !(testInputs[agent.id] || '').trim()}
                        >
                          {testingId === agent.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <MessageSquare className="w-3 h-3 mr-1" />
                          )}
                          Test
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteAgent.mutateAsync(agent.id)} disabled={deleteAgent.isPending}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
