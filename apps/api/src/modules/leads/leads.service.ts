import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { OpenAI } from 'openai';
import * as nodemailer from 'nodemailer';
import { config } from '@autoflow/configs';
import { PrismaService } from '../../prisma.service';

type LeadInput = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  message?: string;
  source?: string;
  workflowId?: string;
  executionId?: string;
};

type LeadContactUpdate = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
};

type LeadDraftUpdate = {
  generatedEmail?: string;
};

type QualificationResult = {
  score: number;
  status: LeadStatus;
  qualification: string;
  aiSummary: string;
  suggestedAction: string;
  generatedEmail: string;
};

@Injectable()
export class LeadsService {
  private openai: OpenAI | null = null;
  private groq: OpenAI | null = null;

  constructor(private prisma: PrismaService) {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
      this.groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }
  }

  private async checkAccess(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return membership;
  }

  async findAll(organizationId: string, userId: string, status?: LeadStatus) {
    await this.checkAccess(organizationId, userId);

    return this.prisma.lead.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        workflow: { select: { id: true, name: true } },
        execution: { select: { id: true, status: true } },
      },
    });
  }

  async findById(id: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true } },
        execution: { select: { id: true, status: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.checkAccess(lead.organizationId, userId);
    return lead;
  }

  async create(organizationId: string, userId: string, data: LeadInput) {
    await this.checkAccess(organizationId, userId);
    return this.createForOrganization(organizationId, data);
  }

  async createFromWebhook(organizationId: string, data: LeadInput) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.createForOrganization(organizationId, {
      ...data,
      source: data.source || 'Website form',
    });
  }

  async sendEmail(id: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.checkAccess(lead.organizationId, userId);

    if (!lead.email) {
      throw new BadRequestException('Lead does not have an email address');
    }

    if (!lead.generatedEmail) {
      throw new BadRequestException('Lead does not have a generated email draft');
    }

    const emailConfig = await this.getEmailConfig(lead.organizationId);
    const subject = `Re: ${lead.company ? `${lead.company} inquiry` : 'Your inquiry'}`;

    if (!emailConfig) {
      throw new BadRequestException('SMTP email is not configured');
    }

    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.port === 465,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });

    await transporter.sendMail({
      from: emailConfig.from,
      to: lead.email,
      subject,
      text: lead.generatedEmail,
    });

    const updatedLead = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.CONTACTED,
        emailSentAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: {
        workflow: { select: { id: true, name: true } },
        execution: { select: { id: true, status: true } },
      },
    });

    await this.notifyEmailSent(updatedLead);

    return {
      ...updatedLead,
      emailSubject: subject,
    };
  }

  async updateContact(id: string, userId: string, data: LeadContactUpdate) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.checkAccess(lead.organizationId, userId);

    return this.prisma.lead.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        website: data.website,
        lastActivityAt: new Date(),
      },
      include: {
        workflow: { select: { id: true, name: true } },
        execution: { select: { id: true, status: true } },
      },
    });
  }

  async updateDraft(id: string, userId: string, data: LeadDraftUpdate) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.checkAccess(lead.organizationId, userId);

    if (!data.generatedEmail?.trim()) {
      throw new BadRequestException('Generated email cannot be empty');
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        generatedEmail: data.generatedEmail,
        lastActivityAt: new Date(),
      },
      include: {
        workflow: { select: { id: true, name: true } },
        execution: { select: { id: true, status: true } },
      },
    });
  }

  async getSetupStatus(organizationId: string, userId: string) {
    await this.checkAccess(organizationId, userId);

    const integrations = await this.prisma.integration.findMany({
      where: { organizationId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    const gmail = integrations.find((integration) => integration.type === 'GMAIL');
    const slack = integrations.find((integration) => integration.type === 'SLACK');
    const gmailConfig = gmail?.config as Record<string, string> | undefined;
    const slackConfig = slack?.config as Record<string, string> | undefined;
    const systemSmtpReady = Boolean(config.email.host && config.email.user && config.email.pass);
    const gmailReady = Boolean(
      systemSmtpReady ||
      (gmailConfig?.smtpHost && gmailConfig?.smtpUser && gmailConfig?.smtpPass)
    );

    return {
      webhookUrl: `${config.web.apiUrl}/api/leads/webhook/${organizationId}`,
      email: {
        ready: gmailReady,
        mode: gmailConfig?.smtpUser ? 'integration' : systemSmtpReady ? 'system' : 'missing',
        from: gmailConfig?.smtpFrom || gmailConfig?.smtpUser || config.email.from || config.email.user || null,
      },
      slack: {
        ready: Boolean(slackConfig?.botToken),
        channel: slackConfig?.defaultChannel || null,
      },
    };
  }

  private async createForOrganization(organizationId: string, data: LeadInput) {
    const qualification = await this.qualifyLead(data);

    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        workflowId: data.workflowId,
        executionId: data.executionId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        website: data.website,
        message: data.message,
        source: data.source || 'Manual',
        score: qualification.score,
        status: qualification.status,
        qualification: qualification.qualification,
        aiSummary: qualification.aiSummary,
        suggestedAction: qualification.suggestedAction,
        generatedEmail: qualification.generatedEmail,
        lastActivityAt: new Date(),
      },
    });

    await this.notifyOrganizationUsers(lead);
    await this.sendSlackNotification(lead);

    return lead;
  }

  private async qualifyLead(data: LeadInput): Promise<QualificationResult> {
    const client = this.groq || this.openai;

    if (!client) {
      return this.fallbackQualification(data);
    }

    try {
      const completion = await client.chat.completions.create({
        model: this.groq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You qualify inbound sales leads for AutoFlow AI customers. Return only JSON with score, status, qualification, aiSummary, suggestedAction, generatedEmail. status must be one of NEW, QUALIFIED, CONTACTED, RESPONDED, DISQUALIFIED.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              lead: data,
              scoringGuidance:
                'High scores go to leads with business email, company, clear urgency, budget, demo/pricing intent, or automation/sales pain. Low scores go to spam, vague messages, personal emails with no business context, or irrelevant requests.',
            }),
          },
        ],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return this.normalizeQualification(parsed, data);
    } catch {
      return this.fallbackQualification(data);
    }
  }

  private normalizeQualification(result: any, data: LeadInput): QualificationResult {
    const score = Math.max(0, Math.min(100, Number(result.score) || 50));
    const status = this.statusFromScore(score, result.status);

    return {
      score,
      status,
      qualification: String(result.qualification || this.qualificationLabel(score)),
      aiSummary: String(result.aiSummary || this.summaryFor(data)),
      suggestedAction: String(result.suggestedAction || this.suggestedActionFor(score)),
      generatedEmail: String(result.generatedEmail || this.emailFor(data)),
    };
  }

  private fallbackQualification(data: LeadInput): QualificationResult {
    const message = `${data.message || ''} ${data.company || ''} ${data.website || ''}`.toLowerCase();
    let score = 45;

    if (data.email && !data.email.match(/@(gmail|yahoo|hotmail|outlook)\./i)) score += 15;
    if (data.company) score += 15;
    if (data.website) score += 10;
    if (message.match(/demo|pricing|quote|proposal|urgent|sales|automation|crm|lead/)) score += 20;
    if (message.length > 120) score += 5;

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      status: this.statusFromScore(score),
      qualification: this.qualificationLabel(score),
      aiSummary: this.summaryFor(data),
      suggestedAction: this.suggestedActionFor(score),
      generatedEmail: this.emailFor(data),
    };
  }

  private statusFromScore(score: number, requested?: string): LeadStatus {
    if (requested && Object.values(LeadStatus).includes(requested as LeadStatus)) {
      return requested as LeadStatus;
    }

    if (score >= 70) return LeadStatus.QUALIFIED;
    if (score <= 25) return LeadStatus.DISQUALIFIED;
    return LeadStatus.NEW;
  }

  private qualificationLabel(score: number) {
    if (score >= 80) return 'Hot lead';
    if (score >= 60) return 'Warm lead';
    if (score >= 35) return 'Needs review';
    return 'Low-fit lead';
  }

  private summaryFor(data: LeadInput) {
    const who = data.name || data.email || 'A new lead';
    const company = data.company ? ` from ${data.company}` : '';
    const message = data.message ? ` Message: ${data.message}` : '';
    return `${who}${company} submitted an inbound inquiry.${message}`.slice(0, 500);
  }

  private suggestedActionFor(score: number) {
    if (score >= 80) return 'Reply immediately, notify sales, and offer a call today.';
    if (score >= 60) return 'Send a personalized reply and ask one qualifying question.';
    if (score >= 35) return 'Review manually before assigning sales time.';
    return 'Mark low priority unless more context is provided.';
  }

  private emailFor(data: LeadInput) {
    const name = data.name?.split(' ')[0] || 'there';
    const companyLine = data.company ? ` I saw you are reaching out from ${data.company}.` : '';
    const messageLine = data.message
      ? ` Your note about "${data.message.slice(0, 120)}" sounds like something we can help with.`
      : ' Thanks for reaching out.';

    return `Hi ${name},\n\nThanks for reaching out.${companyLine}${messageLine}\n\nA good next step would be a quick call so we can understand your current lead follow-up process and where prospects are slipping through.\n\nAre you available for a short call this week?\n\nBest,\nSales Team`;
  }

  private async notifyOrganizationUsers(lead: any) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: lead.organizationId },
      select: { userId: true },
    });

    const title = lead.score >= 70 ? 'New qualified lead' : 'New lead captured';
    const message = `${lead.name || lead.email || 'New lead'}${lead.company ? ` from ${lead.company}` : ''} scored ${lead.score}/100. ${lead.suggestedAction}`;

    await Promise.all(
      memberships.map((membership) =>
        this.prisma.notification.create({
          data: {
            userId: membership.userId,
            organizationId: lead.organizationId,
            title,
            message,
            type: lead.score >= 70 ? 'SUCCESS' : 'INFO',
            link: `/leads/${lead.id}`,
          },
        })
      )
    );
  }

  private async notifyEmailSent(lead: any) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: lead.organizationId },
      select: { userId: true },
    });

    await Promise.all(
      memberships.map((membership) =>
        this.prisma.notification.create({
          data: {
            userId: membership.userId,
            organizationId: lead.organizationId,
            title: 'Follow-up email sent',
            message: `Email sent to ${lead.name || lead.email || 'lead'}${lead.company ? ` from ${lead.company}` : ''}.`,
            type: 'SUCCESS',
            link: `/leads/${lead.id}`,
          },
        })
      )
    );
  }

  private async sendSlackNotification(lead: any) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        organizationId: lead.organizationId,
        type: 'SLACK',
        active: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const config = integration?.config as Record<string, string> | undefined;
    const botToken = config?.botToken;
    const channel = config?.defaultChannel || '#general';

    if (!botToken) {
      return;
    }

    try {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          text: `New lead: ${lead.name || lead.email || 'Unknown'} scored ${lead.score}/100`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*New ${lead.score >= 70 ? 'qualified ' : ''}lead*\n*Name:* ${lead.name || 'Unknown'}\n*Company:* ${lead.company || 'Unknown'}\n*Score:* ${lead.score}/100\n*Summary:* ${lead.aiSummary}\n*Next action:* ${lead.suggestedAction}`,
              },
            },
          ],
        }),
      });
    } catch {
      return;
    }
  }

  private async getEmailConfig(organizationId: string) {
    const gmailIntegration = await this.prisma.integration.findFirst({
      where: { organizationId, type: 'GMAIL', active: true },
      orderBy: { createdAt: 'desc' },
    });

    const smtpConfig = gmailIntegration?.config as Record<string, string> | undefined;

    if (smtpConfig?.smtpHost && smtpConfig?.smtpUser && smtpConfig?.smtpPass) {
      return {
        host: smtpConfig.smtpHost,
        port: parseInt(smtpConfig.smtpPort || '587', 10),
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass,
        from: smtpConfig.smtpFrom || smtpConfig.smtpUser,
      };
    }

    if (config.email.host && config.email.user && config.email.pass) {
      return {
        host: config.email.host,
        port: config.email.port,
        user: config.email.user,
        pass: config.email.pass,
        from: config.email.from || config.email.user,
      };
    }

    return null;
  }
}
