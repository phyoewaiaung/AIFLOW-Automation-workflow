import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('admin123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@autoflow.ai' },
    update: {},
    create: {
      email: 'admin@autoflow.ai',
      name: 'Admin User',
      password: hashedPassword,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'autoflow-demo' },
    update: {},
    create: {
      name: 'AutoFlow Demo',
      slug: 'autoflow-demo',
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
    },
  });

  const agent = await prisma.agent.upsert({
    where: { id: 'demo-sales-agent' },
    update: {},
    create: {
      id: 'demo-sales-agent',
      name: 'Sales Assistant',
      description: 'AI agent that analyzes leads and generates personalized sales emails',
      model: 'gpt-4',
      instructions: 'You are a sales assistant. Analyze the lead information and generate a personalized outreach email.',
      tools: [],
      organizationId: org.id,
      createdById: user.id,
    },
  });

  const workflow = await prisma.workflow.upsert({
    where: { id: 'demo-lead-workflow' },
    update: {},
    create: {
      id: 'demo-lead-workflow',
      name: 'Lead Processing Pipeline',
      description: 'Automatically processes incoming leads, analyzes with AI, sends email, and notifies Slack',
      active: true,
      organizationId: org.id,
      createdById: user.id,
      definition: {},
      triggerConfig: { type: 'webhook' },
    },
  });

  const webhookNode = await prisma.workflowNode.upsert({
    where: { id: 'node-webhook' },
    update: {},
    create: {
      id: 'node-webhook',
      workflowId: workflow.id,
      type: 'trigger-webhook',
      positionX: 100,
      positionY: 200,
      data: { type: 'trigger-webhook', label: 'Webhook Trigger' },
    },
  });

  const aiNode = await prisma.workflowNode.upsert({
    where: { id: 'node-ai-agent' },
    update: {},
    create: {
      id: 'node-ai-agent',
      workflowId: workflow.id,
      type: 'ai-agent',
      positionX: 350,
      positionY: 200,
      data: { type: 'ai-agent', label: 'AI Analysis', agentId: agent.id },
    },
  });

  const emailNode = await prisma.workflowNode.upsert({
    where: { id: 'node-email' },
    update: {},
    create: {
      id: 'node-email',
      workflowId: workflow.id,
      type: 'send-email',
      positionX: 600,
      positionY: 200,
      data: { type: 'send-email', label: 'Send Email' },
    },
  });

  await prisma.workflowEdge.upsert({
    where: { id: 'edge-webhook-ai' },
    update: {},
    create: {
      id: 'edge-webhook-ai',
      workflowId: workflow.id,
      sourceId: webhookNode.id,
      targetId: aiNode.id,
    },
  });

  await prisma.workflowEdge.upsert({
    where: { id: 'edge-ai-email' },
    update: {},
    create: {
      id: 'edge-ai-email',
      workflowId: workflow.id,
      sourceId: aiNode.id,
      targetId: emailNode.id,
    },
  });

  console.log('Seed completed successfully');
  console.log(`  Admin email: admin@autoflow.ai`);
  console.log(`  Admin password: admin123`);
  console.log(`  Demo workflow: ${workflow.name}`);
  console.log(`  Demo agent: ${agent.name}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
