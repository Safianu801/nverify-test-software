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
    transports: ["polling", "websocket"],
    auth: {
      publicKey: process.env.SAAS_PUBLIC_KEY,
      secretKey: process.env.SAAS_SECRET_KEY,
      identity: { endUserID: endUserId },
    },
    reconnection: true,
  });

  // ==========================================
  // 1. CHAT EVENTS (Piped through)
  // ==========================================
  const chatEvents = [
    "chat:history",
    "chat:newMessage",
    "chat:error",
    "chat:messageSent",
    "chat:messageDeleted",
    "chat:reactionUpdated",
    "chat:messageRead",
    "chat:conversations",
    "chat:typing",
  ];
  chatEvents.forEach((event) =>
    saasSocket.on(event, (data) => socket.emit(event, data)),
  );

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

  // ==========================================
  // 2. VIDEO CALL EVENTS (Conference Enabled)
  // ==========================================

  // SaaS -> Proxy -> Frontend
  saasSocket.on("video:error", (err) => socket.emit("video:error", err));
  saasSocket.on("video:incomingCall", (data) =>
    socket.emit("video:incomingCall", data),
  );
  saasSocket.on("video:callResponse", (data) =>
    socket.emit("video:callResponse", data),
  );
  saasSocket.on("video:ready", (data) => socket.emit("video:ready", data));
  saasSocket.on("video:userJoined", (data) =>
    socket.emit("video:userJoined", data),
  );
  saasSocket.on("video:userLeft", (data) =>
    socket.emit("video:userLeft", data),
  );
  saasSocket.on("video:mediaStateChanged", (data) =>
    socket.emit("video:mediaStateChanged", data),
  );
  saasSocket.on("video:iceConfig", (data) =>
    socket.emit("video:iceConfig", data),
  );

  // Signaling (Must include targetId)
  saasSocket.on("video:offer", (data) => socket.emit("video:offer", data));
  saasSocket.on("video:answer", (data) => socket.emit("video:answer", data));
  saasSocket.on("video:iceCandidate", (data) =>
    socket.emit("video:iceCandidate", data),
  );

  // Frontend -> Proxy -> SaaS
  socket.on("video:initiateCall", (data) =>
    saasSocket.emit("video:initiateCall", data),
  );
  socket.on("video:respondToCall", (data) =>
    saasSocket.emit("video:respondToCall", data),
  );
  socket.on("video:joinRoom", (data) =>
    saasSocket.emit("video:joinRoom", data),
  );
  socket.on("video:offer", (data) => saasSocket.emit("video:offer", data));
  socket.on("video:answer", (data) => saasSocket.emit("video:answer", data));
  socket.on("video:iceCandidate", (data) =>
    saasSocket.emit("video:iceCandidate", data),
  );
  socket.on("video:toggleMedia", (data) =>
    saasSocket.emit("video:toggleMedia", data),
  );
  socket.on("video:leaveCall", (data) =>
    saasSocket.emit("video:leaveCall", data),
  );

  socket.on("disconnect", () => saasSocket.disconnect());
});

server.listen(PORT, () =>
  console.log(`🚀 Proxy Backend running on port ${PORT}`),
);
