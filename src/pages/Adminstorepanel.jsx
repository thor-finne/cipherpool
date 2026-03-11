import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ── RARITY CONFIG ─────────────────────────────────────────────────────────────
const RC = {
  common:    { color: "#9ca3af", label: "COMMUN" },
  rare:      { color: "#3b82f6", label: "RARE" },
  epic:      { color: "#a855f7", label: "ÉPIQUE" },
  legendary: { color: "#f59e0b", label: "LÉGEND." },
};

const TYPE_ICON = {
  avatar: "🎭", banner: "🖼️", badge: "🏅",
  name_color: "✨", frame: "💠", emote: "😎",
};

// ── COIN BADGE ────────────────────────────────────────────────────────────────
function CoinBadge({ amount }) {
  const pos = amount > 0;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
      fontFamily: "Orbitron, sans-serif",
      background: pos ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
      color: pos ? "#10b981" : "#ef4444",
      border: `1px solid ${pos ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
    }}>
      {pos ? "+" : ""}{amount.toLocaleString()} 💰
    </span>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AdminStorePanel() {
  const { profile } = useOutletContext();
  const navigate    = useNavigate();

  const [tab, setTab]             = useState("grant");
  const [users, setUsers]         = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [searchUser, setSearchUser] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userInventory, setUserInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [coinAmount, setCoinAmount]     = useState(0);
  const [coinReason, setCoinReason]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [notification, setNotification] = useState(null);
  const [logs, setLogs]           = useState([]);

  useEffect(() => {
    if (!["admin","super_admin"].includes(profile?.role)) navigate("/dashboard");
    fetchUsers();
    fetchStoreItems();
  }, []);

  useEffect(() => {
    if (selectedUser) fetchUserInventory(selectedUser.id);
  }, [selectedUser]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, email, role, coins")
      .order("username");
    setUsers(data || []);
  };

  const fetchStoreItems = async () => {
    const { data } = await supabase
      .from("store_items")
      .select("*")
      .order("rarity", { ascending: false });
    setStoreItems(data || []);
  };

  const fetchUserInventory = async (uid) => {
    const { data } = await supabase
      .from("user_items")
      .select("*, item:store_items(*)")
      .eq("user_id", uid);
    setUserInventory(data || []);
  };

  const fetchWallet = async (uid) => {
    const { data } = await supabase.from("wallets").select("balance").eq("user_id", uid).maybeSingle();
    return data?.balance || 0;
  };

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const addLog = (action, target, detail) => {
    setLogs(prev => [{
      id: Date.now(), action, target, detail,
      time: new Date().toLocaleTimeString("fr-FR"),
    }, ...prev.slice(0, 49)]);
  };

  // ── GRANT ITEM ─────────────────────────────────────────────────
  const handleGrant = async () => {
    if (!selectedUser || !selectedItem) {
      notify("Sélectionne un joueur et un item", "error"); return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_grant_item", {
      p_target_user_id: selectedUser.id,
      p_item_id:        selectedItem.id,
      p_reason:         "Don Admin",
    });
    setLoading(false);

    if (error || !data?.success) {
      notify(data?.error || error?.message || "Erreur", "error"); return;
    }

    notify(`✅ ${selectedItem.name} accordé à ${selectedUser.username}`);
    addLog("GRANT ITEM", selectedUser.username, `${selectedItem.name} (${selectedItem.rarity})`);
    fetchUserInventory(selectedUser.id);
    setSelectedItem(null);
  };

  // ── REMOVE ITEM ────────────────────────────────────────────────
  const handleRemove = async (inv) => {
    if (!confirm(`Retirer "${inv.item?.name}" à ${selectedUser.username} ?`)) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_remove_item", {
      p_target_user_id: selectedUser.id,
      p_item_id:        inv.item_id,
    });
    setLoading(false);

    if (error || !data?.success) {
      notify(data?.error || "Erreur", "error"); return;
    }

    notify(`🗑️ ${inv.item?.name} retiré de ${selectedUser.username}`);
    addLog("REMOVE ITEM", selectedUser.username, inv.item?.name);
    fetchUserInventory(selectedUser.id);
  };

  // ── ADJUST COINS ───────────────────────────────────────────────
  const handleCoins = async () => {
    if (!selectedUser) { notify("Sélectionne un joueur", "error"); return; }
    if (!coinAmount || coinAmount === 0) { notify("Montant invalide", "error"); return; }
    if (!coinReason.trim()) { notify("Raison obligatoire", "error"); return; }
    setLoading(true);

    const { data, error } = await supabase.rpc("admin_adjust_coins", {
      p_target_user_id: selectedUser.id,
      p_amount:         parseInt(coinAmount),
      p_reason:         coinReason,
    });
    setLoading(false);

    if (error || !data?.success) {
      notify(data?.error || "Erreur", "error"); return;
    }

    const sign = coinAmount > 0 ? "+" : "";
    notify(`💰 ${sign}${coinAmount} coins → ${selectedUser.username} (nouveau solde: ${data.new_balance})`);
    addLog(coinAmount > 0 ? "ADD COINS" : "REMOVE COINS", selectedUser.username, `${sign}${coinAmount} — ${coinReason}`);
    setCoinAmount(0);
    setCoinReason("");

    // Refresh wallet display
    const newBal = await fetchWallet(selectedUser.id);
    setSelectedUser(prev => ({ ...prev, _balance: newBal }));
  };

  // ── FILTERED USERS ─────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    !searchUser ||
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const ownedIds = new Set(userInventory.map(u => u.item_id));

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 99px; }
        .fi { font-family: 'Rajdhani', sans-serif; }
        .field-label {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          color: rgba(255,255,255,0.4); margin-bottom: 6px; display: block;
        }
        .field-input {
          width: 100%; padding: 10px 14px; box-sizing: border-box;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: #fff; font-size: 14px;
          font-family: 'Rajdhani', sans-serif; outline: none;
          transition: border-color 0.2s;
        }
        .field-input:focus { border-color: rgba(124,58,237,0.6); }
        .field-input option { background: #0d0e1f; }
      `}</style>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -30, x: "-50%" }}
            style={{
              position: "fixed", top: 20, left: "50%", zIndex: 9999,
              padding: "12px 24px", borderRadius: 10,
              background: notification.type === "error" ? "#1a0505" : "#050d1a",
              border: `1px solid ${notification.type === "error" ? "#ef4444" : "#10b981"}`,
              color: notification.type === "error" ? "#ef4444" : "#10b981",
              fontSize: 14, fontWeight: 600,
              boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
              fontFamily: "Rajdhani, sans-serif",
            }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ minHeight: "100vh", background: "#030014", color: "#fff", fontFamily: "Rajdhani, sans-serif" }}>

        {/* HEADER */}
        <div style={{
          padding: "28px 32px 24px",
          background: "linear-gradient(180deg, rgba(239,68,68,0.08), transparent)",
          borderBottom: "1px solid rgba(239,68,68,0.12)",
        }}>
          <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: "linear-gradient(135deg, #dc2626, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              boxShadow: "0 8px 25px rgba(220,38,38,0.35)",
            }}>
              👑
            </div>
            <div>
              <h1 style={{ fontFamily: "Orbitron", fontSize: 20, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: 2 }}>
                ADMIN <span style={{ color: "#ef4444" }}>STORE</span> PANEL
              </h1>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 2, margin: 0 }}>
                GESTION ITEMS & COINS JOUEURS
              </p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <div style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444",
              }}>
                {users.length} JOUEURS
              </div>
              <div style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1,
                background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
                color: "#a855f7",
              }}>
                {storeItems.length} ITEMS
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(3,0,20,0.97)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px",
        }}>
          <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex" }}>
            {[
              { key: "grant",  icon: "🎁", label: "DONNER ITEM" },
              { key: "coins",  icon: "💰", label: "GÉRER COINS" },
              { key: "logs",   icon: "📋", label: "HISTORIQUE" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  padding: "14px 20px", background: "transparent", border: "none",
                  borderBottom: `2px solid ${tab === t.key ? "#ef4444" : "transparent"}`,
                  color: tab === t.key ? "#fff" : "rgba(255,255,255,0.3)",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer",
                  fontFamily: "Rajdhani, sans-serif", display: "flex", alignItems: "center", gap: 7,
                  transition: "all 0.2s",
                }}
              >
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 32px" }}>

          {/* USER SELECTOR (shared between tabs) */}
          <div style={{
            padding: "20px", borderRadius: 14, marginBottom: 24,
            background: "#08031a", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <label className="field-label">SÉLECTIONNER UN JOUEUR</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <input
                  className="field-input"
                  placeholder="🔍 Rechercher par nom ou email..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                />
              </div>
              <select className="field-input"
                value={selectedUser?.id || ""}
                onChange={e => {
                  const u = users.find(x => x.id === e.target.value);
                  setSelectedUser(u || null);
                }}
              >
                <option value="">-- Choisir un joueur --</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role}) {u.email ? `— ${u.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected user card */}
            {selectedUser && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 16, padding: "14px 18px", borderRadius: 10,
                  background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700,
                  }}>
                    {selectedUser.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedUser.username}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{selectedUser.email}</div>
                  </div>
                  <span style={{
                    padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    background: selectedUser.role === "super_admin" ? "rgba(245,158,11,0.15)" : "rgba(124,58,237,0.15)",
                    color: selectedUser.role === "super_admin" ? "#f59e0b" : "#a855f7",
                    border: `1px solid ${selectedUser.role === "super_admin" ? "rgba(245,158,11,0.3)" : "rgba(124,58,237,0.3)"}`,
                  }}>
                    {selectedUser.role?.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>INVENTAIRE</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#a855f7", fontFamily: "Orbitron" }}>
                      {userInventory.length}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ════════ TAB: GRANT ITEM ════════ */}
          {tab === "grant" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>

              {/* Items grid */}
              <div>
                <div style={{ marginBottom: 16, fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
                  SÉLECTIONNE L'ITEM À DONNER
                </div>

                {["legendary","epic","rare","common"].map(r => {
                  const section = storeItems.filter(i => i.rarity === r);
                  if (!section.length) return null;
                  const rc = RC[r];
                  return (
                    <div key={r} style={{ marginBottom: 28 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${rc.color}40, transparent)` }} />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: rc.color }}>
                          {rc.label}
                        </span>
                        <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${rc.color}40)` }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                        {section.map(item => {
                          const owned = ownedIds.has(item.id);
                          const selected = selectedItem?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => !owned && setSelectedItem(item)}
                              style={{
                                padding: "12px", borderRadius: 10, cursor: owned ? "not-allowed" : "pointer",
                                border: `1px solid ${selected ? rc.color : owned ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.07)"}`,
                                background: selected ? `${rc.color}15` : owned ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
                                opacity: owned ? 0.6 : 1,
                                transition: "all 0.2s",
                                display: "flex", alignItems: "center", gap: 10,
                              }}
                            >
                              <span style={{ fontSize: 22 }}>{TYPE_ICON[item.type] || "🎮"}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: selected ? rc.color : "#fff",
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                                  {owned ? "✅ déjà possédé" : `💰 ${item.price}`}
                                </div>
                              </div>
                              {selected && <span style={{ fontSize: 16 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: action panel */}
              <div style={{ position: "sticky", top: 80 }}>
                <div style={{
                  padding: "20px", borderRadius: 14,
                  background: "#08031a", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                    RÉSUMÉ DE L'ACTION
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>JOUEUR</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: selectedUser ? "#fff" : "rgba(255,255,255,0.2)" }}>
                        {selectedUser?.username || "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>ITEM</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: selectedItem ? RC[selectedItem.rarity]?.color : "rgba(255,255,255,0.2)" }}>
                        {selectedItem?.name || "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>RARETÉ</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: selectedItem ? RC[selectedItem.rarity]?.color : "rgba(255,255,255,0.2)" }}>
                        {selectedItem ? RC[selectedItem.rarity]?.label : "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>COÛT POUR JOUEUR</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>GRATUIT 🎁</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGrant}
                    disabled={loading || !selectedUser || !selectedItem}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 10, border: "none",
                      background: (!selectedUser || !selectedItem) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #10b981, #059669)",
                      color: (!selectedUser || !selectedItem) ? "rgba(255,255,255,0.2)" : "#fff",
                      fontSize: 13, fontWeight: 700, letterSpacing: 1.5,
                      cursor: (!selectedUser || !selectedItem || loading) ? "not-allowed" : "pointer",
                      fontFamily: "Orbitron, sans-serif", transition: "all 0.2s",
                      boxShadow: (!selectedUser || !selectedItem) ? "none" : "0 6px 20px rgba(16,185,129,0.3)",
                    }}
                  >
                    {loading ? "⏳ EN COURS..." : "🎁 ACCORDER L'ITEM"}
                  </button>
                </div>

                {/* User inventory */}
                {selectedUser && userInventory.length > 0 && (
                  <div style={{ marginTop: 16, padding: "16px", borderRadius: 14, background: "#08031a", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                      INVENTAIRE DE {selectedUser.username?.toUpperCase()} ({userInventory.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 250, overflowY: "auto" }}>
                      {userInventory.map(inv => (
                        <div key={inv.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{TYPE_ICON[inv.item?.type] || "🎮"}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: RC[inv.item?.rarity]?.color || "#fff" }}>
                                {inv.item?.name}
                              </div>
                              {inv.equipped && <div style={{ fontSize: 9, color: "#10b981", letterSpacing: 1 }}>ÉQUIPÉ</div>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemove(inv)}
                            style={{
                              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                              color: "#ef4444", borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                              fontSize: 12, fontFamily: "Rajdhani, sans-serif",
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ TAB: COINS ════════ */}
          {tab === "coins" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>

              {/* Add coins */}
              <div style={{ padding: "24px", borderRadius: 14, background: "#08031a", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 24 }}>💚</span>
                  <h3 style={{ fontFamily: "Orbitron", fontSize: 14, color: "#10b981", margin: 0 }}>AJOUTER COINS</h3>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">MONTANT À AJOUTER</label>
                  <input className="field-input" type="number" min={1} placeholder="Ex: 500"
                    value={coinAmount > 0 ? coinAmount : ""}
                    onChange={e => setCoinAmount(Math.abs(parseInt(e.target.value) || 0))}
                  />
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[100, 500, 1000, 2000, 5000].map(n => (
                      <button key={n} onClick={() => setCoinAmount(n)}
                        style={{
                          padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                          border: `1px solid ${coinAmount === n ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`,
                          background: coinAmount === n ? "rgba(16,185,129,0.15)" : "transparent",
                          color: coinAmount === n ? "#10b981" : "rgba(255,255,255,0.4)",
                          fontSize: 12, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
                        }}>
                        +{n}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label className="field-label">RAISON *</label>
                  <input className="field-input" placeholder="Ex: Récompense tournoi, Bug compensation..."
                    value={coinReason}
                    onChange={e => setCoinReason(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => { if (coinAmount > 0) handleCoins(); }}
                  disabled={loading || !selectedUser || coinAmount <= 0}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 10, border: "none",
                    background: (!selectedUser || coinAmount <= 0) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #10b981, #059669)",
                    color: (!selectedUser || coinAmount <= 0) ? "rgba(255,255,255,0.2)" : "#fff",
                    fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
                    fontFamily: "Rajdhani, sans-serif",
                  }}
                >
                  {loading ? "⏳..." : `✅ AJOUTER ${coinAmount > 0 ? "+" + coinAmount : ""} COINS`}
                </button>
              </div>

              {/* Remove coins */}
              <div style={{ padding: "24px", borderRadius: 14, background: "#08031a", border: "1px solid rgba(239,68,68,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 24 }}>🔴</span>
                  <h3 style={{ fontFamily: "Orbitron", fontSize: 14, color: "#ef4444", margin: 0 }}>RETIRER COINS</h3>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">MONTANT À RETIRER</label>
                  <input className="field-input" type="number" min={1} placeholder="Ex: 200"
                    value={coinAmount < 0 ? Math.abs(coinAmount) : ""}
                    onChange={e => setCoinAmount(-Math.abs(parseInt(e.target.value) || 0))}
                  />
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[100, 200, 500, 1000].map(n => (
                      <button key={n} onClick={() => setCoinAmount(-n)}
                        style={{
                          padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                          border: `1px solid ${coinAmount === -n ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                          background: coinAmount === -n ? "rgba(239,68,68,0.12)" : "transparent",
                          color: coinAmount === -n ? "#ef4444" : "rgba(255,255,255,0.4)",
                          fontSize: 12, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
                        }}>
                        -{n}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label className="field-label">RAISON *</label>
                  <input className="field-input" placeholder="Ex: Pénalité, Fraude, Correction..."
                    value={coinReason}
                    onChange={e => setCoinReason(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => { if (coinAmount < 0) handleCoins(); }}
                  disabled={loading || !selectedUser || coinAmount >= 0}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 10, border: "none",
                    background: (!selectedUser || coinAmount >= 0) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #dc2626, #b91c1c)",
                    color: (!selectedUser || coinAmount >= 0) ? "rgba(255,255,255,0.2)" : "#fff",
                    fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
                    fontFamily: "Rajdhani, sans-serif",
                  }}
                >
                  {loading ? "⏳..." : `🔴 RETIRER ${coinAmount < 0 ? Math.abs(coinAmount) : ""} COINS`}
                </button>
              </div>
            </div>
          )}

          {/* ════════ TAB: LOGS ════════ */}
          {tab === "logs" && (
            <div>
              <div style={{ marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
                HISTORIQUE DES ACTIONS — SESSION ACTUELLE ({logs.length} actions)
              </div>

              {logs.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                  <p style={{ color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>AUCUNE ACTION POUR L'INSTANT</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {logs.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "12px 16px", borderRadius: 10,
                        background: "#08031a", border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>
                        {log.action.includes("GRANT") ? "🎁" : log.action.includes("REMOVE") ? "🗑️" :
                         log.action.includes("ADD") ? "💚" : "🔴"}
                      </span>
                      <div style={{
                        padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                        background: log.action.includes("ADD") || log.action.includes("GRANT")
                          ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: log.action.includes("ADD") || log.action.includes("GRANT") ? "#10b981" : "#ef4444",
                      }}>
                        {log.action}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: "#a855f7" }}>{log.target}</span>
                        <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 8, fontSize: 13 }}>
                          → {log.detail}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                        {log.time}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}