import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface SocketUser {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  socketId: string;
  connectedAt: Date;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private onlineUsers = new Map<string, SocketUser>();

  initialize(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN.split(','),
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // JWT Authentication middleware for Socket connections
    this.io.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        (socket as any).user = {
          userId: decoded.sub,
          tenantId: decoded.tenantId,
          role: decoded.role,
          email: decoded.email,
        };
        next();
      } catch {
        next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user;

      if (user) {
        const socketUser: SocketUser = {
          userId: user.userId,
          tenantId: user.tenantId,
          role: user.role,
          email: user.email,
          socketId: socket.id,
          connectedAt: new Date(),
        };

        this.onlineUsers.set(socket.id, socketUser);

        // Join tenant room
        socket.join(`tenant:${user.tenantId}`);
        // Join role room
        socket.join(`tenant:${user.tenantId}:role:${user.role}`);
        // Join user personal room
        socket.join(`user:${user.userId}`);

        // Broadcast presence update
        this.broadcastPresence(user.tenantId);
      }

      socket.on('disconnect', () => {
        const exiting = this.onlineUsers.get(socket.id);
        this.onlineUsers.delete(socket.id);
        if (exiting) {
          this.broadcastPresence(exiting.tenantId);
        }
      });
    });

    return this.io;
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }
    return this.io;
  }

  /**
   * Broadcast an event to all clients in a tenant
   */
  emitToTenant(tenantId: string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(`tenant:${tenantId}`).emit(event, {
        ...payload,
        emittedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast an event to specific roles within a tenant
   */
  emitToRole(tenantId: string, role: string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(`tenant:${tenantId}:role:${role}`).emit(event, {
        ...payload,
        emittedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast an event to a specific user
   */
  emitToUser(userId: string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, {
        ...payload,
        emittedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast live agent activity event
   */
  emitAgentActivity(tenantId: string, agentName: string, message: string, status: 'RUNNING' | 'SUCCESS' | 'FAILED'): void {
    this.emitToTenant(tenantId, 'agent:activity', {
      agentName,
      message,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Returns list of currently online users for a tenant
   */
  getOnlineUsers(tenantId: string): SocketUser[] {
    const list: SocketUser[] = [];
    for (const u of this.onlineUsers.values()) {
      if (u.tenantId === tenantId) {
        list.push(u);
      }
    }
    return list;
  }

  private broadcastPresence(tenantId: string): void {
    const users = this.getOnlineUsers(tenantId);
    this.emitToTenant(tenantId, 'presence:update', {
      onlineCount: users.length,
      users: users.map((u) => ({
        userId: u.userId,
        email: u.email,
        role: u.role,
      })),
    });
  }
}

export const socketService = new SocketService();
