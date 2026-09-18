const { initializeSocket } = require("../config/socket");

const setupSockets = (server) => {
  return initializeSocket(server);
};

module.exports = setupSockets;