"use client";
import { useState, useEffect, useRef } from "react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useStore } from "@/store/useStore";

export default function MultiplayerPanel() {
  const { user, startGame } = useStore();
  const uid = user?.uid ?? "guest";
  const { roomId, myColor, status, chatMessages, createRoom, joinRoom, sendMove, resign, sendChat, getInviteLink } = useMultiplayer(uid);
  
  const [joinInput, setJoinInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"lobby" | "chat">("lobby");
  const chatRef = useRef<HTMLDivElement>(null);
  const link = getInviteLink();

  // Auto-start game when both players joined
  useEffect(() => {
    if (status === "playing") {
      startGame("friend");
    }
  }, [status]);

  // Scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [chatMessages]);

  // Auto-join from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get("join");
    if (joinId) {
      setJoinInput(joinId);
      joinRoom(joinId);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Status indicator */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl glass">
        <div className={`w-2.5 h-2.5 rounded-full ${
          status === "idle"    ? "bg-gray-500" :
          status === "waiting" ? "bg-yellow-400 animate-pulse" :
          status === "playing" ? "bg-emerald-400" : "bg-red-400"
        }`} />
        <span className="text-sm font-semibold">
          {status === "idle"    ? "Not connected" :
           status === "waiting" ? "Waiting for opponent..." :
           status === "playing" ? `Playing as ${myColor === "w" ? "White ♙" : "Black ♟"}` :
           "Game ended"}
        </span>
        {status === "waiting" && <span className="ml-auto text-xs text-text-muted">Room: {roomId}</span>}
      </div>

      {status === "idle" && (
        <div className="flex flex-col gap-3">
          {/* Create room */}
          <button
            onClick={createRoom}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white
              bg-gradient-to-r from-accent-purple to-accent-violet
              hover:opacity-90 hover:scale-[1.02] transition-all
              shadow-[0_4px_20px_rgba(124,58,237,.4)]"
          >
            🔗 Create Game & Get Link
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-text-muted">or join</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Join room */}
          <div className="flex gap-2">
            <input
              value={joinInput}
              onChange={e => setJoinInput(e.target.value.toUpperCase())}
              placeholder="Room code (e.g. AB12CD)"
              maxLength={8}
              className="flex-1 px-4 py-2.5 rounded-xl glass border border-white/10 focus:border-accent-purple outline-none text-sm font-mono transition-colors"
            />
            <button
              onClick={() => joinInput && joinRoom(joinInput.trim())}
              disabled={!joinInput}
              className="px-4 py-2.5 rounded-xl bg-accent-purple text-white text-sm font-bold hover:bg-accent-violet transition-colors disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {status === "waiting" && link && (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-text-muted text-center">Share this link with your friend:</div>
          <div
            onClick={copyLink}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl glass border border-accent-purple/40 cursor-pointer hover:border-accent-purple transition-all group"
          >
            <span className="text-xs font-mono text-accent-violet truncate flex-1">{link}</span>
            <span className={`text-sm shrink-0 transition-all ${copied ? "text-emerald-400" : "text-text-muted group-hover:text-accent-gold"}`}>
              {copied ? "✅ Copied!" : "📋 Copy"}
            </span>
          </div>
          
          {/* QR code placeholder */}
          <div className="flex items-center justify-center py-6 glass rounded-2xl border border-white/5">
            <div className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-sm font-bold text-text-secondary">Room Code</div>
              <div className="text-3xl font-mono font-bold grad-gold mt-1">{roomId}</div>
              <div className="text-xs text-text-muted mt-2">Waiting for opponent to join...</div>
              <div className="flex justify-center mt-3">
                <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin-slow" />
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "playing" && (
        <>
          <div className="flex gap-1 glass rounded-xl overflow-hidden">
            {(["lobby","chat"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors
                  ${tab === t ? "bg-accent-purple text-white" : "text-text-muted hover:text-text-secondary"}`}>
                {t === "lobby" ? "🎮 Game" : `💬 Chat ${chatMessages.length > 0 ? `(${chatMessages.length})` : ""}`}
              </button>
            ))}
          </div>

          {tab === "lobby" && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="glass rounded-xl p-3 text-center">
                  <div className="text-text-muted text-xs mb-1">You play as</div>
                  <div className="font-bold text-lg">{myColor === "w" ? "♙ White" : "♟ Black"}</div>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <div className="text-text-muted text-xs mb-1">Opponent</div>
                  <div className="font-bold text-lg">{myColor === "w" ? "♟ Black" : "♙ White"}</div>
                </div>
              </div>
              <button onClick={resign}
                className="py-2.5 rounded-xl border border-red-700/50 text-red-400 text-sm font-semibold hover:bg-red-900/20 transition-colors">
                🏳️ Resign
              </button>
            </div>
          )}

          {tab === "chat" && (
            <div className="flex flex-col gap-2">
              <div ref={chatRef} className="h-36 overflow-y-auto flex flex-col gap-2 px-1">
                {chatMessages.length === 0 && (
                  <div className="text-center text-text-muted text-xs py-4">No messages yet</div>
                )}
                {chatMessages.map((m, i) => {
                  const isMe = m.from === uid;
                  return (
                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                        isMe
                          ? "bg-accent-purple text-white rounded-br-sm"
                          : "glass text-text-secondary rounded-bl-sm"
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && chatInput.trim()) {
                      sendChat(chatInput.trim());
                      setChatInput("");
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-xl glass border border-white/10 focus:border-accent-purple outline-none text-xs transition-colors"
                />
                <button
                  onClick={() => { if (chatInput.trim()) { sendChat(chatInput.trim()); setChatInput(""); } }}
                  className="px-3 py-2 rounded-xl bg-accent-purple text-white text-xs hover:bg-accent-violet transition-colors"
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
