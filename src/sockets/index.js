const { initializeSocket } = require("../config/socket");
const { registerFileSocket } = require("./file.socket");
const { registerNotificationSocket } = require("./notification.socket");

const setupSockets = (server) => {
  const io = initializeSocket(server);
  registerFileSocket(io);
  registerNotificationSocket(io);
  return io;
};

module.exports = setupSockets;