import type {
  BoardState,
  Color,
  PieceCode,
  PieceType,
  Square,
  Move,
  MoveRecord,
  CastlingRights,
} from "@/types";

// ─── Constants ─────────────────────────────────────────────────────────────
export const PIECE_VALUES: Record<PieceType, number> = {
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000,
};

export const UNICODE: Record<PieceCode, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

export const PIECE_SETS: Record<string, Record<PieceCode, string>> = {
  classic: UNICODE,
  neon: { wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟" },
};

// ─── Coordinate helpers ────────────────────────────────────────────────────
export const row = (s: Square) => Math.floor(s / 8);
export const col = (s: Square) => s % 8;
export const sq = (r: number, c: number): Square => r * 8 + c;
export const sqName = (s: Square) =>
  String.fromCharCode(97 + col(s)) + (8 - row(s));
export const nameToSq = (name: string): Square =>
  sq(8 - parseInt(name[1]), name.charCodeAt(0) - 97);
export const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

// ─── Board init ────────────────────────────────────────────────────────────
export function createInitialBoard(): Record<Square, PieceCode | undefined> {
  const board: Record<Square, PieceCode | undefined> = {};
  const back: PieceType[] = ["R","N","B","Q","K","B","N","R"];
  back.forEach((p, c) => {
    board[sq(0, c)] = `b${p}` as PieceCode;
    board[sq(7, c)] = `w${p}` as PieceCode;
  });
  for (let c = 0; c < 8; c++) {
    board[sq(1, c)] = "bP";
    board[sq(6, c)] = "wP";
  }
  return board;
}

export function createInitialState(): BoardState {
  return {
    board: createInitialBoard(),
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfMoves: 0,
    fullMoves: 1,
  };
}

// ─── King finder ───────────────────────────────────────────────────────────
export function findKing(
  board: Record<Square, PieceCode | undefined>,
  color: Color
): Square {
  for (let s = 0; s < 64; s++) {
    if (board[s] === `${color}K`) return s;
  }
  return -1;
}

// ─── Attack squares (ignores turn/legality) ────────────────────────────────
export function getAttacks(
  board: Record<Square, PieceCode | undefined>,
  from: Square,
  color: Color
): Square[] {
  const piece = board[from];
  if (!piece) return [];
  const type = piece[1] as PieceType;
  const opp: Color = color === "w" ? "b" : "w";
  const r = row(from), c = col(from);
  const attacks: Square[] = [];

  const push = (nr: number, nc: number): boolean => {
    if (!inBounds(nr, nc)) return false;
    const t = sq(nr, nc);
    if (board[t]?.[0] === color) return false;
    attacks.push(t);
    return !board[t];
  };

  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    if (inBounds(r + dir, c - 1)) attacks.push(sq(r + dir, c - 1));
    if (inBounds(r + dir, c + 1)) attacks.push(sq(r + dir, c + 1));
    return attacks;
  }
  if (type === "N") {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(
      ([dr,dc]) => push(r+dr, c+dc)
    );
    return attacks;
  }
  if (type === "K") {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (dr || dc) push(r+dr, c+dc);
    return attacks;
  }
  const dirs: [number,number][] = [];
  if (type === "R" || type === "Q") dirs.push([0,1],[0,-1],[1,0],[-1,0]);
  if (type === "B" || type === "Q") dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
  dirs.forEach(([dr,dc]) => {
    let nr = r+dr, nc = c+dc;
    while (push(nr, nc)) { nr += dr; nc += dc; }
  });
  return attacks;
}

// ─── Check detection ───────────────────────────────────────────────────────
export function isInCheck(
  board: Record<Square, PieceCode | undefined>,
  color: Color
): boolean {
  const king = findKing(board, color);
  if (king === -1) return true;
  const opp: Color = color === "w" ? "b" : "w";
  for (let s = 0; s < 64; s++) {
    if (board[s]?.[0] === opp) {
      if (getAttacks(board, s, opp).includes(king)) return true;
    }
  }
  return false;
}

