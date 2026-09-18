require("dotenv").config();

const http = require("http");

const app = require("./src/app");
const connectDB = require("./src/config/db");
const setupSockets = require("./src/sockets");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    setupSockets(server);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Socket.IO enabled`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();