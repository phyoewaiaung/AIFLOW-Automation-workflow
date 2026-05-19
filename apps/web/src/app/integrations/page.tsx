'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, MessageSquare, Globe, Puzzle } from 'lucide-react';

export default function IntegrationsPage() {
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

  const integrations = [
    { name: 'Gmail', type: 'GMAIL', connected: true, icon: Mail },
    { name: 'Slack', type: 'SLACK', connected: true, icon: MessageSquare },
    { name: 'Telegram', type: 'TELEGRAM', connected: false, icon: MessageSquare },
    { name: 'Discord', type: 'DISCORD', connected: false, icon: MessageSquare },
    { name: 'Notion', type: 'NOTION', connected: true, icon: Globe },
    { name: 'Google Sheets', type: 'GOOGLE_SHEETS', connected: false, icon: Globe },
  ];

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
            <Button><Plus className="w-4 h-4 mr-2" />Custom Integration</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
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
                  <Button variant={integration.connected ? 'outline' : 'default'} className="w-full">
                    {integration.connected ? 'Configure' : 'Connect'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}