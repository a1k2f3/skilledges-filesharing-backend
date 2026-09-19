const { initializeSocket } = require("../config/socket");
const { registerFileSocket } = require("./file.socket");
const { registerNotificationSocket } = require("./notification.socket");
const { registerUserSocket } = require("./user.socket");

const setupSockets = (server) => {
  const io = initializeSocket(server);
  registerFileSocket(io);
  registerNotificationSocket(io);
  registerUserSocket(io);
  return io;
};

module.exports = setupSockets;