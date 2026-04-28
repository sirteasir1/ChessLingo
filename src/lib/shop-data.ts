import type { ShopItem } from "@/types";

export const SHOP_ITEMS: ShopItem[] = [
  // ── Piece sets ────────────────────────────────────────────────────────
  {
    id: "classic_pieces",
    name: "Classic",
    category: "pieces",
    rarity: "common",
    price: 0,
    preview: "♟",
    description: "Timeless Staunton design — the default.",
  },
  {
    id: "neon_pieces",
    name: "Neon Glow",
    category: "pieces",
    rarity: "rare",
    price: 300,
    preview: "♛",
    description: "Electric neon outlines that pulse with energy.",
  },
  {
    id: "oak_pieces",
    name: "Oak Master",
    category: "pieces",
    rarity: "rare",
    price: 450,
    preview: "♚",
    description: "Rich oak texture — the feel of a real tournament set.",
  },
  {
    id: "crystal_pieces",
    name: "Crystal",
    category: "pieces",
    rarity: "epic",
    price: 800,
    preview: "♕",
    description: "Translucent crystal pieces that catch the light.",
  },
  {
    id: "dragon_pieces",
    name: "Dragon Lord",
    category: "pieces",
    rarity: "legendary",
    price: 1500,
    preview: "🐉",
    description: "Mythical dragon-themed set. Show your dominance.",
    rankRequired: "Queen",
  },
  {
    id: "samurai_pieces",
    name: "Samurai",
    category: "pieces",
    rarity: "legendary",
    price: 2000,
    preview: "⚔️",
    description: "Feudal Japan aesthetic. Every move is an art.",
    isPro: true,
  },

  // ── Boards ────────────────────────────────────────────────────────────
  {
    id: "classic_board",
    name: "Classic Wood",
    category: "boards",
    rarity: "common",
    price: 0,
    preview: "🟫",
    description: "The standard wooden board.",
  },
  {
    id: "galaxy_board",
    name: "Dark Galaxy",
    category: "boards",
    rarity: "rare",
    price: 350,
    preview: "🌌",
    description: "Play among the stars.",
  },
  {
    id: "marble_board",
    name: "White Marble",
    category: "boards",
    rarity: "epic",
    price: 600,
    preview: "⬜",
    description: "Luxury Italian marble finish.",
  },
  {
    id: "lava_board",
    name: "Lava Flow",
    category: "boards",
    rarity: "epic",
    price: 750,
    preview: "🌋",
    description: "Volcanic dark squares glow with molten fire.",
  },
  {
    id: "arctic_board",
    name: "Arctic Ice",
    category: "boards",
    rarity: "legendary",
    price: 1200,
    preview: "🧊",
    description: "Crystal ice board — for the coolest players.",
    isPro: true,
  },

  // ── Effects ───────────────────────────────────────────────────────────
  {
    id: "fx_explosion",
    name: "Explosion",
    category: "effects",
    rarity: "rare",
    price: 400,
    preview: "💥",
    description: "Pieces explode on capture.",
  },
  {
    id: "fx_sparkle",
    name: "Sparkle",
    category: "effects",
    rarity: "epic",
    price: 700,
    preview: "✨",
    description: "Golden sparkles trail every move.",
  },
  {
    id: "fx_lightning",
    name: "Lightning",
    category: "effects",
    rarity: "epic",
    price: 800,
    preview: "⚡",
    description: "Electric arcs when capturing high-value pieces.",
    isPro: true,
  },
  {
    id: "fx_ghost",
    name: "Ghost Trail",
    category: "effects",
    rarity: "legendary",
    price: 1100,
    preview: "👻",
    description: "A spectral afterimage follows every piece.",
    rankRequired: "Rook",
  },

  // ── Avatars ───────────────────────────────────────────────────────────
  {
    id: "av_wizard",
    name: "Wizard",
    category: "avatars",
    rarity: "rare",
    price: 250,
    preview: "🧙",
    description: "Strategic sorcerer frame.",
  },
  {
    id: "av_knight",
    name: "Dark Knight",
    category: "avatars",
    rarity: "rare",
    price: 300,
    preview: "🗡️",
    description: "Battle-hardened warrior frame.",
  },
  {
    id: "av_crown",
    name: "King Crown",
    category: "avatars",
    rarity: "legendary",
    price: 1200,
    preview: "👑",
    description: "For those who rule the board.",
    rankRequired: "King",
  },
  {
    id: "av_dragon_helm",
    name: "Dragon Helm",
    category: "avatars",
    rarity: "legendary",
    price: 1800,
    preview: "🐲",
    description: "Exclusive dragon-slayer frame.",
    isPro: true,
  },
];

export const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "common":    return "text-text-secondary bg-bg-elevated";
    case "rare":      return "text-blue-300 bg-blue-950";
    case "epic":      return "text-purple-300 bg-purple-950";
    case "legendary": return "text-amber-300 bg-amber-950";
    default:          return "";
  }
};

export const getRarityGlow = (rarity: string) => {
  switch (rarity) {
    case "rare":      return "hover:shadow-[0_0_20px_rgba(96,165,250,.3)]";
    case "epic":      return "hover:shadow-[0_0_20px_rgba(168,85,247,.35)]";
    case "legendary": return "hover:shadow-[0_0_24px_rgba(245,197,24,.4)]";
    default:          return "";
  }
};
