import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city  = searchParams.get("city") ?? "all";
  const limit = parseInt(searchParams.get("limit") ?? "50");

  try {
    if (!adminDb) throw new Error("Admin DB not initialized");

    let q = adminDb.collection("users")
      .orderBy("rating", "desc")
      .limit(limit);

    if (city !== "all") {
      q = (q as ReturnType<typeof adminDb.collection>)
        .where("city", "==", city)
        .orderBy("rating", "desc")
        .limit(limit) as typeof q;
    }

    const snap = await q.get();
    const entries = snap.docs.map((doc, i) => {
      const d = doc.data();
      return {
        rank: i + 1,
        uid: doc.id,
        displayName: d.displayName ?? "Anonymous",
        city: d.city ?? "Unknown",
        country: d.country ?? "KZ",
        rating: d.rating ?? 1200,
        wins: d.stats?.wins ?? 0,
        streak: d.streak ?? 0,
        rankTier: d.rank ?? "Pawn",
        equipped: d.equipped ?? {},
      };
    });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ entries: [] });
  }
}
