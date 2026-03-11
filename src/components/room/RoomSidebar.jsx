import { useState, useEffect } from "react";

export default function RoomSidebar({
  tournament,
  players,
  members,
  readyCount,
  role,
  countdown,
  roomLocked,
  currentUserReady,
  userReady,
  onToggleReady,
  onStartMatch,
  onEndMatch,
  onOpenSubmit,
  onLockRoom,
}) {
  const [roomCode, setRoomCode] = useState("");
  const [roomPass, setRoomPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (tournament?.room_code) setRoomCode(tournament.room_code);
    if (tournament?.room_password) setRoomPass(tournament.room_password);
  }, [tournament?.room_code, tournament?.room_password]);

  const isOrganizer = role === "organizer";
  const allMembers = players || members || [];
  const totalCount = allMembers.length;
  const rCount = readyCount !== undefined
    ? readyCount
    : allMembers.filter(m => m.is_ready === true).length;
  const allReady = totalCount > 0 && rCount >= totalCount;
  const isReady = currentUserReady === true || userReady === "Yes" || userReady === true;

  const tStatus = tournament?.room_status || tournament?.status || "ready";
  const phase =
    tStatus === "live"           ? "live"
    : tStatus === "results_open" ? "results"
    : tStatus === "results_closed" || tStatus === "finished" ? "done"
    : "ready";

  const copy = (val, key) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const saveRoom = async () => {
    setSaving(true);
    try {
      const { supabase } = await import("../../lib/supabase");
      await supabase.from("tournaments")
        .update({ room_code: roomCode, room_password: roomPass })
        .eq("id", tournament.id);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleReady = async () => {
    if (toggling) return;
    setToggling(true);
    try { await onToggleReady(); } catch(_e) {}
    setToggling(false);
  };

  return (
    <div style={{
      background:"linear-gradient(180deg,#0f0f1a 0%,#070710 100%)",
      border:"1px solid rgba(139,92,246,0.3)",
      borderRadius:12, padding:20,
      display:"flex", flexDirection:"column", gap:14, minWidth:220,
    }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a78bfa", letterSpacing:2 }}>
          {tournament?.name || "ROOM"}
        </div>
        <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
          {tournament?.game_type} · {tournament?.mode || tournament?.cs_format}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Stat label="JOUEURS" value={`${totalCount}/${tournament?.max_players||"?"}`} color="#00d4ff" />
        <Stat label="PRÊTS" value={`${rCount}/${totalCount}`}
          color={allReady?"#10b981":rCount>0?"#f59e0b":"#6b7280"} />
      </div>

      <div>
        <div style={{ background:"#1a1a2e", borderRadius:4, height:6, overflow:"hidden" }}>
          <div style={{
            height:"100%",
            width: totalCount ? `${(rCount/totalCount)*100}%` : "0%",
            background: allReady
              ? "linear-gradient(90deg,#10b981,#059669)"
              : "linear-gradient(90deg,#7c3aed,#00d4ff)",
            transition:"width 0.4s ease",
          }} />
        </div>
        {allMembers.length > 0 && (
          <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:5 }}>
            {allMembers.map(m => (
              <div key={m.user_id||m.id} style={{
                display:"flex", alignItems:"center", gap:8,
                fontSize:12, color: m.is_ready?"#10b981":"#6b7280",
              }}>
                <span>{m.is_ready ? "✅" : "⏳"}</span>
                <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {m.profiles?.full_name || m.full_name || "Joueur"}
                </span>
                <span style={{ fontSize:10, color: m.is_ready?"#10b981":"#4b5563", flexShrink:0 }}>
                  {m.is_ready ? "PRÊT" : "EN ATTENTE"}
                </span>
              </div>
            ))}
          </div>
        )}
        {allReady && (
          <div style={{ fontSize:11, color:"#10b981", textAlign:"center", marginTop:6, fontWeight:700 }}>
            ✅ Tous les joueurs sont prêts !
          </div>
        )}
      </div>

      {(tournament?.room_code || (isOrganizer && phase==="ready")) && (
        <div style={{
          background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.2)",
          borderRadius:8, padding:12, display:"flex", flexDirection:"column", gap:8,
        }}>
          {isOrganizer && phase==="ready" ? (
            <>
              <Lbl>ID DE LA ROOM</Lbl>
              <input value={roomCode} onChange={e=>setRoomCode(e.target.value)}
                placeholder="Ex: 123456789" style={INP} />
              <Lbl>MOT DE PASSE</Lbl>
              <input value={roomPass} onChange={e=>setRoomPass(e.target.value)}
                placeholder="Ex: cipher" style={INP} />
              <button onClick={saveRoom} disabled={saving} style={SBTN}>
                {saving?"...":"💾 ENREGISTRER"}
              </button>
            </>
          ) : (
            <>
              {tournament?.room_code && (
                <InfoRow label="ID ROOM" value={tournament.room_code}
                  onCopy={()=>copy(tournament.room_code,"code")} copied={copied==="code"} />
              )}
              {tournament?.room_password && (
                <InfoRow label="MOT DE PASSE" value={tournament.room_password}
                  onCopy={()=>copy(tournament.room_password,"pass")} copied={copied==="pass"} />
              )}
            </>
          )}
        </div>
      )}

      {!isOrganizer && phase==="ready" && (
        <button onClick={handleReady} disabled={toggling} style={{
          padding:"13px 0", borderRadius:8, border:"none",
          cursor: toggling?"wait":"pointer",
          fontWeight:700, fontSize:14, letterSpacing:1,
          background: isReady
            ?"linear-gradient(135deg,#10b981,#059669)"
            :"linear-gradient(135deg,#7c3aed,#4c1d95)",
          color:"#fff", opacity: toggling?0.7:1,
          boxShadow: isReady?"0 0 16px rgba(16,185,129,0.4)":"0 0 16px rgba(124,58,237,0.3)",
          transition:"all 0.2s",
        }}>
          {toggling?"...":isReady?"✅ PRÊT — Annuler":"⚡ JE SUIS PRÊT"}
        </button>
      )}

      {isOrganizer && phase==="ready" && (
        <button onClick={onStartMatch} style={{
          padding:"14px 0", borderRadius:8, border:"none", cursor:"pointer",
          fontWeight:800, fontSize:15, letterSpacing:1.5,
          background: allReady
            ?"linear-gradient(135deg,#10b981,#059669)"
            :"linear-gradient(135deg,#7c3aed,#4c1d95)",
          color:"#fff",
          boxShadow: allReady?"0 0 24px rgba(16,185,129,0.5)":"0 0 20px rgba(124,58,237,0.4)",
          animation:"glow 2s infinite",
        }}>
          ▶ LANCER LE MATCH
          {!allReady && totalCount>0 && (
            <span style={{ display:"block", fontSize:10, fontWeight:400, opacity:0.7, marginTop:2 }}>
              ({rCount}/{totalCount} prêts)
            </span>
          )}
        </button>
      )}

      {isOrganizer && phase==="live" && onEndMatch && (
        <button onClick={onEndMatch} style={{
          padding:"14px 0", borderRadius:8, border:"none", cursor:"pointer",
          fontWeight:800, fontSize:15,
          background:"linear-gradient(135deg,#ef4444,#dc2626)",
          color:"#fff", boxShadow:"0 0 20px rgba(239,68,68,0.4)",
        }}>
          🏁 TERMINER LE MATCH
        </button>
      )}

      {isOrganizer && phase==="results" && (
        <div style={{
          background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)",
          borderRadius:10, padding:"14px 16px", textAlign:"center"
        }}>
          <div style={{fontSize:18, marginBottom:6}}>⏳</div>
          <div style={{fontSize:13, fontWeight:700, color:"#f59e0b"}}>SOUMISSION OUVERTE</div>
          <div style={{fontSize:11, color:"#6b7280", marginTop:4}}>
            En attente des résultats des joueurs
          </div>
          <div style={{fontSize:11, color:"#6b7280", marginTop:2}}>
            Validez-les dans → Admin Results
          </div>
        </div>
      )}

            {!isOrganizer && phase==="results" && onOpenSubmit && (
        <button onClick={onOpenSubmit} style={{
          padding:"14px 0", borderRadius:8, border:"none", cursor:"pointer",
          fontWeight:800, fontSize:14,
          background:"linear-gradient(135deg,#f59e0b,#d97706)",
          color:"#fff", boxShadow:"0 0 20px rgba(245,158,11,0.4)",
          animation:"glow 2s infinite",
        }}>
          📊 SOUMETTRE MON RÉSULTAT
        </button>
      )}

      <div style={{
        textAlign:"center", fontSize:11, color:"#4b5563",
        borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:10,
      }}>
        {phase==="live"    && <span style={{color:"#ef4444"}}>🔴 MATCH EN COURS</span>}
        {phase==="ready"   && "⏳ EN ATTENTE DE LANCEMENT"}
        {phase==="results" && <span style={{color:"#f59e0b"}}>📊 SOUMISSION OUVERTE</span>}
        {phase==="done"    && <span style={{color:"#10b981"}}>✅ TERMINÉ</span>}
      </div>

      <style>{`@keyframes glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}`}</style>
    </div>
  );
}

