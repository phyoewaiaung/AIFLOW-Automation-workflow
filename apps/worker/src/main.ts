import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { Worker, Job } from 'bullmq';
import { config } from '@autoflow/configs';
import OpenAI from 'openai';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/autoflow',
    },
  },
});

const publisher = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
});

function publishRedis(channel: string, data: Record<string, unknown>) {
  publisher.publish(channel, JSON.stringify({ ...data, timestamp: new Date().toISOString() }))
    .catch((err) => console.error('Redis publish error:', err));
}

function publishExecutionEvent(executionId: string, event: string, data: Record<string, unknown>) {
  publisher.publish(
    `autoflow:execution:${executionId}:${event}`,
    JSON.stringify({ executionId, ...data, timestamp: new Date().toISOString() })
  ).catch((err) => console.error('Redis publish error:', err));
}

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

let groq: OpenAI | null = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
  groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
}

const emailTransporter = config.email.host
  ? nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    })
  : null;

interface WorkflowExecutionJob {
  executionId: string;
  workflowId: string;
}

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

async function executeWorkflow(job: Job<WorkflowExecutionJob>) {
  const { executionId, workflowId } = job.data;
  console.log(`Processing execution ${executionId} for workflow ${workflowId}`);

  let wf: any = null;
  try {
    const existing = await prisma.execution.findUnique({ where: { id: executionId } });
    if (existing?.status === 'CANCELLED') {
      console.log(`Execution ${executionId} was cancelled, skipping`);
      return;
    }

    wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!wf?.active) {
      console.log(`Workflow ${workflowId} is not active, skipping execution ${executionId}`);
      await prisma.execution.update({
        where: { id: executionId },
        data: { status: 'CANCELLED', error: 'Workflow deactivated', completedAt: new Date() },
      });
      publishExecutionEvent(executionId, 'status', { status: 'CANCELLED', error: 'Workflow deactivated' });
      return;
    }

    await prisma.execution.update({
      where: { id: executionId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    publishExecutionEvent(executionId, 'status', { status: 'RUNNING', message: 'Execution started' });

    await prisma.executionLog.create({
      data: {
        executionId,
        level: 'INFO',
        message: 'Execution started',
      },
    });

    publishExecutionEvent(executionId, 'log', { level: 'INFO', message: 'Execution started' });

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: true,
        edges: true,
      },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const nodes = workflow.nodes;
    const edges = workflow.edges;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const executionData: Record<string, any> = {};

    const getOutgoingEdges = (nodeId: string) =>
      edges.filter((e) => e.sourceId === nodeId);

    const getIncomingEdges = (nodeId: string) =>
      edges.filter((e) => e.targetId === nodeId);

    const sortedNodes = sortNodes(nodes, edges);

    for (const node of sortedNodes) {
      await new Promise((r) => setTimeout(r, 1200));

      const startedAt = new Date();
      console.log(`Executing node: ${node.type} - ${node.id}`);

      publishExecutionEvent(executionId, 'log', { level: 'INFO', message: `Executing node: ${node.type}`, nodeId: node.id });

      const startLog = await prisma.executionLog.create({
        data: {
          executionId,
          nodeId: node.id,
          level: 'INFO',
          message: `Executing node: ${node.type}`,
          startedAt,
        },
      });

      try {
        const result = await executeNode(node, executionData, prisma, openai, groq, edges, nodeMap, wf.organizationId);
        executionData[node.id] = result;

        const completedAt = new Date();
        const duration = completedAt.getTime() - startedAt.getTime();

        await prisma.executionLog.create({
          data: {
            executionId,
            nodeId: node.id,
            level: 'INFO',
            message: `Node completed: ${node.type}`,
            data: result,
            startedAt,
            completedAt,
            duration,
          },
        });

        await prisma.executionLog.update({
          where: { id: startLog.id },
          data: { completedAt, duration },
        });

        const logPayload = { level: 'INFO', message: `Node completed: ${node.type}`, nodeId: node.id, data: result, duration };
        publishExecutionEvent(executionId, 'log', logPayload);
        publishExecutionEvent(executionId, 'status', { status: 'RUNNING', nodeId: node.id, message: `Node completed: ${node.type}`, duration });
      } catch (nodeError: any) {
        const completedAt = new Date();
        const duration = completedAt.getTime() - startedAt.getTime();

        await prisma.executionLog.create({
          data: {
            executionId,
            nodeId: node.id,
            level: 'ERROR',
            message: `Node failed: ${nodeError.message}`,
            startedAt,
            completedAt,
            duration,
          },
        });

        await prisma.executionLog.update({
          where: { id: startLog.id },
          data: { completedAt, duration },
        });

        publishExecutionEvent(executionId, 'log', { level: 'ERROR', message: `Node failed: ${nodeError.message}`, nodeId: node.id, duration });

        await prisma.execution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            error: nodeError.message,
            completedAt: new Date(),
          },
        });

        publishExecutionEvent(executionId, 'status', { status: 'FAILED', error: nodeError.message, message: 'Node execution failed' });
        return;
      }
    }

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    });

    await prisma.executionLog.create({
      data: {
        executionId,
        level: 'INFO',
        message: 'Execution completed successfully',
      },
    });

    const notification = await prisma.notification.create({
      data: {
        userId: wf.createdById,
        organizationId: wf.organizationId,
        title: 'Execution completed',
        message: `Workflow "${wf.name}" completed successfully`,
        type: 'SUCCESS',
        link: `/executions/${executionId}`,
      },
    });

    publisher.publish('autoflow:notification', JSON.stringify(notification)).catch(() => {});

    publishExecutionEvent(executionId, 'log', { level: 'INFO', message: 'Execution completed successfully' });
    publishExecutionEvent(executionId, 'complete', { status: 'SUCCESS' });

    console.log(`Execution ${executionId} completed successfully`);
  } catch (error: any) {
    console.error(`Execution ${executionId} failed:`, error);

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        error: error.message,
        completedAt: new Date(),
      },
    });

    await prisma.executionLog.create({
      data: {
        executionId,
        level: 'ERROR',
        message: `Execution failed: ${error.message}`,
      },
    });

    const failNoti = await prisma.notification.create({
      data: {
        userId: wf?.createdById || '',
        organizationId: wf?.organizationId || '',
        title: 'Execution failed',
        message: `Workflow "${wf?.name || 'Unknown'}" failed: ${error.message}`,
        type: 'ERROR',
        link: `/executions/${executionId}`,
      },
    }).catch(() => null);

    if (failNoti) {
      publisher.publish('autoflow:notification', JSON.stringify(failNoti)).catch(() => {});
    }

    publishExecutionEvent(executionId, 'log', { level: 'ERROR', message: `Execution failed: ${error.message}` });
    publishExecutionEvent(executionId, 'complete', { status: 'FAILED', error: error.message });
  }
}

