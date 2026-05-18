const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const ioClient = require("socket.io-client");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const localIo = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

localIo.use((socket, next) => {
  socket.identity = socket.handshake.auth?.identity || {};
  next();
});

const PORT = process.env.PORT || 4000;
const SAAS_SOCKET_URL = process.env.SAAS_SOCKET_URL || "http://localhost:5000";

localIo.on("connection", (socket) => {
  const endUserId = socket.identity?.endUserID || socket.identity?.userID;
  if (!endUserId) return socket.disconnect();

  const saasSocket = ioClient(SAAS_SOCKET_URL, {
    auth: {
      publicKey: process.env.SAAS_PUBLIC_KEY,
      secretKey: process.env.SAAS_SECRET_KEY,
      identity: { endUserID: endUserId },
    },
    reconnection: true,
  });

  saasSocket.on("chat:history", (data) => socket.emit("chat:history", data));
  saasSocket.on("chat:newMessage", (msg) =>
    socket.emit("chat:newMessage", msg),
  );
  saasSocket.on("chat:error", (err) => socket.emit("chat:error", err));
  saasSocket.on("chat:messageSent", (msg) =>
    socket.emit("chat:messageSent", msg),
  );
  saasSocket.on("chat:messageDeleted", (data) =>
    socket.emit("chat:messageDeleted", data),
  );
  saasSocket.on("chat:reactionUpdated", (data) =>
    socket.emit("chat:reactionUpdated", data),
  );
  saasSocket.on("chat:messageRead", (data) =>
    socket.emit("chat:messageRead", data),
  );
  saasSocket.on("chat:conversations", (data) =>
    socket.emit("chat:conversations", data),
  );
  saasSocket.on("chat:typing", (data) => socket.emit("chat:typing", data));

  socket.on("chat:joinChat", (data) => saasSocket.emit("chat:joinChat", data));
  socket.on("chat:sendMessage", (data) =>
    saasSocket.emit("chat:sendMessage", data),
  );
  socket.on("chat:getConversations", () =>
    saasSocket.emit("chat:getConversations", { endUserId }),
  );
  socket.on("chat:addReaction", (data) =>
    saasSocket.emit("chat:addReaction", data),
  );
  socket.on("chat:markAsRead", (data) =>
    saasSocket.emit("chat:markAsRead", data),
  );
  socket.on("chat:deleteMessage", (data) =>
    saasSocket.emit("chat:deleteMessage", data),
  );
  socket.on("chat:typing:start", (data) =>
    saasSocket.emit("chat:typing:start", data),
  );
  socket.on("chat:typing:stop", (data) =>
    saasSocket.emit("chat:typing:stop", data),
  );

  socket.on("disconnect", () => saasSocket.disconnect());
});

server.listen(PORT, () =>
  console.log(`🚀 Proxy Backend running on port ${PORT}`),
);