const Stat = ({label,value,color}) => (
  <div style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
    <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>{label}</div>
    <div style={{fontSize:22,fontWeight:800,color}}>{value}</div>
  </div>
);
const Lbl = ({children}) => (
  <div style={{fontSize:10,color:"#6b7280",fontWeight:700,letterSpacing:1}}>{children}</div>
);
const InfoRow = ({label,value,onCopy,copied}) => (
  <div>
    <Lbl>{label}</Lbl>
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
      <div style={{flex:1,background:"rgba(0,0,0,0.3)",borderRadius:6,padding:"6px 10px",
        fontSize:15,fontWeight:700,color:"#00d4ff",letterSpacing:2}}>{value}</div>
      <button onClick={onCopy} style={{
        background:copied?"#10b981":"rgba(0,212,255,0.1)",
        border:"1px solid rgba(0,212,255,0.3)",
        borderRadius:6,padding:"6px 10px",color:"#00d4ff",cursor:"pointer",fontSize:13,
      }}>{copied?"✓":"📋"}</button>
    </div>
  </div>
);
const INP={width:"100%",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(139,92,246,0.3)",
  borderRadius:6,padding:"8px 10px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box"};
const SBTN={padding:"8px 0",borderRadius:6,border:"none",cursor:"pointer",
  background:"linear-gradient(135deg,#7c3aed,#4c1d95)",color:"#fff",fontWeight:700,fontSize:13};