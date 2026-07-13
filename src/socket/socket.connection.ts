import { Server } from "socket.io";
import { registerSocketHandlers } from "../app/module/Chat/Chat.socket";
import { socketAuthMiddleware } from "../app/middlewares/auth";


let io: Server;

//function to see all connected users
const logOnlineUsers = (io: Server) => {

  console.log("Toal Connected Users:", io.sockets.adapter.rooms);

  const onlineUsers: string[] = [];

  io.sockets.adapter.rooms.forEach((_, roomId) => {

    //skip default rooms (each socket has its own room)
    if (!io.sockets.sockets.has(roomId)) {
      onlineUsers.push(roomId);
    }

  });

  console.log("🟢 Online Users:", onlineUsers);
};

//socket initialization server
export const initSocket = (server: any) => {

  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // ✅ apply auth middleware
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {

    const userId = socket.data.user.profileId;

    console.log("User connected:", userId);

    socket.join(userId);

    // 🔥 log users after connection
    logOnlineUsers(io);

    // all socket events
    registerSocketHandlers(socket);

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);

      // ⚠️ delay is important (room cleanup happens async)
      setTimeout(() => {
        logOnlineUsers(io);
      }, 500);
    });

  });

  // io.on("connection", (socket) => {

  //   const userId = socket.data.user.profileId;

  //   console.log("User connected:", userId);

  //   // ✅ auto join room (no need frontend join)
  //   socket.join(userId);

  //   // all socket events
  //   registerSocketHandlers(socket);

  //   socket.on("disconnect", () => {
  //     console.log("User disconnected:", userId);
  //   });

  // });
};

//socket connection io
export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};