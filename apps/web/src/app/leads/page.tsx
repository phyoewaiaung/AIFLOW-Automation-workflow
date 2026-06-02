'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useCreateLead, useLeads } from '@/hooks/use-api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Plus, Settings2, Sparkles, UserRound } from 'lucide-react';

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'QUALIFIED':
      return <Badge variant="success">Qualified</Badge>;
    case 'CONTACTED':
      return <Badge variant="info">Contacted</Badge>;
    case 'DISQUALIFIED':
      return <Badge variant="secondary">Disqualified</Badge>;
    case 'RESPONDED':
      return <Badge variant="warning">Responded</Badge>;
    default:
      return <Badge variant="outline">New</Badge>;
  }
}

function scoreColor(score?: number) {
  if (!score && score !== 0) return 'text-muted-foreground';
  if (score >= 75) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-muted-foreground';
}

function formatTimeAgo(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function LeadsPage() {
  const router = useRouter();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const orgId = organization?.id || '';
  const [status, setStatus] = useState('');
  const [testLead, setTestLead] = useState({
    name: '',
    email: '',
    company: '',
    website: '',
    message: '',
  });
  const { data: leads = [], isLoading: leadsLoading } = useLeads(orgId, status || undefined);
  const createLead = useCreateLead();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const stats = useMemo(() => {
    const total = leads.length;
    const qualified = leads.filter((lead: any) => lead.status === 'QUALIFIED').length;
    const contacted = leads.filter((lead: any) => !!lead.emailSentAt || lead.status === 'CONTACTED').length;
    const avgScore = total
      ? Math.round(leads.reduce((sum: number, lead: any) => sum + (lead.score || 0), 0) / total)
      : 0;

    return { total, qualified, contacted, avgScore };
  }, [leads]);

  const createSampleLead = async () => {
    await createLead.mutateAsync({
      organizationId: orgId,
      name: 'Sarah Chen',
      email: 'sarah@acmemarketing.com',
      company: 'Acme Marketing',
      website: 'https://acmemarketing.com',
      source: 'Demo website form',
      message:
        'We are losing inbound leads because our team replies too slowly. Can you show us pricing and how fast this could be set up?',
    });
  };

  const submitTestLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lead = await createLead.mutateAsync({
      organizationId: orgId,
      ...testLead,
      source: 'Test lead form',
    });

    setTestLead({
      name: '',
      email: '',
      company: '',
      website: '',
      message: '',
    });
    router.push(`/leads/${lead.id}`);
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Leads</h1>
              <p className="text-muted-foreground mt-1">
                Capture, qualify, and follow up with inbound sales leads.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push('/leads/setup')}>
                <Settings2 className="w-4 h-4 mr-2" />
                Setup
              </Button>
              <Button onClick={createSampleLead} disabled={!orgId || createLead.isPending}>
                {createLead.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Sample Lead
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Qualified</p>
                <p className="text-3xl font-bold mt-1 text-green-500">{stats.qualified}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Contacted</p>
                <p className="text-3xl font-bold mt-1">{stats.contacted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-3xl font-bold mt-1">{stats.avgScore}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                size="sm"
                variant={status === filter.value ? 'default' : 'outline'}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Lead Capture</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitTestLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name</label>
                    <input
                      value={testLead.name}
                      onChange={(event) => setTestLead((lead) => ({ ...lead, name: event.target.value }))}
                      placeholder="Sarah Chen"
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={testLead.email}
                      onChange={(event) => setTestLead((lead) => ({ ...lead, email: event.target.value }))}
                      placeholder="sarah@company.com"
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Company</label>
                    <input
                      value={testLead.company}
                      onChange={(event) => setTestLead((lead) => ({ ...lead, company: event.target.value }))}
                      placeholder="Acme Marketing"
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Website</label>
                    <input
                      value={testLead.website}
                      onChange={(event) => setTestLead((lead) => ({ ...lead, website: event.target.value }))}
                      placeholder="https://company.com"
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    value={testLead.message}
                    onChange={(event) => setTestLead((lead) => ({ ...lead, message: event.target.value }))}
                    placeholder="We need pricing for automating inbound lead follow-up."
                    rows={4}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!orgId || createLead.isPending || (!testLead.email && !testLead.message)}
                  >
                    {createLead.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Submit Test Lead
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserRound className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No leads captured yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Create a sample lead or connect a website form to start qualifying inbound prospects.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leads.map((lead: any) => (
                    <button
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="w-full py-4 flex flex-col gap-3 text-left transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0 flex-1 px-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium truncate">{lead.name || lead.email || 'Unknown lead'}</p>
                          {statusBadge(lead.status)}
                          {lead.source ? <Badge variant="secondary">{lead.source}</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {lead.company || 'No company'} {lead.message ? `- ${lead.message}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 px-1 md:justify-end">
                        <div className="text-right">
                          <p className={`text-xl font-bold ${scoreColor(lead.score)}`}>{lead.score ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">score</p>
                        </div>
                        <div className="hidden md:block text-right min-w-28">
                          <p className="text-sm text-muted-foreground">{formatTimeAgo(lead.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">{lead.emailSentAt ? 'Email sent' : 'Draft ready'}</p>
                        </div>
                        {lead.generatedEmail ? <Mail className="w-4 h-4 text-muted-foreground" /> : <Sparkles className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
