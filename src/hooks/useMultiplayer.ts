/**
 * useMultiplayer — WebSocket hook for friend games
 * Usage: const { roomId, joinRoom, sendMove } = useMultiplayer(userId)
 */
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useStore } from "@/store/useStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";

export function useMultiplayer(userId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<"w"|"b">("w");
  const [status, setStatus] = useState<"idle"|"waiting"|"playing"|"ended">("idle");
  const [chatMessages, setChatMessages] = useState<{ from:string; message:string; ts:number }[]>([]);
  const { commitMove } = useStore();

  useEffect(() => {
    socketRef.current = io(WS_URL, { autoConnect: false });
    const socket = socketRef.current;

    socket.on("room_created", ({ roomId: rid, color }: any) => {
      setRoomId(rid);
      setMyColor(color);
      setStatus("waiting");
    });
    socket.on("game_start", () => setStatus("playing"));
    socket.on("opponent_move", ({ move }: any) => {
      commitMove(move.from, move.to, move.promotion);
    });
    socket.on("game_over", () => setStatus("ended"));
    socket.on("draw_offered", () => {
      if (confirm("Opponent offers a draw. Accept?")) {
        socket.emit("accept_draw", { roomId });
      }
    });
    socket.on("chat_message", (msg: any) => setChatMessages(prev => [...prev, msg]));
    socket.on("opponent_disconnected", () => {
      setStatus("ended");
      alert("Opponent disconnected!");
    });

    return () => { socket.disconnect(); };
  }, []);

  const createRoom = useCallback(() => {
    socketRef.current?.connect();
    socketRef.current?.emit("create_room", { userId });
  }, [userId]);

  const joinRoom = useCallback((rid: string) => {
    socketRef.current?.connect();
    socketRef.current?.emit("join_room", { roomId: rid, userId });
    setRoomId(rid);
    setMyColor("b");
  }, [userId]);

  const sendMove = useCallback((move: any, fen: string) => {
    socketRef.current?.emit("move", { roomId, move, fen });
  }, [roomId]);

  const resign = useCallback(() => {
    socketRef.current?.emit("resign", { roomId, userId });
  }, [roomId, userId]);

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit("chat", { roomId, message, from: userId });
  }, [roomId, userId]);

  const getInviteLink = () =>
    roomId ? `${window.location.origin}?join=${roomId}` : null;

  return { roomId, myColor, status, chatMessages, createRoom, joinRoom, sendMove, resign, sendChat, getInviteLink };
}
