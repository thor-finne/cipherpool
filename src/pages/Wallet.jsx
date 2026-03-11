import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const TX_CONFIG = {
  purchase:    { icon: "🛒", color: "#ef4444", label: "Achat boutique" },
  reward:      { icon: "🏆", color: "#f59e0b", label: "Récompense" },
  penalty:     { icon: "⚠️", color: "#ef4444", label: "Pénalité" },
  debit:       { icon: "💸", color: "#ef4444", label: "Débit" },
  credit:      { icon: "💰", color: "#10b981", label: "Crédit" },
  tournament:  { icon: "🎮", color: "#10b981", label: "Tournoi" },
  daily:       { icon: "🎁", color: "#06b6d4", label: "Bonus quotidien" },
  refund:      { icon: "↩️", color: "#10b981", label: "Remboursement" },
  admin_grant: { icon: "👑", color: "#a855f7", label: "Don Admin" },
};

function getTxConfig(type, desc) {
  if (!type) return { icon: "💱", color: "#6b7280", label: "Transaction" };
  const key = Object.keys(TX_CONFIG).find(k => type.toLowerCase().includes(k));
  return key ? TX_CONFIG[key] : { icon: "💱", color: "#6b7280", label: type };
}

function timeAgo(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return d.toLocaleDateString("fr-FR");
}

