import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../lib/logger';

interface ExtensionMessage {
  type: 'ROOM_JOIN' | 'ROOM_LEAVE' | 'SYNC_EVENT' | 'SYNC_REQUEST';
  payload: any;
}

export class WsBridge {
  private io: SocketIOServer | null = null;

  initialize(io: SocketIOServer) {
    this.io = io;
    logger.info('WebSocket bridge integrated with Socket.IO');
  }

  handleExtensionMessage(socketId: string, message: ExtensionMessage) {
    switch (message.type) {
      case 'ROOM_JOIN':
      case 'ROOM_LEAVE':
      case 'SYNC_EVENT':
      case 'SYNC_REQUEST':
        logger.debug({ socketId, type: message.type }, 'Extension message routed to Socket.IO');
        break;
      default:
        logger.warn({ socketId, type: message.type }, 'Unknown extension message type');
    }
  }

  broadcastToRoom(roomId: string, message: any) {
    if (!this.io) return;
    this.io.to(roomId).emit('sync:event', message);
  }

  shutdown() {
    this.io = null;
  }
}

export const wsBridge = new WsBridge();