// ─── Legal move generator ──────────────────────────────────────────────────
export function getLegalMoves(state: BoardState, from: Square): Square[] {
  const { board, turn, castling, enPassant } = state;
  const piece = board[from];
  if (!piece || piece[0] !== turn) return [];

  const type = piece[1] as PieceType;
  const opp: Color = turn === "w" ? "b" : "w";
  const r = row(from), c = col(from);
  const pseudo: Square[] = [];

  if (type === "P") {
    const dir = turn === "w" ? -1 : 1;
    const startRow = turn === "w" ? 6 : 1;
    const nr = r + dir;
    if (inBounds(nr, 0)) {
      if (!board[sq(nr, c)]) {
        pseudo.push(sq(nr, c));
        if (r === startRow && !board[sq(nr + dir, c)])
          pseudo.push(sq(nr + dir, c));
      }
      if (c > 0 && board[sq(nr, c-1)]?.[0] === opp) pseudo.push(sq(nr, c-1));
      if (c < 7 && board[sq(nr, c+1)]?.[0] === opp) pseudo.push(sq(nr, c+1));
      if (enPassant !== null) {
        if (c > 0 && sq(nr, c-1) === enPassant) pseudo.push(enPassant);
        if (c < 7 && sq(nr, c+1) === enPassant) pseudo.push(enPassant);
      }
    }
  } else {
    pseudo.push(...getAttacks(board, from, turn));
  }

  // Castling
  if (type === "K") {
    const backRow = turn === "w" ? 7 : 0;
    if (r === backRow && c === 4 && !isInCheck(board, turn)) {
      if (castling[`${turn}K` as keyof CastlingRights] &&
          !board[sq(backRow,5)] && !board[sq(backRow,6)] &&
          board[sq(backRow,7)] === `${turn}R`) {
        const b5 = Object.assign({}, board, { [sq(backRow,5)]: `${turn}K` as PieceCode });
        delete b5[sq(backRow,4)];
        if (!isInCheck(b5, turn)) pseudo.push(sq(backRow, 6));
      }
      if (castling[`${turn}Q` as keyof CastlingRights] &&
          !board[sq(backRow,3)] && !board[sq(backRow,2)] && !board[sq(backRow,1)] &&
          board[sq(backRow,0)] === `${turn}R`) {
        const b3 = Object.assign({}, board, { [sq(backRow,3)]: `${turn}K` as PieceCode });
        delete b3[sq(backRow,4)];
        if (!isInCheck(b3, turn)) pseudo.push(sq(backRow, 2));
      }
    }
  }

  // Filter moves that leave king in check
  return pseudo.filter((to) => {
    const nb = Object.assign({}, board) as typeof board;
    const pt = piece[1] as PieceType;
    if (pt === "P" && to === enPassant) {
      delete nb[sq(r, col(to))];
    }
    if (pt === "K" && Math.abs(col(to) - c) === 2) {
      const backRow = turn === "w" ? 7 : 0;
      if (col(to) > c) {
        nb[sq(backRow, 5)] = `${turn}R` as PieceCode;
        delete nb[sq(backRow, 7)];
      } else {
        nb[sq(backRow, 3)] = `${turn}R` as PieceCode;
        delete nb[sq(backRow, 0)];
      }
    }
    nb[to] = piece;
    delete nb[from];
    return !isInCheck(nb, turn);
  });
}

