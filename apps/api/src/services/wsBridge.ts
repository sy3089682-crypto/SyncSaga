import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../lib/jwt';
import { redisService } from './redis.service';
import { logger } from '../lib/logger';

interface ExtensionMessage {
  type: 'ROOM_JOIN' | 'ROOM_LEAVE' | 'SYNC_EVENT' | 'SYNC_REQUEST';
  payload: any;
}

interface ExtensionClient {
  ws: WebSocket;
  userId: string;
  roomId: string | null;
}

export class WsBridge {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ExtensionClient> = new Map();

  initialize(server: HttpServer, path: string = '/ws') {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', async (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        ws.close(4001, 'Invalid token');
        return;
      }

      const client: ExtensionClient = {
        ws,
        userId: decoded.userId,
        roomId: null,
      };

      this.clients.set(decoded.userId, client);
      logger.info(`Extension client connected: ${decoded.userId}`);

      ws.on('message', async (raw) => {
        try {
          const message: ExtensionMessage = JSON.parse(raw.toString());
          await this.handleMessage(client, message);
        } catch (error) {
          logger.error('Failed to parse extension message:', error);
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
        }
      });

      ws.on('close', () => {
        logger.info(`Extension client disconnected: ${decoded.userId}`);
        if (client.roomId) {
          redisService.removeUserFromRoom(client.roomId, decoded.userId).catch(() => {});
        }
        this.clients.delete(decoded.userId);
      });

      ws.on('error', (error) => {
        logger.error('Extension WebSocket error:', error);
      });

      ws.send(JSON.stringify({ type: 'CONNECTED', payload: { userId: decoded.userId } }));
    });

    logger.info(`WebSocket bridge initialized on path: ${path}`);
  }

  private async handleMessage(client: ExtensionClient, message: ExtensionMessage) {
    const { ws } = client;

    switch (message.type) {
      case 'ROOM_JOIN': {
        const { roomId } = message.payload;
        client.roomId = roomId;
        await redisService.addUserToRoom(roomId, client.userId, `ext:${client.userId}`);
        ws.send(JSON.stringify({ type: 'ROOM_JOINED', payload: { roomId } }));
        break;
      }

      case 'ROOM_LEAVE': {
        const { roomId } = message.payload;
        if (client.roomId) {
          await redisService.removeUserFromRoom(client.roomId, client.userId);
        }
        client.roomId = null;
        ws.send(JSON.stringify({ type: 'ROOM_LEFT', payload: { success: true } }));
        break;
      }

      case 'SYNC_EVENT': {
        const event = message.payload;
        if (!client.roomId) {
          ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not in a room' } }));
          return;
        }

        event.room_id = client.roomId;
        event.user_id = client.userId;
        event.server_time = Date.now();

        await redisService.setRoomState(client.roomId, {
          current_timestamp: event.timestamp,
          playback_state: event.type === 'play' ? 'playing' : event.type === 'pause' ? 'paused' : undefined,
        });

        // Broadcast to all other extension clients in this room
        for (const [, otherClient] of this.clients) {
          if (otherClient.roomId === client.roomId && otherClient.userId !== client.userId && otherClient.ws.readyState === WebSocket.OPEN) {
            otherClient.ws.send(JSON.stringify({ type: 'SYNC_EVENT', payload: event }));
          }
        }
        break;
      }

      case 'SYNC_REQUEST': {
        if (!client.roomId) {
          ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not in a room' } }));
          return;
        }
        const state = await redisService.getRoomState(client.roomId);
        ws.send(JSON.stringify({ type: 'SYNC_STATE', payload: state || { timestamp: 0, playback_state: 'paused', speed: 1, episode: null } }));
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Unknown message type: ${message.type}` } }));
    }
  }

  broadcastToRoom(roomId: string, message: any) {
    const data = JSON.stringify(message);
    for (const [, client] of this.clients) {
      if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  shutdown() {
    this.wss?.close();
  }
}

export const wsBridge = new WsBridge();
