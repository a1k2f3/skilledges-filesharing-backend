const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");
const { corsOptions } = require("./cors");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: corsOptions
  });

  io.use((socket, next) => {
    try {
      const authorization = socket.handshake.headers.authorization;
      const token = socket.handshake.auth?.token || authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Authentication required"));

      socket.user = verifyToken(token);
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === "admin") socket.join("admin");

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO
};