process.on('SIGTERM', async () => {
  await publisher.quit();
  process.exit(0);
});

function sortNodes(nodes: any[], edges: any[]): any[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });

  edges.forEach((e) => {
    inDegree.set(e.targetId, (inDegree.get(e.targetId) || 0) + 1);
    adjacency.get(e.sourceId)?.push(e.targetId);
  });

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0);
  const sorted: any[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    for (const neighbor of adjacency.get(node.id) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
      if (inDegree.get(neighbor) === 0) {
        const neighborNode = nodes.find((n) => n.id === neighbor);
        if (neighborNode) queue.push(neighborNode);
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Workflow contains a cycle - topological sort incomplete');
  }

  return sorted;
}

async function executeNode(
  node: any,
  executionData: Record<string, any>,
  prisma: PrismaClient,
  openai: OpenAI | null,
  groq: OpenAI | null,
  edges?: any[],
  nodeMap?: Map<string, any>,
  organizationId?: string
): Promise<any> {
  const nodeData = node.data as Record<string, any>;

  switch (node.type) {
    case 'trigger-webhook':
      return executionData.trigger || nodeData;

    case 'trigger-schedule':
      return { triggered: true, timestamp: new Date().toISOString() };

    case 'ai-agent': {
      const agentId = nodeData.agentId;
      const input = nodeData.input || executionData.previous?.output;

      if (!agentId) {
        throw new Error('AI agent not configured');
      }

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      const provider = agent.provider || 'openai';
      const client = provider === 'groq' ? groq : openai;

      if (!client) {
        return {
          output: `Mock AI analysis for input:\n${JSON.stringify(input || {}, null, 2)}\n\nKey insights:\n- Lead identified: potential customer\n- Interest level: high\n- Recommended action: follow up via email`,
          agentId,
        };
      }

      const completion = await client.chat.completions.create({
        model: agent.model,
        messages: [
          { role: 'system', content: agent.instructions },
          { role: 'user', content: input },
        ],
      });

      return {
        output: completion.choices[0]?.message?.content || '',
        agentId,
      };
    }

    case 'ai-classify': {
      const prompt = nodeData.prompt;
      const data = nodeData.data || executionData.previous?.output;

      if (!prompt) {
        throw new Error('Classification prompt not configured');
      }

      if (!openai) {
        const classifications = ['high-value', 'medium-value', 'low-value', 'spam'];
        const mockClass = classifications[Math.floor(Math.random() * classifications.length)];
        return { classification: mockClass, confidence: 0.87 };
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: `Classify the following input. ${prompt}` },
          { role: 'user', content: JSON.stringify(data) },
        ],
      });

      return {
        classification: completion.choices[0]?.message?.content || '',
      };
    }

    case 'ai-email-generator': {
      const context = nodeData.context || executionData.previous;
      const recipient = nodeData.recipient || 'customer@example.com';

      if (!openai) {
        return {
          to: recipient,
          subject: 'Thank you for your interest',
          body: `Dear ${context.name || 'Customer'},\n\nThank you for reaching out to us regarding your interest in ${context.product || 'our services'}. We have reviewed your inquiry and would be delighted to schedule a call to discuss how we can help.\n\nBest regards,\nAutoFlow AI Team`,
        };
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate a professional email based on the context provided.',
          },
          { role: 'user', content: JSON.stringify(context) },
        ],
      });

      return {
        to: recipient,
        subject: `Re: ${context.subject || 'Your Inquiry'}`,
        body: completion.choices[0]?.message?.content || '',
      };
    }

    case 'http-request': {
      const url = nodeData.url;
      const method = nodeData.method || 'GET';
      const headers = nodeData.headers || {};
      const body = nodeData.body;

      if (!url) {
        throw new Error('HTTP URL not configured');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json();
      return {
        status: response.status,
        data: responseData,
      };
    }

    case 'send-email': {
      let prevOutput: any = {};
      if (edges && nodeMap) {
        const incoming = edges.find((e) => e.targetId === node.id);
        if (incoming && executionData[incoming.sourceId]) {
          prevOutput = executionData[incoming.sourceId];
        }
      }

      const to = nodeData.to || prevOutput.to || prevOutput.recipient || 'recipient@example.com';
      const subject = nodeData.subject || prevOutput.subject || 'Notification';
      const body = nodeData.body || prevOutput.body || prevOutput.message || prevOutput.output || '';

      let transporter = emailTransporter;
      let fromAddr = config.email.from;

      if (organizationId) {
        try {
          const gmailIntegration = await prisma.integration.findFirst({
            where: { organizationId, type: 'GMAIL', active: true },
          });

          const smtpConfig = gmailIntegration?.config as any;
          if (smtpConfig?.smtpHost && smtpConfig?.smtpUser && smtpConfig?.smtpPass) {
            transporter = nodemailer.createTransport({
              host: smtpConfig.smtpHost,
              port: parseInt(smtpConfig.smtpPort || '587', 10),
              secure: parseInt(smtpConfig.smtpPort || '587', 10) === 465,
              auth: { user: smtpConfig.smtpUser, pass: smtpConfig.smtpPass },
            });
            fromAddr = smtpConfig.smtpFrom || smtpConfig.smtpUser;
          }
        } catch (err: any) {
          console.error('Gmail integration error:', err);
        }
      }

      if (transporter) {
        await transporter.sendMail({ from: fromAddr, to, subject, text: body });
        return { sent: true, to, subject };
      }

      return { sent: true, to, subject, mock: true, body };
    }

    case 'slack-message': {
      let prevOutput: any = {};
      if (edges && nodeMap) {
        const incoming = edges.find((e) => e.targetId === node.id);
        if (incoming && executionData[incoming.sourceId]) {
          prevOutput = executionData[incoming.sourceId];
        }
      }

      const channel = nodeData.channel || prevOutput.channel || '#general';
      const message = nodeData.message || prevOutput.message || prevOutput.output || '';

      if (organizationId) {
        try {
          const slackIntegration = await prisma.integration.findFirst({
            where: { organizationId, type: 'SLACK', active: true },
          });

          const botToken = (slackIntegration?.config as any)?.botToken;
          if (botToken) {
            const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${botToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ channel, text: message }),
            });

            const slackData: any = await slackRes.json();
            if (slackData.ok) {
              return { sent: true, channel, message, ts: slackData.ts };
            }
            throw new Error(`Slack API error: ${slackData.error}`);
          }
        } catch (err: any) {
          console.error('Slack integration error:', err);
          return { sent: false, channel, message, error: err.message, mock: true };
        }
      }

      return { sent: true, channel, message, mock: true };
    }

    case 'discord-message': {
      let prevOutput: any = {};
      if (edges && nodeMap) {
        const incoming = edges.find((e) => e.targetId === node.id);
        if (incoming && executionData[incoming.sourceId]) {
          prevOutput = executionData[incoming.sourceId];
        }
      }

      const channelId = nodeData.channel || prevOutput.channel || '';
      const message = nodeData.message || prevOutput.message || prevOutput.output || '';

      if (!channelId) {
        throw new Error('Discord channel not configured');
      }

      if (organizationId) {
        try {
          const discordIntegration = await prisma.integration.findFirst({
            where: { organizationId, type: 'DISCORD', active: true },
          });

          const botToken = (discordIntegration?.config as any)?.botToken;
          if (botToken) {
            const discordRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bot ${botToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ content: message }),
            });

            if (discordRes.ok) {
              const discordData: any = await discordRes.json();
              return { sent: true, channelId, message, discordId: discordData.id };
            }
            const discordError = await discordRes.text();
            throw new Error(`Discord API error: ${discordError}`);
          }
        } catch (err: any) {
          console.error('Discord integration error:', err);
          return { sent: false, channelId, message, error: err.message, mock: true };
        }
      }

      return { sent: true, channelId, message, mock: true };
    }

    case 'condition': {
      const condition = nodeData.condition;
      const input = executionData.previous?.output;

      let result = false;
      if (condition === 'always-true') result = true;
      else if (condition === 'always-false') result = false;
      else if (condition && input) {
        result = true;
      }

      return { passed: result, branch: result ? 'true' : 'false' };
    }

    case 'json-transform': {
      const template = nodeData.template;
      const input = nodeData.data || executionData.previous?.output;
      return { transformed: input };
    }

    default:
      return { processed: true, nodeType: node.type };
  }
}

const worker = new Worker('workflow-execution', executeWorkflow, {
  connection,
  concurrency: config.worker.concurrency,
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log('Worker started, waiting for jobs...');