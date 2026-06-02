'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useLeadSetupStatus, useTestLeadWebhook } from '@/hooks/use-api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Webhook,
  XCircle,
} from 'lucide-react';

function SetupStatus({ ready, label, detail }: { ready: boolean; label: string; detail?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
      <div className="flex items-start gap-3">
        {ready ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
        )}
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground mt-1">{detail || 'Not configured yet'}</p>
        </div>
      </div>
      <Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Ready' : 'Missing'}</Badge>
    </div>
  );
}

export default function LeadSetupPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';
  const { data: setupStatus, isLoading: setupLoading } = useLeadSetupStatus(orgId);
  const testWebhook = useTestLeadWebhook();
  const [copied, setCopied] = useState(false);
  const [testLead, setTestLead] = useState({
    name: 'Demo Prospect',
    email: 'prospect@example.com',
    company: 'Example Co',
    website: 'https://example.com',
    message: 'We want pricing for automating inbound lead follow-up.',
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const webhookUrl = setupStatus?.webhookUrl || '';

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submitTest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await testWebhook.mutateAsync({
      organizationId: orgId,
      data: {
        ...testLead,
        source: 'Setup test webhook',
      },
    });
    router.push(`/leads/${result.leadId}`);
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
        <div className="p-4 md:p-6 space-y-6 max-w-6xl">
          <Button variant="ghost" onClick={() => router.push('/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Lead Automation Setup</h1>
            <p className="text-muted-foreground">
              Connect a website form, send a test lead, and verify follow-up channels.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-primary" />
                    Webhook URL
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {setupLoading ? (
                    <div className="h-16 rounded-md bg-muted animate-pulse" />
                  ) : (
                    <>
                      <code className="block rounded-md bg-muted p-4 text-sm break-all">{webhookUrl}</code>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={copyWebhook} disabled={!webhookUrl}>
                          <Clipboard className="w-4 h-4 mr-2" />
                          {copied ? 'Copied' : 'Copy URL'}
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/integrations')}>
                          Configure Integrations
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" />
                    Send Test Lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitTest} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        ['name', 'Name', 'Demo Prospect'],
                        ['email', 'Email', 'prospect@example.com'],
                        ['company', 'Company', 'Example Co'],
                        ['website', 'Website', 'https://example.com'],
                      ].map(([key, label, placeholder]) => (
                        <div key={key} className="space-y-1.5">
                          <label className="text-sm font-medium">{label}</label>
                          <input
                            value={testLead[key as keyof typeof testLead]}
                            onChange={(event) => setTestLead((lead) => ({ ...lead, [key]: event.target.value }))}
                            placeholder={placeholder}
                            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Message</label>
                      <textarea
                        value={testLead.message}
                        onChange={(event) => setTestLead((lead) => ({ ...lead, message: event.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button disabled={!orgId || testWebhook.isPending || (!testLead.email && !testLead.message)}>
                        {testWebhook.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send Test Lead
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Readiness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {setupLoading ? (
                    <div className="space-y-3">
                      <div className="h-20 rounded-md bg-muted animate-pulse" />
                      <div className="h-20 rounded-md bg-muted animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <SetupStatus
                        ready={!!setupStatus?.email?.ready}
                        label="Email Sender"
                        detail={
                          setupStatus?.email?.ready
                            ? `${setupStatus.email.mode === 'system' ? 'System SMTP' : 'Gmail integration'}: ${setupStatus.email.from}`
                            : 'Connect Gmail or configure SMTP before sending follow-ups.'
                        }
                      />
                      <SetupStatus
                        ready={!!setupStatus?.slack?.ready}
                        label="Slack Notifications"
                        detail={
                          setupStatus?.slack?.ready
                            ? `Default channel: ${setupStatus.slack.channel || '#general'}`
                            : 'Optional. Connect Slack for sales team alerts.'
                        }
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expected Payload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
{`{
  "name": "Sarah Chen",
  "email": "sarah@company.com",
  "company": "Acme Marketing",
  "website": "https://company.com",
  "message": "We need pricing.",
  "source": "Website form"
}`}
                  </pre>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email is needed before follow-up can be sent.
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message gives the AI better context for scoring and drafting.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
