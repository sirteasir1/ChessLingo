"use client";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { SHOP_ITEMS, getRarityColor, getRarityGlow } from "@/lib/shop-data";
import { updateUserCoins, updateUserEquipped } from "@/lib/auth-actions";
import type { ItemCategory } from "@/types";

const CATS: { id: ItemCategory | "all"; label: string; icon: string }[] = [
  { id: "all",     label: "All",     icon: "🌟" },
  { id: "pieces",  label: "Pieces",  icon: "♟"  },
  { id: "boards",  label: "Boards",  icon: "🎯"  },
  { id: "effects", label: "Effects", icon: "✨"  },
  { id: "avatars", label: "Avatars", icon: "👤"  },
];

export default function ShopPage() {
  const [cat, setCat] = useState<ItemCategory | "all">("all");
  const [buying, setBuying] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const { user, setUser } = useStore();

  if (!user) return null;

  const coins    = user.coins;
  const owned    = user.inventory;
  const equipped = user.equipped;

  const items = cat === "all" ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === cat);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleItem = async (id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || buying) return;

    const newEquipped = { ...user.equipped };
    const newInventory = [...user.inventory];

    if (owned.includes(id)) {
      // Equip it
      if (item.category === "pieces") newEquipped.pieceSet = id;
      if (item.category === "boards") newEquipped.board = id;
      if (item.category === "avatars") newEquipped.avatar = id;
      if (item.category === "effects") newEquipped.effect = id;

      setUser({ ...user, equipped: newEquipped });
      try { await updateUserEquipped(user.uid, newEquipped, newInventory); } catch {}
      showNotification(`✅ Equipped ${item.name}!`);
      return;
    }

    if (user.coins < item.price) {
      showNotification("🪙 Not enough coins!");
      return;
    }

    setBuying(id);
    try {
      const newCoins = user.coins - item.price;
      newInventory.push(id);
      if (item.category === "pieces") newEquipped.pieceSet = id;
      if (item.category === "boards") newEquipped.board = id;
      if (item.category === "avatars") newEquipped.avatar = id;
      if (item.category === "effects") newEquipped.effect = id;

      setUser({ ...user, coins: newCoins, inventory: newInventory, equipped: newEquipped });
      await updateUserCoins(user.uid, newCoins);
      await updateUserEquipped(user.uid, newEquipped, newInventory);
      showNotification(`🎉 Purchased ${item.name}!`);
    } catch {
      showNotification("❌ Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  const isOwned    = (id: string) => owned.includes(id);
  const isEquipped = (id: string) => Object.values(equipped).includes(id);

  return (
    <div className="overflow-y-auto h-full p-6 relative">
      {/* Notification toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-bg-surface border border-border-default px-6 py-3 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,.6)] text-sm font-semibold animate-slide-up">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-display font-bold">🎨 Shop</h1>
          <p className="text-text-muted text-sm mt-0.5">Customize your chess experience</p>
        </div>
        <div className="flex items-center gap-2 bg-bg-elevated px-4 py-2.5 rounded-2xl border border-border-subtle text-accent-gold font-bold">
          🪙 {coins.toLocaleString()}
          <span className="text-text-muted text-xs font-normal ml-1">coins</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 max-w-5xl mx-auto flex-wrap">
        {CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.02]
              ${cat === c.id
                ? "bg-accent-purple border-accent-purple text-white shadow-glow"
                : "border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary"}`}>
            <span>{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid gap-4 max-w-5xl mx-auto"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
        {items.map(item => {
          const isOwnedItem = isOwned(item.id);
          const isEquippedItem = isEquipped(item.id);
          const canAfford = coins >= item.price;
          const isBuying = buying === item.id;

          return (
            <div
              key={item.id}
              onClick={() => !isBuying && handleItem(item.id)}
              className={`relative bg-bg-surface border rounded-2xl p-4 text-center cursor-pointer
                transition-all duration-200 hover:scale-[1.03] group ${getRarityGlow(item.rarity)}
                ${isEquippedItem ? "border-accent-gold bg-[#1a1500] shadow-glow-gold" :
                  isOwnedItem    ? "border-emerald-500/60 bg-[#0d1a10]"            :
                  "border-border-subtle hover:border-border-default"}`}
            >
              {/* Owned/equipped badge */}
              {isOwnedItem && !isEquippedItem && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✓</div>
              )}
              {isEquippedItem && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-accent-gold rounded-full flex items-center justify-center text-[10px] text-black font-bold">★</div>
              )}

              {/* Pro badge */}
              {item.isPro && (
                <div className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-accent-gold to-accent-gold2 text-black font-bold">PRO</div>
              )}

              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{item.preview}</div>
              <div className="font-semibold text-sm mb-1">{item.name}</div>

              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getRarityColor(item.rarity)}`}>
                {item.rarity}
              </span>

              <div className="mt-2 text-xs text-text-muted leading-snug min-h-[32px]">{item.description}</div>

              <button
                disabled={isBuying || (!isOwnedItem && !canAfford && item.price > 0)}
                className={`mt-3 w-full py-1.5 rounded-lg text-xs font-bold transition-all
                  ${isEquippedItem  ? "bg-[#2a2000] text-accent-gold cursor-default"                  :
                    isOwnedItem     ? "bg-[#0d2010] text-emerald-400 hover:bg-[#0d2a18]"              :
                    item.price === 0 ? "bg-accent-purple text-white"                                  :
                    canAfford        ? "bg-gradient-to-r from-accent-purple to-accent-violet text-white hover:opacity-90" :
                    "bg-bg-card text-text-muted cursor-not-allowed"}`}
              >
                {isBuying ? (
                  <span className="inline-block w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                ) : isEquippedItem ? "✓ Equipped" :
                     isOwnedItem   ? "Equip"      :
                     item.price === 0 ? "Free"    :
                     `🪙 ${item.price.toLocaleString()}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
