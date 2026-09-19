import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { registerSocketHandlers } from '../modules/Chat/Chat.socket';
import { socketAuthMiddleware } from '../middleware/auth';

let io: Server;

const logOnlineUsers = (serverIO: Server) => {
  const onlineUsers: string[] = [];
  serverIO.sockets.adapter.rooms.forEach((_, roomId) => {
    if (!serverIO.sockets.sockets.has(roomId)) {
      onlineUsers.push(roomId);
    }
  });
  console.log('🟢 Online Users:', onlineUsers);
};

export const initializeSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const userId = socket.data?.user?.profileId || socket.data?.user?.userId;
    console.log(`✅ User connected to socket: ${userId}`);

    if (userId) {
      socket.join(userId);
    }

    logOnlineUsers(io);

    // Register project chat handlers
    try {
      registerSocketHandlers(socket);
    } catch (err) {
      console.error('Error registering socket handlers:', err);
    }

    socket.on('disconnect', () => {
      console.log(`⚠️ User disconnected: ${userId}`);
      setTimeout(() => {
        logOnlineUsers(io);
      }, 500);
    });
  });

  return io;
};

export const initSocket = initializeSocket;

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
