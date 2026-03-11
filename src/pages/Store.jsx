import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "all",        label: "TOUT",        icon: "🏪" },
  { key: "avatar",     label: "AVATARS",     icon: "🎭" },
  { key: "banner",     label: "BANNIERES",   icon: "🖼️" },
  { key: "frame",      label: "CADRES",      icon: "💠" },
  { key: "badge",      label: "BADGES",      icon: "🏅" },
  { key: "name_color", label: "NOM COLORÉ",  icon: "✨" },
  { key: "emote",      label: "EMOTES",      icon: "😎" },
  { key: "inventory",  label: "MON INVENTAIRE", icon: "🎒" },
];

const RARITY = {
  common:    { label: "COMMUN",    color: "#9ca3af", glow: "#9ca3af30", bg: "#9ca3af15" },
  rare:      { label: "RARE",      color: "#3b82f6", glow: "#3b82f630", bg: "#3b82f615" },
  epic:      { label: "ÉPIQUE",    color: "#a855f7", glow: "#a855f730", bg: "#a855f715" },
  legendary: { label: "LÉGEND.",   color: "#f59e0b", glow: "#f59e0b40", bg: "#f59e0b15" },
};

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

// ─── ITEM CARD ────────────────────────────────────────────────────────────────
function ItemCard({ item, owned, equipped, onBuy, onEquip, coins }) {
  const [hovered, setHovered]   = useState(false);
  const [buying, setBuying]     = useState(false);
  const [equipping, setEquipping] = useState(false);
  const rarity = RARITY[item.rarity] || RARITY.common;
  const canAfford = coins >= item.price;

  const handleBuy = async () => {
    if (buying || owned) return;
    setBuying(true);
    await onBuy(item);
    setBuying(false);
  };

  const handleEquip = async () => {
    if (equipping) return;
    setEquipping(true);
    await onEquip(item);
    setEquipping(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 14,
        border: `1px solid ${equipped ? rarity.color : hovered ? rarity.color + "60" : "rgba(255,255,255,0.07)"}`,
        background: equipped
          ? `linear-gradient(145deg, ${rarity.bg}, #0d0e1f)`
          : hovered
            ? `linear-gradient(145deg, rgba(255,255,255,0.04), #08031a)`
            : "#08031a",
        transition: "all 0.25s",
        overflow: "hidden",
        boxShadow: equipped ? `0 0 25px ${rarity.glow}` : hovered ? `0 4px 25px rgba(0,0,0,0.4)` : "none",
        cursor: "pointer",
      }}
    >
      {/* Rarity stripe top */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${rarity.color}, transparent)` }} />

      {/* Equipped badge */}
      {equipped && (
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          padding: "3px 8px", borderRadius: 99,
          background: rarity.color, color: "#000",
          fontSize: 9, fontWeight: 700, letterSpacing: 1,
        }}>
          ÉQUIPÉ
        </div>
      )}

      {/* Limited badge */}
      {item.limited && (
        <div style={{
          position: "absolute", top: equipped ? 32 : 10, right: 10, zIndex: 2,
          padding: "3px 8px", borderRadius: 99,
          background: "#ef4444", color: "#fff",
          fontSize: 9, fontWeight: 700, letterSpacing: 1,
        }}>
          LIMITÉ
        </div>
      )}

      {/* Image area */}
      <div style={{
        height: 160, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        background: `radial-gradient(circle at center, ${rarity.glow}, transparent 70%)`,
      }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
          />
        ) : (
          <div style={{ fontSize: 64, filter: `drop-shadow(0 0 15px ${rarity.color})` }}>
            {item.type === "avatar"     ? "🎭" :
             item.type === "banner"     ? "🖼️" :
             item.type === "badge"      ? "🏅" :
             item.type === "name_color" ? "✨" :
             item.type === "frame"      ? "💠" : "😎"}
          </div>
        )}

        {/* Name color preview */}
        {item.type === "name_color" && item.color_value && (
          <div style={{
            position: "absolute", bottom: 8,
            fontSize: 14, fontWeight: 800,
            color: item.color_value,
            textShadow: `0 0 15px ${item.color_value}`,
            fontFamily: "Orbitron, sans-serif",
            letterSpacing: 2,
          }}>
            VOTRE NOM
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
            color: rarity.color,
            padding: "2px 6px", borderRadius: 4,
            background: rarity.bg,
          }}>
            {rarity.label}
          </span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
            {item.type?.toUpperCase()}
          </span>
        </div>

        <h3 style={{
          fontSize: 14, fontWeight: 700, color: "#fff",
          fontFamily: "Rajdhani, sans-serif", letterSpacing: 1,
          marginBottom: 4, marginTop: 6,
        }}>
          {item.name}
        </h3>

        {item.description && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4, marginBottom: 12 }}>
            {item.description}
          </p>
        )}

        {/* Price + Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 16 }}>💰</span>
            <span style={{
              fontSize: 16, fontWeight: 800,
              color: item.source !== "store" ? "#10b981" : canAfford || owned ? "#f59e0b" : "#ef4444",
              fontFamily: "Orbitron, sans-serif",
            }}>
              {item.source !== "store" ? "GRATUIT" : item.price.toLocaleString()}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {owned ? (
              <button
                onClick={handleEquip}
                disabled={equipping || equipped}
                style={{
                  padding: "7px 14px", borderRadius: 8,
                  background: equipped
                    ? "rgba(255,255,255,0.05)"
                    : `linear-gradient(135deg, ${rarity.color}, ${rarity.color}cc)`,
                  border: "none", color: equipped ? "rgba(255,255,255,0.3)" : "#000",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  cursor: equipped ? "default" : "pointer",
                  transition: "all 0.2s",
                  opacity: equipping ? 0.7 : 1,
                }}
              >
                {equipping ? "..." : equipped ? "✓ ÉQUIPÉ" : "ÉQUIPER"}
              </button>
            ) : (
              <button
                onClick={handleBuy}
                disabled={buying || !canAfford}
                style={{
                  padding: "7px 14px", borderRadius: 8,
                  background: !canAfford
                    ? "rgba(239,68,68,0.15)"
                    : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  border: "none",
                  color: !canAfford ? "#ef4444" : "#fff",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  cursor: !canAfford ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: buying ? 0.7 : 1,
                }}
              >
                {buying ? "..." : !canAfford ? "INSUFFISANT" : "ACHETER"}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN STORE ───────────────────────────────────────────────────────────────
// ─── INVENTORY VIEW ──────────────────────────────────────────────────────────
function InventoryView({ userItems, items, onEquip, onUnequip }) {
  const [activeType, setActiveType] = useState("all");

  const itemTypes = [
    { key: "all",        label: "TOUT",   icon: "🎒" },
    { key: "avatar",     label: "AVATAR", icon: "🎭" },
    { key: "banner",     label: "BANN.",  icon: "🖼️" },
    { key: "frame",      label: "CADRE",  icon: "💠" },
    { key: "badge",      label: "BADGE",  icon: "🏅" },
    { key: "name_color", label: "NOM",    icon: "✨" },
    { key: "emote",      label: "EMOTE",  icon: "😎" },
  ];

  const ownedFull = userItems
    .map(ui => ({ ...ui, item: items.find(it => it.id === ui.item_id) }))
    .filter(ui => ui.item);

  const filtered = activeType === "all"
    ? ownedFull
    : ownedFull.filter(ui => ui.item.type === activeType);

  const equippedByType = {};
  ownedFull.filter(ui => ui.equipped).forEach(ui => {
    equippedByType[ui.item.type] = ui.item;
  });

  if (ownedFull.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎒</div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 16, letterSpacing: 2, fontFamily: "Orbitron, sans-serif" }}>
          INVENTAIRE VIDE
        </p>
        <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 13, marginTop: 8 }}>
          Achète des items dans la boutique !
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Equipped summary */}
      {Object.keys(equippedByType).length > 0 && (
        <div style={{
          background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)",
          borderRadius: 14, padding: "16px 20px", marginBottom: 28,
        }}>
          <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: 2, color: "#a855f7", marginBottom: 14 }}>
            ⚡ ACTUELLEMENT ÉQUIPÉ
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(equippedByType).map(([type, item]) => {
              const rc = RARITY[item.rarity] || RARITY.common;
              return (
                <div key={type} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: `${rc.color}10`, border: `1px solid ${rc.color}30`,
                  borderRadius: 10, padding: "8px 14px",
                }}>
                  {item.image_url
                    ? <img src={item.image_url} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
                    : <span style={{ fontSize: 22 }}>
                        {type === "avatar" ? "🎭" : type === "banner" ? "🖼️" : type === "frame" ? "💠" :
                         type === "badge" ? "🏅" : type === "name_color" ? "✨" : "😎"}
                      </span>
                  }
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{item.name}</p>
                    <p style={{ fontSize: 10, color: rc.color, letterSpacing: 1 }}>{rc.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Type filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {itemTypes.map(t => (
          <button key={t.key} onClick={() => setActiveType(t.key)}
            style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              background: activeType === t.key ? "rgba(124,58,237,0.2)" : "transparent",
              border: `1px solid ${activeType === t.key ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: activeType === t.key ? "#a855f7" : "rgba(255,255,255,0.35)",
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              fontFamily: "Rajdhani, sans-serif",
            }}
          >
            {t.icon} {t.label} {activeType === t.key || t.key === "all" ? `(${t.key === "all" ? ownedFull.length : ownedFull.filter(u => u.item.type === t.key).length})` : ""}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {filtered.map(({ item, equipped, id }) => {
          const rc = RARITY[item.rarity] || RARITY.common;
          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                borderRadius: 14,
                background: equipped ? `${rc.color}08` : "rgba(255,255,255,0.02)",
                border: `1px solid ${equipped ? rc.color + "50" : "rgba(255,255,255,0.07)"}`,
                padding: 16, position: "relative", overflow: "hidden",
                boxShadow: equipped ? `0 0 20px ${rc.color}20` : "none",
              }}
            >
              {/* Equipped badge */}
              {equipped && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: rc.color, color: "#000",
                  fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
                  padding: "3px 8px", borderRadius: 99,
                  fontFamily: "Orbitron, sans-serif",
                }}>
                  ÉQUIPÉ
                </div>
              )}

              {/* Image */}
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 10, marginBottom: 12,
                background: `${rc.color}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {item.image_url
                  ? <img src={item.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 48 }}>
                      {item.type === "avatar" ? "🎭" : item.type === "banner" ? "🖼️" : item.type === "frame" ? "💠" :
                       item.type === "badge" ? "🏅" : item.type === "name_color" ? "✨" : "😎"}
                    </span>
                }
              </div>

              <p style={{ fontWeight: 700, color: "#fff", fontSize: 13, marginBottom: 4 }}>{item.name}</p>
              <p style={{ fontSize: 10, color: rc.color, letterSpacing: 1.5, marginBottom: 12 }}>{rc.label}</p>

              {/* Action button */}
              <button
                onClick={() => equipped ? onUnequip(item) : onEquip(item)}
                style={{
                  width: "100%", padding: "9px", borderRadius: 8, cursor: "pointer", border: "none",
                  background: equipped
                    ? "rgba(255,255,255,0.05)"
                    : `linear-gradient(135deg, ${rc.color}, ${rc.color}cc)`,
                  color: equipped ? "rgba(255,255,255,0.4)" : "#000",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  fontFamily: "Orbitron, sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {equipped ? "✓ DÉSÉQUIPER" : "⚡ ÉQUIPER"}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN STORE ───────────────────────────────────────────────────────────────
export default function Store() {
  const { profile, setProfile, refreshProfile }   = useOutletContext();
  const [tab, setTab]             = useState("all");
  const [items, setItems]         = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [dailyItems, setDailyItems] = useState([]);
  const [coins, setCoins]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [sort, setSort]           = useState("rarity");
  const [notification, setNotification] = useState(null);
  const [confirmItem, setConfirmItem]   = useState(null);

  useEffect(() => {
    fetchAll();
    fetchCoins();
  }, []);

  const fetchCoins = async () => {
    const { data } = await supabase.from("wallets")
      .select("balance").eq("user_id", profile.id).maybeSingle();
    setCoins(data?.balance || 0);
  };

  const fetchAll = async () => {
    setLoading(true);

    const { data: storeData } = await supabase
      .from("store_items")
      .select("*")
      .eq("active", true)
      .eq("approved", true)
      .order("sort_order", { ascending: true });

    const { data: owned } = await supabase
      .from("user_items")
      .select("*, item:store_items(*)")
      .eq("user_id", profile.id);

    const { data: daily } = await supabase
      .from("daily_store")
      .select("*, item:store_items(*)")
      .eq("date", new Date().toISOString().split("T")[0]);

    setItems(storeData || []);
    setUserItems(owned || []);
    setDailyItems(daily?.filter(d => d.item) || []);
    setLoading(false);
  };

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBuy = async (item) => {
    setConfirmItem(item);
  };

  const confirmBuy = async () => {
    if (!confirmItem) return;
    const { data, error } = await supabase.rpc("purchase_item", {
      p_item_id: confirmItem.id,
    });

    setConfirmItem(null);

    if (error || !data?.success) {
      notify(data?.error || error?.message || "Erreur", "error");
      return;
    }

    notify(`✅ ${confirmItem.name} acheté !`);
    await fetchAll();
    await fetchCoins();
    if (refreshProfile) refreshProfile();
  };

  const handleEquip = async (item) => {
    const { data, error } = await supabase.rpc("equip_item", {
      p_item_id: item.id,
    });

    if (error || !data?.success) {
      notify(data?.error || "Erreur d'équipement", "error");
      return;
    }

    notify(`⚡ ${item.name} équipé !`);
    await fetchAll();
    if (refreshProfile) refreshProfile();
  };

  const isOwned   = (id) => userItems.some(u => u.item_id === id);
  const isEquipped = (id) => userItems.some(u => u.item_id === id && u.equipped);

  const filtered = items
    .filter(item => tab === "all" || item.type === tab)
    .sort((a, b) => {
      if (sort === "rarity")  return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });

  const ownedCount = userItems.length;
  const totalItems = items.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#030014", color: "#fff", fontFamily: "Rajdhani, sans-serif" }}>

        {/* ── Notification toast ── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -40, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -40, x: "-50%" }}
              style={{
                position: "fixed", top: 20, left: "50%", zIndex: 9999,
                padding: "12px 24px", borderRadius: 12,
                background: notification.type === "error" ? "#1a0505" : "#050d1a",
                border: `1px solid ${notification.type === "error" ? "#ef4444" : "#7c3aed"}`,
                color: notification.type === "error" ? "#ef4444" : "#fff",
                fontSize: 14, fontWeight: 600,
                boxShadow: `0 8px 30px ${notification.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(124,58,237,0.3)"}`,
              }}
            >
              {notification.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Confirm modal ── */}
        <AnimatePresence>
          {confirmItem && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(8px)", zIndex: 200,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onClick={() => setConfirmItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: 380, background: "#0d0e1f",
                  border: `1px solid ${RARITY[confirmItem.rarity]?.color || "#7c3aed"}40`,
                  borderRadius: 20, padding: 32,
                  boxShadow: `0 20px 60px ${RARITY[confirmItem.rarity]?.glow || "rgba(124,58,237,0.3)"}`,
                }}
              >
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🛒</div>
                  <h3 style={{ fontFamily: "Orbitron", fontSize: 16, color: "#fff", marginBottom: 8 }}>
                    CONFIRMER L'ACHAT
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                    Vous achetez <strong style={{ color: "#fff" }}>{confirmItem.name}</strong>
                  </p>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  marginBottom: 24,
                }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Prix</span>
                  <span style={{ color: "#f59e0b", fontFamily: "Orbitron", fontWeight: 700, fontSize: 18 }}>
                    💰 {confirmItem.price.toLocaleString()}
                  </span>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 16px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", marginBottom: 24,
                }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Solde après achat</span>
                  <span style={{
                    fontWeight: 700, fontSize: 14,
                    color: (coins - confirmItem.price) < 0 ? "#ef4444" : "#10b981",
                  }}>
                    💰 {(coins - confirmItem.price).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => setConfirmItem(null)}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10,
                      background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
                    onMouseLeave={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  >
                    ANNULER
                  </button>
                  <button
                    onClick={confirmBuy}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10,
                      background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                      border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", letterSpacing: 1,
                    }}
                  >
                    ACHETER
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HERO HEADER ── */}
        <div style={{
          position: "relative", overflow: "hidden",
          padding: "40px 32px 32px",
          background: "linear-gradient(180deg, rgba(124,58,237,0.12) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
        }}>
          {/* BG decoration */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: -40, left: 100, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)" }} />
          </div>

          <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 8px 25px rgba(124,58,237,0.4)",
                  }}>
                    🏪
                  </div>
                  <div>
                    <h1 style={{
                      fontFamily: "Orbitron, sans-serif", fontSize: 22, fontWeight: 900,
                      color: "#fff", letterSpacing: 3, margin: 0,
                    }}>
                      CIPHER<span style={{ color: "#7c3aed" }}>STORE</span>
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 2, margin: 0 }}>
                      COSMÉTIQUES • COSMETIC ONLY • NO PAY2WIN
                    </p>
                  </div>
                </div>
              </div>

              {/* Wallet + stats */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  padding: "10px 18px", borderRadius: 12,
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 2 }}>MON SOLDE</div>
                  <div style={{
                    fontFamily: "Orbitron", fontWeight: 700, fontSize: 20,
                    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>
                    💰 {coins.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  padding: "10px 16px", borderRadius: 12,
                  background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
                }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 2 }}>COLLECTION</div>
                  <div style={{ fontFamily: "Orbitron", fontWeight: 700, fontSize: 16, color: "#a855f7" }}>
                    {ownedCount} / {totalItems}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily items banner */}
            {dailyItems.length > 0 && (
              <div style={{
                marginTop: 20, padding: "12px 18px", borderRadius: 12,
                background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(245,158,11,0.1))",
                border: "1px solid rgba(239,68,68,0.25)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", letterSpacing: 1.5 }}>
                    OFFRES DU JOUR
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginLeft: 8 }}>
                    {dailyItems.map(d => d.item?.name).join(" • ")}
                  </span>
                </div>
                <span style={{
                  marginLeft: "auto", fontSize: 11, color: "#f59e0b", fontWeight: 700,
                  padding: "3px 8px", borderRadius: 6, background: "rgba(245,158,11,0.1)",
                }}>
                  SE RENOUVELLE DANS 24H
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── TABS + FILTERS ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(3,0,20,0.95)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(124,58,237,0.12)",
          padding: "0 32px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: "14px 16px", background: "transparent", border: "none",
                    borderBottom: `2px solid ${tab === t.key ? "#7c3aed" : "transparent"}`,
                    color: tab === t.key ? "#fff" : "rgba(255,255,255,0.35)",
                    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                    cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                    fontFamily: "Rajdhani, sans-serif",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 11,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", cursor: "pointer", outline: "none",
                fontFamily: "Rajdhani, sans-serif", letterSpacing: 1,
              }}
            >
              <option value="rarity">RARETÉ ↓</option>
              <option value="price_asc">PRIX ↑</option>
              <option value="price_desc">PRIX ↓</option>
            </select>
          </div>
        </div>

        {/* ── ITEMS GRID ── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>

          {/* ── INVENTORY TAB ── */}
          {tab === "inventory" ? (
            <InventoryView
              userItems={userItems}
              items={items}
              onEquip={handleEquip}
              onUnequip={async (item) => {
                const { data, error } = await supabase
                  .from("user_items")
                  .update({ equipped: false })
                  .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
                  .eq("item_id", item.id);
                if (!error) { notify(`${item.name} déséquipé`); await fetchAll(); }
              }}
            />
          ) : loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  height: 280, borderRadius: 14, background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  animation: "pulse 1.5s ease infinite",
                }} />
              ))}
              <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 16, letterSpacing: 2 }}>
                AUCUN ITEM DANS CETTE CATÉGORIE
              </p>
            </div>
          ) : (
            <>
              {/* Rarity sections */}
              {["legendary","epic","rare","common"].map(r => {
                const section = filtered.filter(i => i.rarity === r);
                if (section.length === 0) return null;
                const rc = RARITY[r];
                return (
                  <div key={r} style={{ marginBottom: 40 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
                    }}>
                      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${rc.color}40, transparent)` }} />
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
                        color: rc.color, fontFamily: "Orbitron, sans-serif",
                        padding: "4px 14px", borderRadius: 99,
                        background: rc.bg, border: `1px solid ${rc.color}30`,
                      }}>
                        ◆ {rc.label}
                      </span>
                      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${rc.color}40)` }} />
                    </div>

                    <motion.div
                      layout
                      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}
                    >
                      {section.map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          owned={isOwned(item.id)}
                          equipped={isEquipped(item.id)}
                          onBuy={handleBuy}
                          onEquip={handleEquip}
                          coins={coins}
                        />
                      ))}
                    </motion.div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}