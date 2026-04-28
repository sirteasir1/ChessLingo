/**
 * Multiplayer WebSocket server — run alongside Next.js
 * Usage: npx ts-node src/server/ws-server.ts
 * Or add to package.json scripts: "server": "ts-node src/server/ws-server.ts"
 */
import { createServer } from "http";
import { Server } from "socket.io";

interface GameRoom {
  id: string;
  white: string;
  black: string | null;
  moves: string[];
  fen: string;
}

const rooms = new Map<string, GameRoom>();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET","POST"] },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Create room
  socket.on("create_room", ({ userId }: { userId: string }) => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    rooms.set(roomId, { id: roomId, white: userId, black: null, moves: [], fen: "start" });
    socket.join(roomId);
    socket.emit("room_created", { roomId, color: "w" });
    console.log(`Room created: ${roomId} by ${userId}`);
  });

  // Join room
  socket.on("join_room", ({ roomId, userId }: { roomId: string; userId: string }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit("error", "Room not found"); return; }
    if (room.black) { socket.emit("error", "Room is full"); return; }
    room.black = userId;
    socket.join(roomId);
    io.to(roomId).emit("game_start", { roomId, white: room.white, black: room.black });
    console.log(`${userId} joined room ${roomId}`);
  });

  // Move
  socket.on("move", ({ roomId, move, fen }: { roomId: string; move: any; fen: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.moves.push(move.san ?? move.uci);
    room.fen = fen;
    socket.to(roomId).emit("opponent_move", { move, fen });
  });

  // Resign
  socket.on("resign", ({ roomId, userId }: { roomId: string; userId: string }) => {
    io.to(roomId).emit("game_over", { reason: "resign", loser: userId });
    rooms.delete(roomId);
  });

  // Offer draw
  socket.on("offer_draw", ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit("draw_offered");
  });

  socket.on("accept_draw", ({ roomId }: { roomId: string }) => {
    io.to(roomId).emit("game_over", { reason: "draw" });
    rooms.delete(roomId);
  });

  // Chat
  socket.on("chat", ({ roomId, message, from }: any) => {
    io.to(roomId).emit("chat_message", { message, from, ts: Date.now() });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    // Notify opponent if in a room
    rooms.forEach((room, id) => {
      if (room.white === socket.id || room.black === socket.id) {
        io.to(id).emit("opponent_disconnected");
      }
    });
  });
});

const PORT = process.env.WS_PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`♟ ChessMaster WebSocket server running on port ${PORT}`);
});
