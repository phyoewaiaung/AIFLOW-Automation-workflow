import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    await this.checkAccess(integration.organizationId, userId);

    return integration;
  }

  async create(organizationId: string, userId: string, data: {
    name: string;
    type: string;
    config: Record<string, unknown>;
  }) {
    await this.checkAccess(organizationId, userId);

    return this.prisma.integration.create({
      data: {
        name: data.name,
        type: data.type as any,
        config: data.config as any,
        organizationId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      name?: string;
      config?: Record<string, unknown>;
      active?: boolean;
    }
  ) {
    const integration = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: integration.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.integration.update({
      where: { id },
      data: data as any,
    });
  }

  async delete(id: string, userId: string) {
    const integration = await this.findById(id, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: integration.organizationId, userId },
    });

    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.integration.delete({ where: { id } });
    return { success: true };
  }

  async testConnection(id: string, userId: string) {
    const integration = await this.findById(id, userId);

    return {
      success: true,
      message: `Connection test for ${integration.type} not implemented yet`,
    };
  }

  private async discordApi(token: string, path: string) {
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Discord API error: ${text}`);
    }
    return res.json();
  }

  async fetchDiscordChannels(id: string, userId: string) {
    const integration = await this.findById(id, userId);
    if (integration.type !== 'DISCORD') {
      throw new BadRequestException('Not a Discord integration');
    }
    const botToken = (integration.config as any)?.botToken;
    if (!botToken) {
      throw new BadRequestException('Discord bot token not configured');
    }

    const guilds: any[] = await this.discordApi(botToken, '/users/@me/guilds');
    const allChannels: any[] = [];

    for (const guild of guilds) {
      const channels: any[] = await this.discordApi(botToken, `/guilds/${guild.id}/channels`);
      for (const ch of channels) {
        if (ch.type === 0) {
          allChannels.push({
            id: ch.id,
            name: ch.name,
            guildId: guild.id,
            guildName: guild.name,
          });
        }
      }
    }

    return allChannels;
  }

  async fetchSlackChannels(id: string, userId: string) {
    const integration = await this.findById(id, userId);

    if (integration.type !== 'SLACK') {
      throw new BadRequestException('Not a Slack integration');
    }

    const config = integration.config as Record<string, any>;
    const botToken = config?.botToken;

    if (!botToken) {
      throw new BadRequestException('Slack bot token not configured');
    }

    const res = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=200', {
      headers: { Authorization: `Bearer ${botToken}` },
    });

    const data = await res.json();

    if (!data.ok) {
      throw new BadRequestException(`Slack API error: ${data.error}`);
    }

    return data.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
    }));
  }
}