import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OpenAI } from 'openai';

@Injectable()
export class AgentsService {
  private openai: OpenAI | null = null;

  constructor(private prisma: PrismaService) {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
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

  async findAll(organizationId: string, userId: string) {
    await this.checkAccess(organizationId, userId);

    return this.prisma.agent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    await this.checkAccess(agent.organizationId, userId);

    return agent;
  }

  async create(organizationId: string, userId: string, data: {
    name: string;
    description?: string;
    model?: string;
    instructions: string;
    tools?: string[];
  }) {
    await this.checkAccess(organizationId, userId);

    return this.prisma.agent.create({
      data: {
        name: data.name,
        description: data.description,
        model: data.model || 'gpt-4',
        instructions: data.instructions,
        tools: data.tools as any || [],
        organizationId,
        createdById: userId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      model?: string;
      instructions?: string;
      tools?: string[];
    }
  ) {
    const agent = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: agent.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.agent.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const agent = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: agent.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.agent.delete({ where: { id } });
    return { success: true };
  }

  async execute(id: string, userId: string, input: string) {
    const agent = await this.findById(id, userId);

    if (!this.openai) {
      return {
        output: `Mock response for "${agent.name}" with input: "${input.substring(0, 100)}..."\n\nAnalysis complete. Based on the provided information, this appears to be a high-priority inquiry. Recommended next steps: schedule a demo call and send personalized follow-up materials.`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    const completion = await this.openai.chat.completions.create({
      model: agent.model,
      messages: [
        {
          role: 'system',
          content: agent.instructions,
        },
        {
          role: 'user',
          content: input,
        },
      ],
      temperature: 0.7,
    });

    const output = completion.choices[0]?.message?.content || '';
    const usage = completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : null;

    return { output, usage };
  }
}