import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, string>();

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.connectedClients.set(client.id, userId);
      console.log(`Client connected: ${client.id}, User: ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('execution:subscribe')
  handleExecutionSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string }
  ) {
    client.join(`execution:${data.executionId}`);
    console.log(`Client ${client.id} subscribed to execution ${data.executionId}`);
    return { success: true };
  }

  @SubscribeMessage('execution:unsubscribe')
  handleExecutionUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string }
  ) {
    client.leave(`execution:${data.executionId}`);
    return { success: true };
  }

  emitExecutionUpdate(executionId: string, data: {
    status: string;
    nodeId?: string;
    message?: string;
    error?: string;
  }) {
    this.server.to(`execution:${executionId}`).emit('execution:status', {
      executionId,
      ...data,
    });
  }

  emitExecutionLog(executionId: string, log: {
    level: string;
    message: string;
    nodeId?: string;
    data?: any;
    timestamp: string;
  }) {
    this.server.to(`execution:${executionId}`).emit('log:stream', {
      executionId,
      log,
    });
  }

  emitExecutionComplete(executionId: string, data: {
    status: string;
    duration: number;
    error?: string;
  }) {
    this.server.to(`execution:${executionId}`).emit('execution:complete', {
      executionId,
      ...data,
    });
  }

  emitNotification(userId: string, data: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    this.server.emit(`notification:${userId}`, {
      type: 'notification:new',
      ...data,
    });
  }
}