export default function Wallet() {
  const { profile, balance: ctxBalance, setBalance } = useOutletContext();
  const [balance, setLocalBalance] = useState(ctxBalance || 0);
  const [transactions, setTransactions] = useState([]);
  const [loading] = useState(false);
  const [txLoading, setTxLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [balanceChange, setBalanceChange] = useState(null);

  // Sync with context balance (real-time from MainLayout)
  useEffect(() => {
    if (ctxBalance !== undefined && ctxBalance !== balance) {
      const diff = ctxBalance - balance;
      if (diff !== 0 && balance !== 0) {
        setBalanceChange(diff);
        setTimeout(() => setBalanceChange(null), 3000);
      }
      setLocalBalance(ctxBalance);
    }
  }, [ctxBalance]);

  useEffect(() => {
    if (!profile?.id) return;
    fetchTransactions();
  }, [profile?.id]);

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions(data || []);
    } catch (_e) {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  const filtered = filter === "all"
    ? transactions
    : transactions.filter(tx => {
        if (filter === "plus") return (tx.amount || 0) > 0 && !["purchase","penalty","debit"].includes(tx.type);
        if (filter === "moins") return ["purchase","penalty","debit"].includes(tx.type) || (tx.amount || 0) < 0;
        return true;
      });

  const totalIn  = transactions.filter(tx => !["purchase","penalty","debit"].includes(tx.type)).reduce((s, tx) => s + (tx.amount || 0), 0);
  const totalOut = transactions.filter(tx =>  ["purchase","penalty","debit"].includes(tx.type)).reduce((s, tx) => s + (tx.amount || 0), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');
        .wallet-page { font-family: 'Rajdhani', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 99px; }
      `}</style>

      <div className="wallet-page space-y-6">

        {/* ── HEADER ── */}
        <div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: 2, color: "#fff" }}>
            MON <span style={{ color: "#f59e0b" }}>PORTEFEUILLE</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 4 }}>
            Gérez vos pièces et consultez votre historique
          </p>
        </div>

        {/* ── BALANCE CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: 20, padding: "32px 36px",
            background: "linear-gradient(135deg, #1e0a3c 0%, #0d0520 50%, #0a1628 100%)",
            border: "1px solid rgba(124,58,237,0.25)",
            boxShadow: "0 20px 60px rgba(124,58,237,0.15)",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Glow */}
          <div style={{
            position: "absolute", top: -60, right: -60,
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)",
          }} />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>
                SOLDE ACTUEL
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                {loading ? (
                  <div style={{ width: 120, height: 52, background: "rgba(255,255,255,0.05)", borderRadius: 8, animation: "pulse 1.5s infinite" }} />
                ) : (
                  <motion.div
                    key={balance}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: 52, fontWeight: 900, color: "#f59e0b", lineHeight: 1 }}
                  >
                    {balance.toLocaleString("fr-FR")}
                  </motion.div>
                )}
                <span style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>💰</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 8 }}>PIÈCES CIPHERPOOL</p>

              {/* Balance change animation */}
              <AnimatePresence>
                {balanceChange && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, x: 0 }}
                    animate={{ opacity: 1, y: -5, x: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{
                      marginTop: 8, fontSize: 16, fontWeight: 700,
                      color: balanceChange > 0 ? "#10b981" : "#ef4444",
                      fontFamily: "Orbitron, sans-serif",
                    }}
                  >
                    {balanceChange > 0 ? "+" : ""}{balanceChange.toLocaleString()} pièces
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }}>TOTAL REÇU</p>
                <p style={{ color: "#10b981", fontFamily: "Orbitron, sans-serif", fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  +{totalIn.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }}>TOTAL DÉPENSÉ</p>
                <p style={{ color: "#ef4444", fontFamily: "Orbitron, sans-serif", fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  -{totalOut.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }}>TRANSACTIONS</p>
                <p style={{ color: "#a855f7", fontFamily: "Orbitron, sans-serif", fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  {transactions.length}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <motion.a
            href="/tournaments"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "block", padding: "20px 24px", borderRadius: 14, textDecoration: "none",
              background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
              cursor: "pointer", transition: "border-color 0.2s",
            }}
          >
            <span style={{ fontSize: 28 }}>🏆</span>
            <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: 13, fontWeight: 700, color: "#10b981", marginTop: 8, letterSpacing: 1 }}>
              TOURNOIS
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 }}>Gagne jusqu'à 500 pièces</p>
          </motion.a>

          <motion.a
            href="/store"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "block", padding: "20px 24px", borderRadius: 14, textDecoration: "none",
              background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 28 }}>🛒</span>
            <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: 13, fontWeight: 700, color: "#a855f7", marginTop: 8, letterSpacing: 1 }}>
              BOUTIQUE
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 }}>Dépense tes pièces</p>
          </motion.a>
        </div>

        {/* ── TRANSACTIONS ── */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Header + filters */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
          }}>
            <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 1.5 }}>
              HISTORIQUE DES TRANSACTIONS
            </h2>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "all",   label: "TOUT" },
                { key: "plus",  label: "➕ REÇU" },
                { key: "moins", label: "➖ DÉPENSÉ" },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                    background: filter === f.key ? "rgba(124,58,237,0.25)" : "transparent",
                    border: `1px solid ${filter === f.key ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}`,
                    color: filter === f.key ? "#a855f7" : "rgba(255,255,255,0.35)",
                    fontSize: 11, fontWeight: 700, letterSpacing: 1,
                    fontFamily: "Rajdhani, sans-serif",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {txLoading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, letterSpacing: 2 }}>CHARGEMENT...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💸</div>
              <p style={{ color: "rgba(255,255,255,0.2)", letterSpacing: 2, fontSize: 12 }}>
                AUCUNE TRANSACTION
              </p>
              <p style={{ color: "rgba(255,255,255,0.1)", fontSize: 12, marginTop: 6 }}>
                Participe à des tournois pour gagner des pièces !
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((tx, i) => {
                const cfg = getTxConfig(tx.type, tx.description);
                const isCredit = !["purchase","penalty","debit"].includes(tx.type?.toLowerCase());
                const amt = tx.amount || 0;

                return (
                  <motion.div
                    key={tx.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: "flex", alignItems: "center", padding: "14px 20px",
                      borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0, marginRight: 14,
                      background: `${cfg.color}15`,
                      border: `1px solid ${cfg.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18,
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 2 }}>
                        {tx.description || cfg.label}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                        {timeAgo(tx.created_at)} · {cfg.label}
                      </p>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{
                        fontFamily: "Orbitron, sans-serif", fontSize: 15, fontWeight: 700,
                        color: isCredit ? "#10b981" : "#ef4444",
                      }}>
                        {isCredit ? "+" : "-"}{Math.abs(amt).toLocaleString()}
                      </span>
                      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 2 }}>pièces</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}