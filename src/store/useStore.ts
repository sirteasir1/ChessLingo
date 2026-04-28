import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UserProfile, BoardState, MoveRecord,
  Color, Square, PieceType, GameMode, Difficulty, TimeControl, GameAnalysis,
} from "@/types";
import { createInitialState, getLegalMoves, applyMove, hasAnyLegalMove, isInCheck } from "@/lib/chess-engine";

interface AuthSlice {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
}

interface GameSlice {
  boardState: BoardState;
  displayState: BoardState;   // board shown (may be historical)
  selected: Square | null;
  legalTargets: Square[];
  moveHistory: MoveRecord[];
  historyStates: BoardState[];
  viewIndex: number;          // -1 = live, 0..n = replaying
  gameMode: GameMode;
  difficulty: Difficulty;
  timeControl: TimeControl;
  whiteTime: number;
  blackTime: number;
  gameOver: boolean;
  gameResult: string | null;
  gameResultType: "win" | "loss" | "draw" | null;  // ← explicit type, no string parsing
  inGame: boolean;
  thinking: boolean;
  promotionPending: { from: Square; to: Square; color: Color } | null;
  sessionId: string | null;
  analysis: GameAnalysis | null;
  gameSaved: boolean;

  selectSquare: (sq: Square) => void;
  commitMove: (from: Square, to: Square, promo?: PieceType) => void;
  promotePawn: (piece: PieceType) => void;
  startGame: (mode?: GameMode, diff?: Difficulty, time?: TimeControl) => void;
  endGame: (result: string, type: "win" | "loss" | "draw") => void;
  resignGame: () => void;
  newGame: () => void;
  setThinking: (v: boolean) => void;
  tickClock: () => void;
  setAnalysis: (a: GameAnalysis) => void;
  setGameMode: (m: GameMode) => void;
  setDifficulty: (d: Difficulty) => void;
  setTimeControl: (t: TimeControl) => void;
  // Navigation
  goToMove: (index: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  goBack: () => void;
  goForward: () => void;
}

interface UiSlice {
  activePage: string;
  proModalOpen: boolean;
  sidebarTab: string;
  setActivePage: (p: string) => void;
  setProModalOpen: (v: boolean) => void;
  setSidebarTab: (t: string) => void;
}

type Store = AuthSlice & GameSlice & UiSlice;

// Always create fresh board to avoid frozen object issues
const freshBoard = () => createInitialState();

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────
      user: null,
      setUser: (u) => set({ user: u }),
      addCoins: (n) => set((s) => s.user ? { user: { ...s.user, coins: s.user.coins + n } } : {}),
      spendCoins: (n) => {
        const { user } = get();
        if (!user || user.coins < n) return false;
        set({ user: { ...user, coins: user.coins - n } });
        return true;
      },

      // ── Game ──────────────────────────────────────────────────────────
      boardState: freshBoard(),
      displayState: freshBoard(),
      selected: null,
      legalTargets: [],
      moveHistory: [],
      historyStates: [freshBoard()],
      viewIndex: -1,
      gameMode: "ai",
      difficulty: "medium",
      timeControl: 10,
      whiteTime: 600,
      blackTime: 600,
      gameOver: false,
      gameResult: null,
      gameResultType: null,
      inGame: false,
      thinking: false,
      promotionPending: null,
      sessionId: null,
      analysis: null,
      gameSaved: false,

      selectSquare: (sq) => {
        const { boardState, selected, legalTargets, inGame, gameOver, thinking, viewIndex } = get();
        if (!inGame || gameOver || thinking || viewIndex !== -1) return;
        if (boardState.turn !== "w") return;
        const piece = boardState.board[sq];
        if (selected !== null && legalTargets.includes(sq)) {
          get().commitMove(selected, sq);
          return;
        }
        if (piece && piece[0] === "w") {
          set({ selected: sq, legalTargets: getLegalMoves(boardState, sq) });
        } else {
          set({ selected: null, legalTargets: [] });
        }
      },

      commitMove: (from, to, promo) => {
        const { boardState, moveHistory, historyStates } = get();
        const piece = boardState.board[from];
        if (!piece) return;
        const type = piece[1] as PieceType;
        const toRow = Math.floor(to / 8);
        if (type === "P" && (toRow === 0 || toRow === 7) && !promo) {
          set({ promotionPending: { from, to, color: boardState.turn } });
          return;
        }
        const { next, record } = applyMove(boardState, { from, to }, promo ?? "Q");
        const newHistory = [...moveHistory, record as MoveRecord];
        const newStates  = [...historyStates, next];
        const opp: Color = boardState.turn === "w" ? "b" : "w";
        const hasMoves   = hasAnyLegalMove(next);
        const inChk      = isInCheck(next.board, opp);
        set({
          boardState: next, displayState: next,
          selected: null, legalTargets: [],
          moveHistory: newHistory,
          historyStates: newStates,
          viewIndex: -1,
        });
        if (!hasMoves) {
          if (inChk) {
            const youWon = boardState.turn === "w";
            get().endGame(
              youWon ? "Checkmate! You won 🎉" : "Checkmate! AI wins",
              youWon ? "win" : "loss"
            );
          } else {
            get().endGame("Draw by stalemate", "draw");
          }
        }
      },

