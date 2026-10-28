import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../../iam/application/token.service';

/**
 * Real-time notification gateway. Clients connect with `auth: { token }`,
 * we verify the access token, and then push notifications to the user-
 * specific room (one room per user). Multi-pod broadcast can later be
 * enabled by wiring socket.io-redis adapter; for MVP the single-process
 * model is sufficient.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/realtime',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly tokens: TokenService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers['authorization']?.toString().replace(/^Bearer\s+/, '');
      if (!token) throw new UnauthorizedException('No token');
      const payload = await this.tokens.verifyAccess(token);
      if (!payload) throw new UnauthorizedException('Invalid token');

      client.data.userId = payload.sub;
      client.data.tenantId = payload.tid;
      client.join(`user:${payload.sub}`);
      client.join(`tenant:${payload.tid}`);
      this.logger.debug(`WS connected user=${payload.sub} tenant=${payload.tid}`);
    } catch (err) {
      this.logger.debug(`WS rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`WS disconnected user=${client.data.userId}`);
  }

  /** Push a notification payload to a single user across all their devices. */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