// ─── Apply move ────────────────────────────────────────────────────────────
export function applyMove(
  state: BoardState,
  move: Move,
  promotion: PieceType = "Q"
): { next: BoardState; record: Partial<MoveRecord> } {
  const { board, turn, castling, enPassant, halfMoves, fullMoves } = state;
  const piece = board[move.from]!;
  const type = piece[1] as PieceType;
  const r = row(move.from), c = col(move.from);
  const tc = col(move.to);
  const captured = board[move.to];

  const nb = Object.assign({}, board) as typeof board;
  const nc = Object.assign({}, castling);
  let newEP: Square | null = null;

  // En passant capture
  if (type === "P" && move.to === enPassant) {
    delete nb[sq(r, tc)];
  }

  // Castling
  if (type === "K") {
    nc[`${turn}K` as keyof CastlingRights] = false;
    nc[`${turn}Q` as keyof CastlingRights] = false;
    if (Math.abs(tc - c) === 2) {
      const backRow = turn === "w" ? 7 : 0;
      if (tc > c) { nb[sq(backRow,5)] = `${turn}R` as PieceCode; delete nb[sq(backRow,7)]; }
      else         { nb[sq(backRow,3)] = `${turn}R` as PieceCode; delete nb[sq(backRow,0)]; }
    }
  }
  if (type === "R") {
    if (c === 0) nc[`${turn}Q` as keyof CastlingRights] = false;
    if (c === 7) nc[`${turn}K` as keyof CastlingRights] = false;
  }

  // Double pawn push → en passant square
  if (type === "P" && Math.abs(row(move.to) - r) === 2) {
    newEP = sq((r + row(move.to)) / 2, c);
  }

  const isPromo = type === "P" && (row(move.to) === 0 || row(move.to) === 7);
  nb[move.to] = isPromo ? (`${turn}${promotion}` as PieceCode) : piece;
  delete nb[move.from];

  const opp: Color = turn === "w" ? "b" : "w";
  const inChk = isInCheck(nb, opp);
  const hasMoves = hasAnyLegalMove({ board: nb, turn: opp, castling: nc, enPassant: newEP, halfMoves: 0, fullMoves: 0 });

  const san = buildSAN(state, move, piece, captured, promotion, inChk, !hasMoves);

  const next: BoardState = {
    board: nb,
    turn: opp,
    castling: nc,
    enPassant: newEP,
    halfMoves: type === "P" || captured ? 0 : halfMoves + 1,
    fullMoves: turn === "b" ? fullMoves + 1 : fullMoves,
  };

  return {
    next,
    record: {
      from: move.from,
      to: move.to,
      piece,
      captured,
      promotion: isPromo ? promotion : undefined,
      san,
      uci: sqName(move.from) + sqName(move.to) + (isPromo ? promotion.toLowerCase() : ""),
      isCheck: inChk,
      isMate: inChk && !hasMoves,
    },
  };
}

// ─── SAN builder ──────────────────────────────────────────────────────────
function buildSAN(
  state: BoardState, move: Move, piece: PieceCode,
  captured: PieceCode | undefined, promo: PieceType,
  isCheck: boolean, isMate: boolean
): string {
  const type = piece[1] as PieceType;
  const c = col(move.from), tc = col(move.to);
  if (type === "K" && Math.abs(tc - c) === 2)
    return tc > c ? "O-O" : "O-O-O";
  let san = type !== "P" ? type : "";
  if (type === "P" && captured) san += String.fromCharCode(97 + c);
  if (captured) san += "x";
  san += sqName(move.to);
  if (type === "P" && (row(move.to) === 0 || row(move.to) === 7))
    san += "=" + promo;
  if (isMate) san += "#";
  else if (isCheck) san += "+";
  return san;
}

// ─── Has any legal move ────────────────────────────────────────────────────
export function hasAnyLegalMove(state: BoardState): boolean {
  for (let s = 0; s < 64; s++) {
    if (state.board[s]?.[0] === state.turn) {
      if (getLegalMoves(state, s).length > 0) return true;
    }
  }
  return false;
}

// ─── Static evaluator (for AI) ─────────────────────────────────────────────
const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

export function evaluate(board: Record<Square, PieceCode | undefined>): number {
  let score = 0;
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (!p) continue;
    const sign = p[0] === "w" ? 1 : -1;
    const type = p[1] as PieceType;
    let val = PIECE_VALUES[type];
    if (type === "P") {
      const pstIdx = p[0] === "w" ? s : 63 - s;
      val += PST_PAWN[pstIdx] ?? 0;
    }
    score += sign * val;
  }
  return score;
}

// ─── Minimax AI ─────────────────────────────────────────────────────────────
export function getBestMove(
  state: BoardState,
  depth: number
): Move | null {
  let best: Move | null = null;
  let bestScore = -Infinity;

  for (let s = 0; s < 64; s++) {
    if (state.board[s]?.[0] !== state.turn) continue;
    for (const to of getLegalMoves(state, s)) {
      const { next } = applyMove(state, { from: s, to });
      const score = -minimax(next, depth - 1, -Infinity, Infinity);
      if (score > bestScore) { bestScore = score; best = { from: s, to }; }
    }
  }
  return best;
}

function minimax(
  state: BoardState, depth: number, alpha: number, beta: number
): number {
  if (depth === 0) return evaluate(state.board) * (state.turn === "w" ? 1 : -1);
  let best = -Infinity;
  for (let s = 0; s < 64; s++) {
    if (state.board[s]?.[0] !== state.turn) continue;
    for (const to of getLegalMoves(state, s)) {
      const { next } = applyMove(state, { from: s, to });
      const score = -minimax(next, depth - 1, -beta, -alpha);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) return best;
    }
  }
  return best === -Infinity ? (isInCheck(state.board, state.turn) ? -20000 : 0) : best;
}

