'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useLead, useSendLeadEmail, useUpdateLeadContact, useUpdateLeadDraft } from '@/hooks/use-api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, CheckCircle2, ExternalLink, Loader2, Mail, Pencil, Phone, Save, Send, Sparkles } from 'lucide-react';

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

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isLoading, token, checkAuth, organization } = useAuthStore();
  const { data: lead, isLoading: leadLoading } = useLead(params.id);
  const sendLeadEmail = useSendLeadEmail();
  const updateLeadContact = useUpdateLeadContact();
  const updateLeadDraft = useUpdateLeadDraft();
  const [editingContact, setEditingContact] = useState(false);
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftEmail, setDraftEmail] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: '',
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!lead) return;
    setDraftEmail(lead.generatedEmail || '');
    setContactForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      website: lead.website || '',
    });
  }, [lead]);

  const saveContact = async () => {
    if (!lead) return;
    await updateLeadContact.mutateAsync({
      id: lead.id,
      data: contactForm,
    });
    setEditingContact(false);
  };

  const saveDraft = async () => {
    if (!lead) return;
    await updateLeadDraft.mutateAsync({
      id: lead.id,
      generatedEmail: draftEmail,
    });
    setEditingDraft(false);
  };

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const webhookUrl = organization?.id
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/leads/webhook/${organization.id}`
    : '';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pt-14 md:pl-64">
        <div className="p-4 md:p-6 space-y-6">
          <Button variant="ghost" onClick={() => router.push('/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>

          {leadLoading || !lead ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold">{lead.name || lead.email || 'Unknown lead'}</h1>
                    {statusBadge(lead.status)}
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {lead.company || 'No company'} {lead.source ? `from ${lead.source}` : ''}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className={`text-4xl font-bold ${scoreColor(lead.score)}`}>{lead.score ?? '-'}</p>
                  <p className="text-sm text-muted-foreground">lead score</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        AI Qualification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Summary</p>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{lead.aiSummary || 'No summary yet.'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Qualification</p>
                        <p className="text-sm text-muted-foreground mt-1">{lead.qualification || 'Not qualified yet.'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Suggested Action</p>
                        <p className="text-sm text-muted-foreground mt-1">{lead.suggestedAction || 'Review manually.'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Original Message</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {lead.message || 'No message provided.'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <CardTitle>Generated Email</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {editingDraft ? (
                            <>
                              <Button
                                size="sm"
                                onClick={saveDraft}
                                disabled={updateLeadDraft.isPending || !draftEmail.trim()}
                              >
                                {updateLeadDraft.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Draft
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setDraftEmail(lead.generatedEmail || '');
                                  setEditingDraft(false);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingDraft(true)}
                              disabled={!!lead.emailSentAt}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Draft
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => sendLeadEmail.mutate(lead.id)}
                            disabled={sendLeadEmail.isPending || editingDraft || !lead.email || !lead.generatedEmail || !!lead.emailSentAt}
                          >
                            {sendLeadEmail.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : lead.emailSentAt ? (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            {lead.emailSentAt ? 'Email Sent' : 'Send Email'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editingDraft ? (
                        <textarea
                          value={draftEmail}
                          onChange={(event) => setDraftEmail(event.target.value)}
                          rows={12}
                          className="w-full rounded-md border border-border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm font-sans text-muted-foreground">
                          {lead.generatedEmail || 'No draft generated yet.'}
                        </pre>
                      )}
                      {lead.emailSentAt ? (
                        <p className="text-sm text-muted-foreground mt-3">
                          Sent to {lead.email} on {new Date(lead.emailSentAt).toLocaleString()}.
                        </p>
                      ) : null}
                      {!lead.email ? (
                        <p className="text-sm text-destructive mt-3">
                          Add an email address to this lead before sending.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle>Contact</CardTitle>
                        {editingContact ? (
                          <Button size="sm" onClick={saveContact} disabled={updateLeadContact.isPending}>
                            {updateLeadContact.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setEditingContact(true)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editingContact ? (
                        <div className="space-y-3">
                          {[
                            ['name', 'Name', 'Sarah Chen'],
                            ['email', 'Email', 'sarah@company.com'],
                            ['phone', 'Phone', '+1 555 0100'],
                            ['company', 'Company', 'Acme Marketing'],
                            ['website', 'Website', 'https://company.com'],
                          ].map(([key, label, placeholder]) => (
                            <div key={key} className="space-y-1.5">
                              <label className="text-sm font-medium">{label}</label>
                              <input
                                value={contactForm[key as keyof typeof contactForm]}
                                onChange={(event) =>
                                  setContactForm((form) => ({ ...form, [key]: event.target.value }))
                                }
                                placeholder={placeholder}
                                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingContact(false);
                              setContactForm({
                                name: lead.name || '',
                                email: lead.email || '',
                                phone: lead.phone || '',
                                company: lead.company || '',
                                website: lead.website || '',
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          {lead.email ? (
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              {lead.email}
                            </a>
                          ) : null}
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              {lead.phone}
                            </a>
                          ) : null}
                          {lead.company ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              {lead.company}
                            </div>
                          ) : null}
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              {lead.website}
                            </a>
                          ) : null}
                          {!lead.email && !lead.phone && !lead.company && !lead.website ? (
                            <p className="text-sm text-muted-foreground">No contact details yet.</p>
                          ) : null}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Webhook Setup</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Send website form submissions to this endpoint to create and qualify leads automatically.
                      </p>
                      <code className="block rounded-md bg-muted p-3 text-xs break-all">{webhookUrl}</code>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Automation Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {lead.workflow ? (
                        <button onClick={() => router.push(`/workflows/${lead.workflow.id}`)} className="block text-primary hover:underline">
                          Workflow: {lead.workflow.name}
                        </button>
                      ) : (
                        <p className="text-muted-foreground">No workflow linked yet.</p>
                      )}
                      {lead.execution ? (
                        <button onClick={() => router.push(`/executions/${lead.execution.id}`)} className="block text-primary hover:underline">
                          Execution: {lead.execution.status}
                        </button>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
