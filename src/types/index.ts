// ─── Chess Core ────────────────────────────────────────────────────────────
export type Color = "w" | "b";
export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type PieceCode = `${Color}${PieceType}`;
export type Square = number; // 0–63, row-major

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  san?: string;
  uci?: string;
}

export interface MoveRecord extends Move {
  piece: PieceCode;
  captured?: PieceCode;
  isCheck?: boolean;
  isMate?: boolean;
  thinkMs?: number;       // milliseconds the player spent
  evalBefore?: number;    // centipawns before move
  evalAfter?: number;     // centipawns after move
  classification?: MoveClassification;
}

export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "miss";

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface BoardState {
  board: Record<Square, PieceCode | undefined>;
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
  halfMoves: number;
  fullMoves: number;
}

// ─── Game Session ──────────────────────────────────────────────────────────
export type GameMode = "ai" | "friend" | "puzzle" | "ranked" | "english";
export type Difficulty = "bullet" | "easy" | "medium" | "hard" | "master";
export type TimeControl = 1 | 3 | 5 | 10 | 15 | 30 | 0;

export interface GameSession {
  id: string;
  mode: GameMode;
  difficulty: Difficulty;
  timeControl: TimeControl;
  whitePlayerId: string;
  blackPlayerId: string;
  moves: MoveRecord[];
  result: GameResult | null;
  startedAt: number;
  endedAt?: number;
  pgn?: string;
}

export type GameResult =
  | { winner: Color; reason: "checkmate" | "timeout" | "resign" }
  | { winner: null; reason: "stalemate" | "draw" | "agreement" };

// ─── Analysis ─────────────────────────────────────────────────────────────
export type PlayerStyle =
  | "Aggressive Attacker"
  | "Positional Player"
  | "Tactical Fighter"
  | "Solid Defender"
  | "Creative Genius"
  | "Endgame Specialist";

export interface GameAnalysis {
  accuracy: { white: number; black: number };
  playerStyle: PlayerStyle;
  stats: {
    brilliant: number;
    great: number;
    best: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
  thinkHeatmap: number[];      // 64 values 0–1 per square
  keyMoments: KeyMoment[];
  coachMessages: string[];
  openingName?: string;
}

export interface KeyMoment {
  moveIndex: number;
  san: string;
  evaluation: number;
  suggestion?: string;
  comment: string;
  type: "blunder" | "brilliant" | "turning_point";
}

// ─── User & Ranks ──────────────────────────────────────────────────────────
export type RankTier =
  | "Pawn"
  | "Knight"
  | "Bishop"
  | "Rook"
  | "Queen"
  | "King";

export const RANK_THRESHOLDS: Record<RankTier, number> = {
  Pawn: 0,
  Knight: 400,
  Bishop: 800,
  Rook: 1200,
  Queen: 1800,
  King: 2500,
};

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  city: string;
  country: string;
  rating: number;
  coins: number;
  xp: number;
  rank: RankTier;
  streak: number;
  stats: UserStats;
  inventory: string[];        // item IDs
  equipped: EquippedItems;
  isPro: boolean;
  createdAt: number;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  bestRating: number;
  avgAccuracy: number;
  favOpening: string;
  totalMoves: number;
}

export interface EquippedItems {
  pieceSet: string;
  board: string;
  avatar: string;
  effect: string;
}

// ─── Shop ─────────────────────────────────────────────────────────────────
export type ItemRarity = "common" | "rare" | "epic" | "legendary";
export type ItemCategory = "pieces" | "boards" | "effects" | "avatars" | "emotes";

export interface ShopItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  price: number;            // coins; 0 = free
  stripePriceId?: string;   // if real-money purchase
  preview: string;          // emoji or image URL
  description: string;
  rankRequired?: RankTier;
  isPro?: boolean;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  city: string;
  country: string;
  rating: number;
  wins: number;
  streak: number;
  rankTier: RankTier;
  equipped: EquippedItems;
}

// ─── Multiplayer (WebSocket) ───────────────────────────────────────────────
export type WsEventType =
  | "join"
  | "move"
  | "offer_draw"
  | "accept_draw"
  | "resign"
  | "chat"
  | "reconnect"
  | "sync";

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
  gameId: string;
  userId: string;
  timestamp: number;
}
