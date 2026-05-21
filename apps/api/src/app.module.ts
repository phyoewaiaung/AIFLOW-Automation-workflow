import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { AgentsModule } from './modules/agents/agents.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaService } from './prisma.service';
import { config } from '@autoflow/configs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: config.rateLimit.windowMs,
      limit: config.rateLimit.maxRequests,
    }]),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WorkflowsModule,
    ExecutionsModule,
    AgentsModule,
    IntegrationsModule,
    AnalyticsModule,
    WebsocketModule,
    ApiKeysModule,
    NotificationsModule,
  ],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [PrismaService],
})
export class AppModule {}