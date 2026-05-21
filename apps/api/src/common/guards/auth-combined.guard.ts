import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const parts = authHeader.split(' ');
    const token = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

    if (token.startsWith('sk_live_')) {
      return this.validateApiKey(request, token);
    }

    return this.validateJwt(request, token);
  }

  private async validateApiKey(request: any, token: string): Promise<boolean> {
    const key = await this.prisma.apiKey.findUnique({ where: { key: token } });
    if (!key) throw new UnauthorizedException('Invalid API key');

    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: key.userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      memberships: memberships.map((m) => ({
        id: m.id,
        role: m.role,
        organizationId: m.organizationId,
        organization: m.organization,
      })),
    };

    return true;
  }

  private async validateJwt(request: any, token: string): Promise<boolean> {
    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      const payload = jwt.verify(token, secret) as { sub: string; email: string };
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');

      const memberships = await this.prisma.membership.findMany({
        where: { userId: user.id },
        include: { organization: true },
      });

      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        memberships: memberships.map((m) => ({
          id: m.id,
          role: m.role,
          organizationId: m.organizationId,
          organization: m.organization,
        })),
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
