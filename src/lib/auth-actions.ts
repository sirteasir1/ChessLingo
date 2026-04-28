import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import type { UserProfile, UserStats, EquippedItems, GameSession } from "@/types";

export function getRankTier(rating: number) {
  if (rating >= 2500) return "King";
  if (rating >= 1800) return "Queen";
  if (rating >= 1200) return "Rook";
  if (rating >= 800)  return "Bishop";
  if (rating >= 400)  return "Knight";
  return "Pawn";
}

export function createEmptyProfile(uid: string, displayName: string, email: string): UserProfile {
  return {
    uid,
    displayName,
    email,
    city: "Unknown",
    country: "KZ",
    rating: 1200,
    coins: 500,
    xp: 0,
    rank: "Pawn",
    streak: 0,
    stats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      bestRating: 1200,
      avgAccuracy: 0,
      favOpening: "—",
      totalMoves: 0,
    },
    inventory: ["classic_pieces", "classic_board"],
    equipped: {
      pieceSet: "classic_pieces",
      board: "classic_board",
      avatar: "",
      effect: "",
    },
    isPro: false,
    createdAt: Date.now(),
  };
}

export async function saveUserToFirestore(profile: UserProfile) {
  const ref = doc(db, "users", profile.uid);
  await setDoc(ref, {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadUserFromFirestore(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  const profile = createEmptyProfile(cred.user.uid, displayName, email);
  await saveUserToFirestore(profile);
  return profile;
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  let profile = await loadUserFromFirestore(cred.user.uid);
  if (!profile) {
    profile = createEmptyProfile(cred.user.uid, cred.user.displayName ?? "Player", email);
    await saveUserToFirestore(profile);
  }
  return profile;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  let profile = await loadUserFromFirestore(cred.user.uid);
  if (!profile) {
    profile = createEmptyProfile(
      cred.user.uid,
      cred.user.displayName ?? "Player",
      cred.user.email ?? ""
    );
    if (cred.user.photoURL) profile.photoURL = cred.user.photoURL;
    await saveUserToFirestore(profile);
  }
  return profile;
}

export async function logout() {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Update user stats and coins in Firestore after game
export async function saveGameResult(
  uid: string,
  result: "win" | "loss" | "draw",
  accuracy: number,
  moves: number,
  ratingDelta: number,
  coinsEarned: number,
  gameData: {
    mode: string;
    difficulty: string;
    pgn: string;
    moveHistory: unknown[];
    whitePlayer: string;
    blackPlayer: string;
    analysis?: unknown;
  }
) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as UserProfile;
  const stats = { ...(data.stats ?? {}) } as UserStats;

  stats.gamesPlayed = (stats.gamesPlayed ?? 0) + 1;
  if (result === "win")  stats.wins   = (stats.wins   ?? 0) + 1;
  if (result === "loss") stats.losses = (stats.losses ?? 0) + 1;
  if (result === "draw") stats.draws  = (stats.draws  ?? 0) + 1;
  stats.totalMoves = (stats.totalMoves ?? 0) + moves;
  stats.avgAccuracy = stats.gamesPlayed > 1
    ? Math.round(((stats.avgAccuracy ?? 0) * (stats.gamesPlayed - 1) + accuracy) / stats.gamesPlayed)
    : accuracy;

  const newRating = Math.max(100, (data.rating ?? 1200) + ratingDelta);
  stats.bestRating = Math.max(stats.bestRating ?? 1200, newRating);

  const newStreak = result === "win" ? (data.streak ?? 0) + 1 : 0;
  const newXp     = (data.xp ?? 0) + (result === "win" ? 50 : 15);
  const newCoins  = (data.coins ?? 0) + coinsEarned;
  const newRank   = getRankTier(newRating);

  await updateDoc(ref, {
    stats,
    rating: newRating,
    streak: newStreak,
    xp: newXp,
    coins: newCoins,
    rank: newRank,
    updatedAt: serverTimestamp(),
  });

  // Strip undefined values — Firestore rejects them
  function stripUndefined(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(stripUndefined);
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, stripUndefined(v)])
      );
    }
    return obj;
  }
  const cleanGameData = stripUndefined(gameData) as typeof gameData;

  // Save game history
  await addDoc(collection(db, 'games'), {
    uid,
    result,
    accuracy,
    ratingDelta,
    coinsEarned,
    timestamp: serverTimestamp(),
    ...cleanGameData,
  });

  return { newRating, newCoins, newStreak, newXp, newRank, stats };
}

// Get game history for a user
export async function getUserGames(uid: string, limitCount = 20) {
  try {
    // Try with orderBy first (requires composite index in Firestore)
    const q = query(
      collection(db, "games"),
      where("uid", "==", uid),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e: unknown) {
    // Fallback without orderBy if index doesn't exist yet
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("index") || msg.includes("requires an index")) {
      console.warn("Firestore index missing for games — fetching without sort. Create index at:", 
        "https://console.firebase.google.com → Firestore → Indexes → Add: uid ASC + timestamp DESC");
      const q2 = query(
        collection(db, "games"),
        where("uid", "==", uid),
        limit(limitCount)
      );
      const snap2 = await getDocs(q2);
      const docs = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side
      return docs.sort((a: any, b: any) => {
        const ta = a.timestamp?.seconds ?? 0;
        const tb = b.timestamp?.seconds ?? 0;
        return tb - ta;
      });
    }
    throw e;
  }
}

// Update user profile fields (coins, equipped, inventory)
export async function updateUserCoins(uid: string, coins: number) {
  await updateDoc(doc(db, "users", uid), { coins, updatedAt: serverTimestamp() });
}

export async function updateUserEquipped(uid: string, equipped: EquippedItems, inventory: string[]) {
  await updateDoc(doc(db, "users", uid), { equipped, inventory, updatedAt: serverTimestamp() });
}
