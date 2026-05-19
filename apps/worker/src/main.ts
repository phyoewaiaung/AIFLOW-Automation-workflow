import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { Worker, Job } from 'bullmq';
import { config } from '@autoflow/configs';
import OpenAI from 'openai';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/autoflow',
    },
  },
});

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

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

  try {
    await prisma.execution.update({
      where: { id: executionId },
      data: { status: 'RUNNING' },
    });

    await prisma.executionLog.create({
      data: {
        executionId,
        level: 'INFO',
        message: 'Execution started',
      },
    });

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
      console.log(`Executing node: ${node.type} - ${node.id}`);

      await prisma.executionLog.create({
        data: {
          executionId,
          nodeId: node.id,
          level: 'INFO',
          message: `Executing node: ${node.type}`,
        },
      });

      try {
        const result = await executeNode(node, executionData, prisma, openai);
        executionData[node.id] = result;

        await prisma.executionLog.create({
          data: {
            executionId,
            nodeId: node.id,
            level: 'INFO',
            message: `Node completed: ${node.type}`,
            data: result,
          },
        });
      } catch (nodeError: any) {
        await prisma.executionLog.create({
          data: {
            executionId,
            nodeId: node.id,
            level: 'ERROR',
            message: `Node failed: ${nodeError.message}`,
          },
        });

        await prisma.execution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            error: nodeError.message,
            completedAt: new Date(),
          },
        });
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
  }
}

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

  return sorted;
}

async function executeNode(
  node: any,
  executionData: Record<string, any>,
  prisma: PrismaClient,
  openai: OpenAI | null
): Promise<any> {
  const nodeData = node.data as Record<string, any>;

  switch (node.type) {
    case 'trigger-webhook':
      return executionData.trigger || nodeData;

    case 'trigger-schedule':
      return { triggered: true, timestamp: new Date().toISOString() };

    case 'ai-agent': {
      if (!openai) {
        return { output: 'OpenAI not configured', agentId: nodeData.agentId };
      }

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

      const completion = await openai.chat.completions.create({
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
      if (!openai) {
        return { classification: 'OpenAI not configured' };
      }

      const prompt = nodeData.prompt;
      const data = nodeData.data || executionData.previous?.output;

      if (!prompt) {
        throw new Error('Classification prompt not configured');
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
      return {
        sent: true,
        to: nodeData.to || 'recipient@example.com',
        subject: nodeData.subject || 'Notification',
      };
    }

    case 'slack-message': {
      return {
        sent: true,
        channel: nodeData.channel || '#general',
        message: nodeData.message || '',
      };
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