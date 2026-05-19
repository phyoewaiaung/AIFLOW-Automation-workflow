'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { integrations as integrationsApi } from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, MessageSquare, Globe, Puzzle, Plug, Loader2 } from 'lucide-react';

const INTEGRATION_META: Record<string, { name: string; icon: any }> = {
  GMAIL: { name: 'Gmail', icon: Mail },
  SLACK: { name: 'Slack', icon: MessageSquare },
  TELEGRAM: { name: 'Telegram', icon: MessageSquare },
  DISCORD: { name: 'Discord', icon: MessageSquare },
  NOTION: { name: 'Notion', icon: Globe },
  GOOGLE_SHEETS: { name: 'Google Sheets', icon: Globe },
  HTTP_API: { name: 'HTTP API', icon: Plug },
  WEBHOOK: { name: 'Webhook', icon: Puzzle },
};

export default function IntegrationsPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    integrationsApi.list(orgId).then((data) => {
      setIntegrations(data);
    }).catch(() => {
      setIntegrations([]);
    }).finally(() => {
      setLoading(false);
    });
  }, [orgId]);

  const handleConnect = async (type: string) => {
    setConnecting(type);
    try {
      const existing = integrations.find((i) => i.type === type);
      if (existing) {
        await integrationsApi.update(existing.id, { type });
      } else {
        const created = await integrationsApi.create({
          type,
          name: INTEGRATION_META[type]?.name || type,
          organizationId: orgId,
        });
        setIntegrations((prev) => [...prev, created]);
      }
    } catch (err: any) {
      console.error('Failed to connect integration:', err);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await integrationsApi.delete(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      console.error('Failed to disconnect integration:', err);
    }
  };

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const integrationTypes = Object.entries(INTEGRATION_META).map(([type, meta]) => {
    const connected = integrations.find((i) => i.type === type);
    const Icon = meta.icon;
    return { type, name: meta.name, icon: Icon, connected: !!connected, id: connected?.id };
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pt-14 md:pl-64">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Integrations</h1>
              <p className="text-muted-foreground mt-1">Connect your favorite apps and services</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationTypes.map((integration) => (
                <Card key={integration.type} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <integration.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{integration.name}</h3>
                          <Badge variant={integration.connected ? 'success' : 'secondary'}>
                            {integration.connected ? 'Connected' : 'Not connected'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={integration.connected ? 'outline' : 'default'}
                      className="w-full"
                      onClick={() =>
                        integration.connected
                          ? handleDisconnect(integration.id)
                          : handleConnect(integration.type)
                      }
                      disabled={connecting === integration.type}
                    >
                      {connecting === integration.type ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {integration.connected ? 'Disconnect' : 'Connect'}
                    </Button>
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