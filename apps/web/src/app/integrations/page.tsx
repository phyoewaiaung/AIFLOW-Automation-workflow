'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { integrations as integrationsApi } from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mail, MessageSquare, Globe, Plug, Loader2,
  Settings2, Gamepad2, Bot, CheckCircle2,
} from 'lucide-react';
import { IntegrationConfigDialog } from '@/components/integrations/integration-config-dialog';

interface IntegrationMeta {
  name: string;
  icon: any;
  description: string;
  color: string;
  bgColor: string;
  implemented: boolean;
}

const INTEGRATION_META: Record<string, IntegrationMeta> = {
  SLACK: {
    name: 'Slack', icon: MessageSquare,
    description: 'Send messages to channels',
    color: 'text-pink-400', bgColor: 'bg-pink-500/10',
    implemented: true,
  },
  DISCORD: {
    name: 'Discord', icon: Gamepad2,
    description: 'Post messages to your server',
    color: 'text-indigo-400', bgColor: 'bg-indigo-500/10',
    implemented: true,
  },
  TELEGRAM: {
    name: 'Telegram', icon: Bot,
    description: 'Send bot notifications',
    color: 'text-sky-400', bgColor: 'bg-sky-500/10',
    implemented: false,
  },
  GMAIL: {
    name: 'Gmail', icon: Mail,
    description: 'Send emails via SMTP',
    color: 'text-red-400', bgColor: 'bg-red-500/10',
    implemented: true,
  },
  NOTION: {
    name: 'Notion', icon: Globe,
    description: 'Create and update pages',
    color: 'text-foreground', bgColor: 'bg-muted',
    implemented: false,
  },
  GOOGLE_SHEETS: {
    name: 'Google Sheets', icon: Globe,
    description: 'Read and write spreadsheets',
    color: 'text-green-400', bgColor: 'bg-green-500/10',
    implemented: false,
  },
  HTTP_API: {
    name: 'HTTP API', icon: Plug,
    description: 'Custom HTTP requests',
    color: 'text-orange-400', bgColor: 'bg-orange-500/10',
    implemented: false,
  },
};

function ConfigSummary({ integration }: { integration: any }) {
  const config = integration.config || {};
  if (config.botToken) {
    return <span className="truncate">{config.botToken.slice(0, 12)}...{config.botToken.slice(-4)}</span>;
  }
  if (config.smtpUser) {
    return <span className="truncate">{config.smtpUser}</span>;
  }
  if (Object.keys(config).length === 0) {
    return <span className="text-green-500">Using system defaults</span>;
  }
  return <span className="italic text-muted-foreground">Not configured</span>;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [configDialog, setConfigDialog] = useState<{ type: string; integration: any } | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    integrationsApi.list(orgId).then(setIntegrations).catch(() => setIntegrations([])).finally(() => setLoading(false));
  }, [orgId]);

  const ensureIntegration = async (type: string) => {
    const existing = integrations.find((i) => i.type === type);
    if (existing) return existing;
    const created = await integrationsApi.create({ type, name: INTEGRATION_META[type]?.name || type, organizationId: orgId });
    setIntegrations((prev) => [...prev, created]);
    return created;
  };

  const handleConnect = async (type: string) => {
    const meta = INTEGRATION_META[type];
    if (!meta?.implemented) return;
    const integration = await ensureIntegration(type);
    setConfigDialog({ type, integration });
  };

  const handleSaveConfig = async (config: Record<string, string>) => {
    if (!configDialog) return;
    await integrationsApi.update(configDialog.integration.id, { config });
    setIntegrations((prev) => prev.map((i) => i.id === configDialog.integration.id ? { ...i, config } : i));
  };

  const handleDisconnect = async (id: string) => {
    await integrationsApi.delete(id);
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
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
        <div className="p-4 md:p-6 max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Connect your apps and services</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-20 bg-muted rounded" />
                      <div className="h-3 w-28 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-full bg-muted rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(INTEGRATION_META).map(([type, meta]) => {
                const integration = integrations.find((i) => i.type === type);
                const connected = !!integration;
                const Icon = meta.icon;

                return (
                  <Card key={type} className={`border transition-all duration-150 ${connected ? 'hover:border-primary/40' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-lg ${meta.bgColor} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-sm">{meta.name}</h3>
                              {connected && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">{meta.description}</p>
                          </div>
                        </div>
                      </div>

                      {connected && meta.implemented && (
                        <div className="px-2.5 py-1.5 bg-muted/50 rounded-lg flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Token</span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            <ConfigSummary integration={integration} />
                          </span>
                        </div>
                      )}

                      <div className="flex gap-1.5">
                        {meta.implemented ? (
                          connected ? (
                            <>
                              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setConfigDialog({ type, integration })}>
                                <Settings2 className="w-3 h-3 mr-1.5" />
                                Configure
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleDisconnect(integration.id)}>
                                Remove
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" className="w-full h-8 text-xs" onClick={() => handleConnect(type)} disabled={connecting === type}>
                              {connecting === type ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : null}
                              Connect
                            </Button>
                          )
                        ) : (
                          <Button variant="secondary" size="sm" className="w-full h-8 text-xs text-muted-foreground cursor-default" disabled>
                            Coming soon
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <IntegrationConfigDialog
        open={!!configDialog}
        type={configDialog?.type || ''}
        name={configDialog ? (INTEGRATION_META[configDialog.type]?.name || configDialog.type) : ''}
        existingConfig={configDialog?.integration?.config || {}}
        onSave={handleSaveConfig}
        onClose={() => setConfigDialog(null)}
      />
    </div>
  );
}