// ─── FEN helpers ───────────────────────────────────────────────────────────
export function boardToFen(state: BoardState): string {
  const { board, turn, castling, enPassant, halfMoves, fullMoves } = state;
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[sq(r, c)];
      if (p) {
        if (empty) { row += empty; empty = 0; }
        const letter = p[1];
        row += p[0] === "w" ? letter.toUpperCase() : letter.toLowerCase();
      } else empty++;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  const cast = [
    castling.wK ? "K" : "", castling.wQ ? "Q" : "",
    castling.bK ? "k" : "", castling.bQ ? "q" : "",
  ].join("") || "-";
  return `${rows.join("/")} ${turn} ${cast} ${enPassant ? sqName(enPassant) : "-"} ${halfMoves} ${fullMoves}`;
}
export const PIECE_NAMES: Record<string,string> = { wP:'Pawn', bP:'Pawn', wN:'Knight', bN:'Knight', wB:'Bishop', bB:'Bishop', wR:'Rook', bR:'Rook', wQ:'Queen', bQ:'Queen', wK:'King', bK:'King' };

// ─── Piece-Square Tables (centipawns) ────────────────────────────────────────
// Knight PST
export const PST_KNIGHT: number[] = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];
// Bishop PST
export const PST_BISHOP: number[] = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];
// Rook PST
export const PST_ROOK: number[] = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];
// Queen PST
export const PST_QUEEN: number[] = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];
// King PST (middlegame - stay safe)
export const PST_KING_MG: number[] = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

export function evaluateStrong(board: Record<Square, PieceCode | undefined>, turn: Color): number {
  let score = 0;
  const VALS: Record<PieceType, number> = { P:100, N:320, B:330, R:500, Q:900, K:20000 };

  // Count material and PST
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (!p) continue;
    const isWhite = p[0] === "w";
    const sign = isWhite ? 1 : -1;
    const type = p[1] as PieceType;
    const idx  = isWhite ? s : 63 - s;
    let val = VALS[type];
    if (type === "P") val += PST_PAWN[idx] ?? 0;
    if (type === "N") val += PST_KNIGHT[idx] ?? 0;
    if (type === "B") val += PST_BISHOP[idx] ?? 0;
    if (type === "R") val += PST_ROOK[idx] ?? 0;
    if (type === "Q") val += PST_QUEEN[idx] ?? 0;
    if (type === "K") val += PST_KING_MG[idx] ?? 0;
    score += sign * val;
  }

  // Mobility bonus: reward having more legal moves (≈ 3 cp per move)
  const wState: BoardState = { board, turn: "w", castling: { wK:false, wQ:false, bK:false, bQ:false }, enPassant: null, halfMoves: 0, fullMoves: 1 };
  const bState: BoardState = { ...wState, turn: "b" };
  let wMob = 0, bMob = 0;
  for (let s = 0; s < 64; s++) {
    if (board[s]?.[0] === "w") wMob += getLegalMoves(wState, s).length;
    if (board[s]?.[0] === "b") bMob += getLegalMoves(bState, s).length;
  }
  score += (wMob - bMob) * 3;

  // Bishop pair bonus
  let wBishops = 0, bBishops = 0;
  for (let s = 0; s < 64; s++) {
    if (board[s] === "wB") wBishops++;
    if (board[s] === "bB") bBishops++;
  }
  if (wBishops >= 2) score += 30;
  if (bBishops >= 2) score -= 30;

  // Doubled pawns penalty
  for (let c = 0; c < 8; c++) {
    let wPawns = 0, bPawns = 0;
    for (let r = 0; r < 8; r++) {
      if (board[sq(r, c)] === "wP") wPawns++;
      if (board[sq(r, c)] === "bP") bPawns++;
    }
    if (wPawns > 1) score -= (wPawns - 1) * 20;
    if (bPawns > 1) score += (bPawns - 1) * 20;
  }

  return score * (turn === "w" ? 1 : -1);
}

