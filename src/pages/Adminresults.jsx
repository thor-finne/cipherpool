import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AdminResults() {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("pending");
  const [selected, setSelected] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg]           = useState("");

  useEffect(() => { fetchResults(); }, [filter]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Step 1: fetch match_results
      const q = supabase
        .from("match_results")
        .select("id, tournament_id, user_id, placement, kills, points, estimated_coins, screenshot_url, status, submitted_at")
        .order("submitted_at", { ascending: false });
      if (filter !== "all") q.eq("status", filter);
      const { data: rawResults, error: resErr } = await q;
      if (resErr) { console.error("match_results error:", resErr); setResults([]); setLoading(false); return; }
      if (!rawResults?.length) { setResults([]); setLoading(false); return; }

      // Step 2: enrich with profiles
      const userIds = [...new Set(rawResults.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, username, avatar_url")
        .in("id", userIds);

      // Step 3: enrich with tournaments
      const tournIds = [...new Set(rawResults.map(r => r.tournament_id))];
      const { data: tournaments } = await supabase
        .from("tournaments").select("id, name, game_type, mode")
        .in("id", tournIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const tournMap   = Object.fromEntries((tournaments || []).map(t => [t.id, t]));

      const enriched = rawResults.map(r => ({
        ...r,
        profiles:    profileMap[r.user_id]    || {},
        tournaments: tournMap[r.tournament_id] || {},
      }));
      setResults(enriched);
    } catch(e) {
      console.error("fetchResults error:", e);
      setResults([]);
    }
    setLoading(false);
  };

  const verify = async (result, action) => {
    setVerifying(true);
    setMsg("");
    try {
      const newStatus = action === "approve" ? "verified" : "rejected";

      // Update result status
      await supabase.from("match_results")
        .update({ status: newStatus, verified_at: new Date().toISOString() })
        .eq("id", result.id);

      if (action === "approve") {
        const coins = result.estimated_coins || result.points * 10;
        const isWin   = result.placement === 1;
        const isTop3  = result.placement <= 3;

        // ── 1. Update player_stats (upsert) ──────────────────────
        const { data: stats } = await supabase.from("player_stats")
          .select("id, kills, wins, losses, tournaments_played, top3_finishes, total_earnings, total_points, best_position")
          .eq("user_id", result.user_id).maybeSingle();

        const updatedStats = {
          kills:              (stats?.kills || 0)              + result.kills,
          wins:               (stats?.wins  || 0)              + (isWin ? 1 : 0),
          losses:             (stats?.losses || 0)             + (isWin ? 0 : 1),
          tournaments_played: (stats?.tournaments_played || 0) + 1,
          top3_finishes:      (stats?.top3_finishes || 0)      + (isTop3 ? 1 : 0),
          total_earnings:     (stats?.total_earnings || 0)     + coins,
          total_points:       (stats?.total_points || 0)       + result.points,
          best_position:      stats?.best_position
            ? Math.min(stats.best_position, result.placement)
            : result.placement,
          updated_at: new Date().toISOString(),
        };
        // Recalculate KD ratio
        updatedStats.kd_ratio = updatedStats.tournaments_played > 0
          ? parseFloat((updatedStats.kills / updatedStats.tournaments_played).toFixed(2))
          : 0;

        if (stats) {
          await supabase.from("player_stats").update(updatedStats).eq("user_id", result.user_id);
        } else {
          await supabase.from("player_stats").insert({ user_id: result.user_id, ...updatedStats });
        }

        // ── 2. Give coins via wallet ──────────────────────────────
        const { data: wallet } = await supabase.from("wallets")
          .select("id, balance").eq("user_id", result.user_id).maybeSingle();
        if (wallet) {
          await supabase.from("wallets")
            .update({ balance: (wallet.balance || 0) + coins })
            .eq("id", wallet.id);
          await supabase.from("wallet_transactions").insert({
            wallet_id:   wallet.id,
            user_id:     result.user_id,
            amount:      coins,
            type:        "reward",
            description: `${result.tournaments?.name || "Tournoi"} — Place #${result.placement} · ${result.kills} kills`,
          }).catch(() => {});
        }
      }

      setMsg(action === "approve"
        ? `✅ Validé — ${result.points} pts + ${result.estimated_coins || result.points * 10} pièces attribués`
        : "❌ Refusé");
      setSelected(null);
      fetchResults();
    } catch (e) { setMsg("Erreur: " + e.message); }
    setVerifying(false);
  };

  const getName = (r) =>
    r.profiles?.full_name || r.profiles?.username || "Joueur";

  const statusColor = { pending:"#f59e0b", verified:"#10b981", rejected:"#ef4444" };
  const statusLabel = { pending:"⏳ En attente", verified:"✅ Validé", rejected:"❌ Refusé" };

  return (
    <div style={{ minHeight:"100vh", background:"#050510", padding:24, color:"#e2e8f0" }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:900, color:"#a78bfa", letterSpacing:2, margin:0 }}>
          📊 RÉSULTATS DES MATCHS
        </h1>
        <p style={{ color:"#6b7280", marginTop:6, fontSize:14 }}>
          Vérifiez les captures d'écran et validez les résultats
        </p>
      </div>

      {/* Success/Error message */}
      {msg && (
        <div style={{
          background: msg.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.startsWith("✅") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius:10, padding:"12px 16px", marginBottom:20,
          color: msg.startsWith("✅") ? "#10b981" : "#ef4444", fontWeight:600,
        }}>
          {msg}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {[
          { key:"pending",  label:"⏳ En attente" },
          { key:"verified", label:"✅ Validés" },
          { key:"rejected", label:"❌ Refusés" },
          { key:"all",      label:"📋 Tous" },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{
              padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer",
              fontWeight:700, fontSize:13,
              background: filter === t.key ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.05)",
              color: filter === t.key ? "#a78bfa" : "#6b7280",
              borderBottom: filter === t.key ? "2px solid #7c3aed" : "2px solid transparent",
            }}>
            {t.label}
            {t.key === "pending" && results.filter(r => r.status === "pending").length > 0 && filter !== "pending" && (
              <span style={{ marginLeft:6, background:"#ef4444", color:"#fff",
                borderRadius:10, padding:"1px 7px", fontSize:11 }}>
                {results.filter(r => r.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results list */}
      {loading ? (
        <div style={{ textAlign:"center", color:"#6b7280", padding:40 }}>Chargement...</div>
      ) : results.length === 0 ? (
        <div style={{ textAlign:"center", color:"#4b5563", padding:60, fontSize:15 }}>
          Aucun résultat {filter === "pending" ? "en attente" : ""}
        </div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          {results.map(r => (
            <div key={r.id}
              onClick={() => setSelected(r)}
              style={{
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:12, padding:16, cursor:"pointer", display:"flex",
                alignItems:"center", gap:16, transition:"all 0.15s",
                borderLeft:`3px solid ${statusColor[r.status] || "#6b7280"}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            >
              {/* Avatar */}
              <div style={{ width:44, height:44, borderRadius:8, overflow:"hidden",
                background:"rgba(124,58,237,0.2)", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, fontWeight:800, color:"#a78bfa" }}>
                {r.profiles?.avatar_url
                  ? <img src={r.profiles.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : getName(r).charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{getName(r)}</div>
                <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
                  {r.tournaments?.name} · {r.tournaments?.game_type?.toUpperCase()}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:"flex", gap:20, textAlign:"center" }}>
                <Stat label="Classé" val={`#${r.placement}`} color="#f59e0b" />
                <Stat label="Kills"  val={r.kills}           color="#00d4ff" />
                <Stat label="Pts"    val={r.points}          color="#a78bfa" />
                <Stat label="Pièces" val={`+${r.estimated_coins || r.points * 10}`} color="#fbbf24" />
              </div>

              {/* Status badge */}
              <div style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700,
                background:`${statusColor[r.status]}22`, color: statusColor[r.status] }}>
                {statusLabel[r.status]}
              </div>

              {/* Screenshot thumbnail */}
              {r.screenshot_url && (
                <img src={r.screenshot_url} alt=""
                  style={{ width:60, height:44, objectFit:"cover", borderRadius:6,
                    border:"1px solid rgba(255,255,255,0.1)" }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)",
          zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center",
          backdropFilter:"blur(8px)", padding:16 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:"linear-gradient(135deg,#0f0f1a,#1a0a2e)",
            border:"1px solid rgba(139,92,246,0.4)", borderRadius:16, padding:28,
            width:600, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>{getName(selected)}</div>
                <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>
                  {selected.tournaments?.name} · {new Date(selected.submitted_at).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:6, width:30, height:30, color:"#9ca3af", cursor:"pointer" }}>✕</button>
            </div>

            {/* Stats grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
              <BigStat label="CLASSEMENT" val={`#${selected.placement}`} color="#f59e0b" />
              <BigStat label="KILLS"      val={selected.kills}           color="#00d4ff" />
              <BigStat label="POINTS"     val={selected.points}          color="#a78bfa" />
              <BigStat label="PIÈCES"     val={`+${selected.estimated_coins || selected.points * 10}`} color="#fbbf24" />
            </div>

            {/* Screenshot */}
            {selected.screenshot_url ? (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color:"#6b7280", marginBottom:8, letterSpacing:1 }}>
                  📸 CAPTURE D'ÉCRAN
                </div>
                <a href={selected.screenshot_url} target="_blank" rel="noreferrer">
                  <img src={selected.screenshot_url} alt="screenshot"
                    style={{ width:"100%", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
                      cursor:"zoom-in" }} />
                </a>
                <div style={{ fontSize:11, color:"#4b5563", marginTop:4, textAlign:"center" }}>
                  Cliquez pour agrandir
                </div>
              </div>
            ) : (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:8, padding:12, marginBottom:20, color:"#fca5a5", fontSize:13, textAlign:"center" }}>
                ⚠️ Aucune capture d'écran fournie
              </div>
            )}

            {/* Actions */}
            {selected.status === "pending" && (
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => verify(selected, "reject")} disabled={verifying}
                  style={{ flex:1, padding:"13px 0", borderRadius:10, border:"none", cursor:"pointer",
                    background:"rgba(239,68,68,0.15)", color:"#ef4444", fontWeight:700, fontSize:14 }}>
                  ❌ REFUSER
                </button>
                <button onClick={() => verify(selected, "approve")} disabled={verifying}
                  style={{ flex:2, padding:"13px 0", borderRadius:10, border:"none", cursor:"pointer",
                    background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff",
                    fontWeight:800, fontSize:15, boxShadow:"0 0 20px rgba(16,185,129,0.4)" }}>
                  {verifying ? "..." : `✅ VALIDER (+${selected.points} pts)`}
                </button>
              </div>
            )}

            {selected.status !== "pending" && (
              <div style={{ textAlign:"center", padding:"12px 0",
                color: statusColor[selected.status], fontWeight:700, fontSize:15 }}>
                {statusLabel[selected.status]}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, val, color }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:11, color:"#6b7280" }}>{label}</div>
      <div style={{ fontWeight:800, color, fontSize:15 }}>{val}</div>
    </div>
  );
}
function BigStat({ label, val, color }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 8px", textAlign:"center" }}>
      <div style={{ fontSize:10, color:"#6b7280", letterSpacing:1 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color, marginTop:4 }}>{val}</div>
    </div>
  );
}