      promotePawn: (piece) => {
        const { promotionPending } = get();
        if (!promotionPending) return;
        set({ promotionPending: null });
        get().commitMove(promotionPending.from, promotionPending.to, piece);
      },

      startGame: (mode, diff, time) => {
        const initial = createInitialState();
        const tc = time ?? get().timeControl;
        set({
          boardState: initial, displayState: initial,
          historyStates: [initial],
          moveHistory: [], viewIndex: -1,
          selected: null, legalTargets: [],
          gameOver: false, gameResult: null, gameResultType: null,
          inGame: true, thinking: false,
          promotionPending: null, analysis: null,
          gameSaved: false,
          gameMode: mode ?? get().gameMode,
          difficulty: diff ?? get().difficulty,
          timeControl: tc,
          whiteTime: tc === 0 ? 99999 : tc * 60,
          blackTime: tc === 0 ? 99999 : tc * 60,
        });
      },

      endGame: (result, type) => {
        set({ gameOver: true, inGame: false, gameResult: result, gameResultType: type, gameSaved: false });
        // coins added AFTER firebase save in GameOverModal, not here
      },

      resignGame: () => { if (get().inGame) get().endGame("You resigned", "loss"); },

      newGame: () => {
        const initial = createInitialState();
        const tc = get().timeControl;
        set({
          inGame: false, gameOver: false,
          gameResult: null, gameResultType: null,
          boardState: initial, displayState: initial,
          selected: null, legalTargets: [],
          moveHistory: [], historyStates: [initial],
          viewIndex: -1, analysis: null,
          thinking: false,
          gameSaved: false,
          // Reset clocks to current timeControl
          whiteTime: tc === 0 ? 99999 : tc * 60,
          blackTime: tc === 0 ? 99999 : tc * 60,
        });
      },

      setThinking: (v) => set({ thinking: v }),

      tickClock: () => {
        const { gameOver, inGame, boardState, whiteTime, blackTime, timeControl } = get();
        if (!inGame || gameOver || timeControl === 0) return;
        if (boardState.turn === "w") {
          const t = whiteTime - 1;
          if (t <= 0) { get().endGame("Time out — AI wins", "loss"); return; }
          set({ whiteTime: t });
        } else {
          const t = blackTime - 1;
          if (t <= 0) { get().endGame("Time out — You win! 🎉", "win"); return; }
          set({ blackTime: t });
        }
      },

      // ── Move navigation ───────────────────────────────────────────────
      goToMove: (index) => {
        const { historyStates, moveHistory } = get();
        if (index < 0) {
          // Go to live
          const live = historyStates[historyStates.length - 1];
          set({ displayState: live, viewIndex: -1, selected: null, legalTargets: [] });
        } else {
          const clamped = Math.max(0, Math.min(index, moveHistory.length - 1));
          const st = historyStates[clamped + 1] ?? historyStates[historyStates.length - 1];
          set({ displayState: st, viewIndex: clamped, selected: null, legalTargets: [] });
        }
      },
      goToStart:   () => get().goToMove(0),
      goToEnd:     () => get().goToMove(-1),
      goBack:      () => {
        const { viewIndex, moveHistory } = get();
        const cur = viewIndex === -1 ? moveHistory.length - 1 : viewIndex;
        get().goToMove(Math.max(0, cur - 1));
      },
      goForward:   () => {
        const { viewIndex, moveHistory } = get();
        if (viewIndex === -1) return;
        if (viewIndex >= moveHistory.length - 1) get().goToMove(-1);
        else get().goToMove(viewIndex + 1);
      },

      setAnalysis: (a) => set({ analysis: a }),
      setGameMode: (m) => set({ gameMode: m }),
      setDifficulty: (d) => set({ difficulty: d }),
      setTimeControl: (t) => set({ timeControl: t }),

      // ── UI ────────────────────────────────────────────────────────────
      activePage: "game",
      proModalOpen: false,
      sidebarTab: "moves",
      setActivePage: (p) => set({ activePage: p }),
      setProModalOpen: (v) => set({ proModalOpen: v }),
      setSidebarTab: (t) => set({ sidebarTab: t }),
    }),
    {
      name: "chess-store-v4",
      partialize: (s) => ({
        user: s.user,
        gameMode: s.gameMode,
        difficulty: s.difficulty,
        timeControl: s.timeControl,
      }),
    }
  )
);
