"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { subscribeToAuth, loadUserFromFirestore } from "@/lib/auth-actions";
import Navbar from "@/components/layout/Navbar";
import GamePage from "@/components/board/GamePage";
import LeaderboardPage from "@/components/ui/LeaderboardPage";
import ShopPage from "@/components/ui/ShopPage";
import ProfilePage from "@/components/ui/ProfilePage";
import ProModal from "@/components/ui/ProModal";
import AuthModal from "@/components/ui/AuthModal";

export default function Home() {
  const { activePage, user, setUser, newGame } = useStore();
  const [authChecked, setAuthChecked] = useState(false);

  // Clear stale game-over state on first mount
  // Also reset if game was in progress (e.g. after page refresh) so board/timer are clean
  useEffect(() => {
    const { gameOver, inGame } = useStore.getState();
    if (gameOver || inGame) newGame();
  }, []); // eslint-disable-line

  useEffect(() => {
    const unsub = subscribeToAuth(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await loadUserFromFirestore(firebaseUser.uid);
          if (profile) setUser(profile);
        } catch {}
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, [setUser]);

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4"
        style={{ background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(124,58,237,.15),transparent 70%),#05050f" }}>
        <div className="text-6xl animate-float">♟</div>
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin-slow" />
        <p className="font-display text-text-muted text-sm tracking-[.2em]">CHESSLINGO</p>
      </div>
    );
  }

  if (!user) return <AuthModal onClose={() => {}} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background:"#05050f" }}>
      <Navbar />
      <main className="flex-1 overflow-hidden">
        {activePage === "game"        && <GamePage />}
        {activePage === "leaderboard" && <LeaderboardPage />}
        {activePage === "shop"        && <ShopPage />}
        {activePage === "profile"     && <ProfilePage />}
      </main>
      <ProModal />
    </div>
  );
}