// MVV-LVA move ordering helper
function orderMoves(state: BoardState, moves: { from: Square; to: Square }[]): { from: Square; to: Square }[] {
  const VALS: Record<string, number> = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
  return [...moves].sort((a, b) => {
    const av = state.board[a.to] ? VALS[state.board[a.to]![1]] ?? 0 : 0;
    const bv = state.board[b.to] ? VALS[state.board[b.to]![1]] ?? 0 : 0;
    // Also slightly prefer moving higher-value pieces to center
    const aFromVal = state.board[a.from] ? VALS[state.board[a.from]![1]] ?? 0 : 0;
    const bFromVal = state.board[b.from] ? VALS[state.board[b.from]![1]] ?? 0 : 0;
    return (bv * 10 - bFromVal) - (av * 10 - aFromVal);
  });
}

export function getBestMoveStrong(state: BoardState, difficulty: number): Move | null {
  // Time-limited iterative deepening
  // difficulty: 1=easy(350ms,d3), 2=medium(700ms,d4), 3=hard(1400ms,d5), 4=master(2500ms,d6)
  const timeBudgets: Record<number, number> = { 1: 350, 2: 700, 3: 1400, 4: 2500 };
  const maxDepths:   Record<number, number> = { 1: 3,   2: 4,   3: 5,    4: 6   };
  const timeBudget = timeBudgets[difficulty] ?? 700;
  const maxDepth   = maxDepths[difficulty]   ?? 4;
  const deadline   = Date.now() + timeBudget;

  const moves: { from: Square; to: Square }[] = [];
  for (let s = 0; s < 64; s++) {
    if (state.board[s]?.[0] !== state.turn) continue;
    for (const to of getLegalMoves(state, s)) moves.push({ from: s as Square, to: to as Square });
  }
  if (moves.length === 0) return null;
  const ordered = orderMoves(state, moves);

  let best: Move = ordered[0];

  // Iterative deepening: depth 1 → maxDepth, keep last complete result
  for (let d = 1; d <= maxDepth; d++) {
    if (Date.now() >= deadline) break;
    let iterBest: Move | null = null;
    let iterScore = -Infinity;
    for (const mv of ordered) {
      if (Date.now() >= deadline) break;
      const { next } = applyMove(state, mv);
      const score = -minimaxStrong(next, d - 1, -Infinity, Infinity, deadline);
      if (score > iterScore) { iterScore = score; iterBest = mv; }
    }
    if (iterBest) best = iterBest;
  }
  return best;
}

function minimaxStrong(state: BoardState, depth: number, alpha: number, beta: number, deadline: number): number {
  if (Date.now() >= deadline) return evaluateStrong(state.board, state.turn);
  if (depth === 0) return quiescenceStrong(state, alpha, beta, 4);
  let best = -Infinity;
  const mvList: { from: Square; to: Square }[] = [];
  for (let s = 0; s < 64; s++) {
    if (state.board[s]?.[0] !== state.turn) continue;
    for (const to of getLegalMoves(state, s)) mvList.push({ from: s as Square, to: to as Square });
  }
  orderMoves(state, mvList);
  for (const mv of mvList) {
    const { next } = applyMove(state, mv);
    const score = -minimaxStrong(next, depth - 1, -beta, -alpha, deadline);
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) return best; // alpha-beta cutoff
  }
  return best === -Infinity ? (isInCheck(state.board, state.turn) ? -19000 + depth * 10 : 0) : best;
}

function quiescenceStrong(state: BoardState, alpha: number, beta: number, qdepth: number): number {
  const stand = evaluateStrong(state.board, state.turn);
  if (qdepth === 0) return stand;
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  for (let s = 0; s < 64; s++) {
    if (state.board[s]?.[0] !== state.turn) continue;
    for (const to of getLegalMoves(state, s)) {
      if (!state.board[to]) continue; // captures only
      const { next } = applyMove(state, { from: s, to });
      const score = -quiescenceStrong(next, -beta, -alpha, qdepth - 1);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
  }
  return alpha;
}

function quiescence(state: BoardState, alpha: number, beta: number, qdepth: number): number {
  const stand = evaluateStrong(state.board, state.turn);
  if (qdepth === 0) return stand;
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  for (let s = 0; s < 64; s++) {
    if (state.board[s]?.[0] !== state.turn) continue;
    for (const to of getLegalMoves(state, s)) {
      if (!state.board[to]) continue; // only captures
      const { next } = applyMove(state, { from: s, to });
      const score = -quiescence(next, -beta, -alpha, qdepth - 1);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
  }
  return alpha;
}
