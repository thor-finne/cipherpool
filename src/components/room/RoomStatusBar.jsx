import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

const CYAN="#00d4ff",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",INDIGO="#818cf8",VIOLET="#a78bfa";

const STATUSES = [
  { key:"registration", label:"INSCRIPTION",    icon:"📋", color:INDIGO },
  { key:"ready",        label:"PRÊT",           icon:"✅", color:VIOLET },
  { key:"waiting",      label:"EN ATTENTE",     icon:"⏳", color:AMBER  },
  { key:"live",         label:"EN COURS",       icon:"🔴", color:RED    },
  { key:"results_open", label:"RÉSULTATS",      icon:"📊", color:CYAN   },
  { key:"results_closed",label:"TERMINÉ",       icon:"🏁", color:GREEN  },
];

function useCountdown(targetTime) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!targetTime) return;
    const tick = () => {
      const diff = new Date(targetTime) - new Date();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);
  return remaining;
}

function formatTime(secs) {
  if (secs === null) return "--:--";
  const m = Math.floor(secs / 60).toString().padStart(2,"0");
  const s = (secs % 60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

// ── Admin setup panel: set room code + start time ──
function RoomSetupPanel({ tournament, onDone }) {
  const [code,     setCode]     = useState(tournament?.room_code || "");
  const [pass,     setPass]     = useState(tournament?.room_password || "");
  const [startDt,  setStartDt]  = useState("");
  const [duration, setDuration] = useState(tournament?.match_duration || 20);
  const [window_,  setWindow]   = useState(tournament?.result_window  || 10);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleSave = async () => {
    if (!code.trim())   { setError("Room ID requis"); return; }
    if (!startDt)       { setError("Heure de début requise"); return; }
    setSaving(true); setError("");
    const { data, error: e } = await supabase.rpc("setup_room", {
      p_tournament_id:  tournament.id,
      p_room_code:      code.trim(),
      p_room_password:  pass.trim() || null,
      p_start_time:     new Date(startDt).toISOString(),
      p_match_duration: duration,
      p_result_window:  window_,
    });
    setSaving(false);
    if (e || !data?.success) { setError(e?.message || data?.error); return; }
    onDone();
  };

  const inp = {
    padding:"10px 14px", borderRadius:10,
    background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
    color:"#fff", fontFamily:"Space Grotesk,sans-serif", fontSize:13,
    outline:"none", width:"100%", boxSizing:"border-box"
  };

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
      style={{padding:"20px", background:"#0a1628", borderRadius:16, border:`1px solid ${AMBER}22`, marginBottom:12}}>
      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,letterSpacing:3,color:AMBER+"99",marginBottom:16}}>
        ⚙️ CONFIGURER LA ROOM
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:"rgba(255,255,255,.25)",letterSpacing:1,marginBottom:5}}>ID ROOM *</p>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Ex: 123456" style={inp}/>
          </div>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:"rgba(255,255,255,.25)",letterSpacing:1,marginBottom:5}}>MOT DE PASSE</p>
            <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Optionnel" style={inp}/>
          </div>
        </div>
        <div>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:"rgba(255,255,255,.25)",letterSpacing:1,marginBottom:5}}>HEURE DE DÉBUT *</p>
          <input type="datetime-local" value={startDt} onChange={e=>setStartDt(e.target.value)} style={{...inp,colorScheme:"dark"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:"rgba(255,255,255,.25)",letterSpacing:1,marginBottom:5}}>DURÉE MATCH (min)</p>
            <input type="number" value={duration} onChange={e=>setDuration(+e.target.value)} min={5} max={60} style={inp}/>
          </div>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:"rgba(255,255,255,.25)",letterSpacing:1,marginBottom:5}}>FENÊTRE RÉSULTATS (min)</p>
            <input type="number" value={window_} onChange={e=>setWindow(+e.target.value)} min={5} max={30} style={inp}/>
          </div>
        </div>
        {error && <p style={{color:RED,fontFamily:"Space Grotesk,sans-serif",fontSize:12}}>❌ {error}</p>}
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}} onClick={handleSave} disabled={saving}
          style={{padding:"13px 0",borderRadius:12,background:`linear-gradient(135deg,${AMBER},rgba(251,191,36,.6))`,border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:11,letterSpacing:2,fontWeight:700,cursor:"pointer"}}>
          {saving ? "ENREGISTREMENT..." : "💾 CRÉER LA ROOM"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main RoomStatusBar ──
export default function RoomStatusBar({ tournament, role, onTournamentUpdate }) {
  const [showSetup, setShowSetup] = useState(false);
  const [closingReg, setClosingReg] = useState(false);

  // Fallback: derive room_status from old status if new column not yet added
  const status = tournament?.room_status || (
    tournament?.status === "live"     ? "live"     :
    tournament?.status === "finished" ? "results_open" :
    tournament?.status === "closed"   ? "ready"    :
    "registration"
  );
  const current = STATUSES.find(s=>s.key===status) || STATUSES[0];
  const currentIdx = STATUSES.findIndex(s=>s.key===status);
  const isOrg = role === "organizer";

  // Countdown targets
  const waitingCountdown = status === "waiting" ? tournament?.start_time : null;
  const liveCountdown    = status === "live"    ? tournament?.end_time   : null;
  const resultsCountdown = status === "results_open" ? tournament?.result_deadline : null;
  const countdown = useCountdown(waitingCountdown || liveCountdown || resultsCountdown);

  // Poll sync_room_status every 10s
  useEffect(() => {
    if (!tournament?.id) return;
    if (!["waiting","live","results_open"].includes(status)) return;
    const poll = async () => {
      const { data } = await supabase.rpc("sync_room_status", { p_tournament_id: tournament.id });
      if (data?.success && data.tournament?.room_status !== status) {
        onTournamentUpdate?.(data.tournament);
      }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [tournament?.id, status]);

  const handleCloseRegistration = async () => {
    setClosingReg(true);
    await supabase.rpc("close_registration", { p_tournament_id: tournament.id });
    setClosingReg(false);
    onTournamentUpdate?.({ ...tournament, room_status:"ready", status:"closed" });
  };

  const countdownLabel = {
    waiting:      "DÉBUT DANS",
    live:         "FIN DANS",
    results_open: "CLÔTURE DANS",
  }[status];

  return (
    <div style={{width:"100%",background:"#060f23",borderBottom:"1px solid rgba(255,255,255,.06)"}}>

      {/* Progress steps */}
      <div style={{display:"flex",alignItems:"center",padding:"12px 20px",gap:4,overflowX:"auto"}}>
        {STATUSES.map((s,i) => {
          const done    = i < currentIdx;
          const active  = i === currentIdx;
          return (
            <div key={s.key} style={{display:"flex",alignItems:"center",flexShrink:0}}>
              <div style={{
                display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,
                background: active ? `${s.color}18` : done ? "rgba(255,255,255,.03)" : "transparent",
                border: `1px solid ${active ? s.color+"55" : done ? "rgba(255,255,255,.08)" : "transparent"}`,
              }}>
                <span style={{fontSize:12}}>{done ? "✓" : s.icon}</span>
                <span style={{
                  fontFamily:"JetBrains Mono,monospace",fontSize:8,letterSpacing:1,
                  color: active ? s.color : done ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.15)"
                }}>
                  {s.label}
                </span>
              </div>
              {i < STATUSES.length-1 && (
                <div style={{width:20,height:1,background:done?"rgba(255,255,255,.15)":"rgba(255,255,255,.06)",margin:"0 2px"}}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Countdown strip */}
      {countdown !== null && countdownLabel && (
        <div style={{
          background: status==="live" ? `${RED}11` : status==="results_open" ? `${CYAN}0a` : `${AMBER}0a`,
          borderTop:`1px solid ${status==="live"?RED:status==="results_open"?CYAN:AMBER}22`,
          padding:"8px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"
        }}>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,letterSpacing:2,
            color:status==="live"?RED:status==="results_open"?CYAN:AMBER}}>
            {countdownLabel}
          </p>
          <p style={{fontFamily:"Bebas Neue,cursive",fontSize:22,letterSpacing:2,
            color:status==="live"?RED:status==="results_open"?CYAN:AMBER,
            textShadow:`0 0 16px currentColor`}}>
            {formatTime(countdown)}
          </p>
          {/* Live progress bar */}
          {status === "live" && tournament?.start_time && tournament?.end_time && (
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"rgba(255,255,255,.05)"}}>
              <motion.div style={{
                height:"100%",background:RED,
                width:`${Math.min(100,((Date.now()-new Date(tournament.start_time))/(new Date(tournament.end_time)-new Date(tournament.start_time)))*100)}%`
              }}/>
            </div>
          )}
        </div>
      )}

      {/* Admin controls */}
      {isOrg && (
        <div style={{padding:"10px 20px",borderTop:"1px solid rgba(255,255,255,.04)",display:"flex",gap:8,flexWrap:"wrap"}}>
          {status === "registration" && (
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:.96}}
              onClick={handleCloseRegistration} disabled={closingReg}
              style={{padding:"8px 16px",borderRadius:9,background:`rgba(129,140,248,.12)`,border:`1px solid rgba(129,140,248,.25)`,color:INDIGO,fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1.5,cursor:"pointer",fontWeight:700}}>
              🔒 FERMER INSCRIPTIONS
            </motion.button>
          )}
          {status === "ready" && !tournament?.room_code && (
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:.96}}
              onClick={() => setShowSetup(s=>!s)}
              style={{padding:"8px 16px",borderRadius:9,background:`${AMBER}18`,border:`1px solid ${AMBER}33`,color:AMBER,fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1.5,cursor:"pointer",fontWeight:700}}>
              ⚙️ {showSetup ? "ANNULER" : "CONFIGURER ROOM"}
            </motion.button>
          )}
          {status === "results_open" && (
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:.96}}
              onClick={async()=>{
                await supabase.from("tournaments").update({room_status:"results_closed"}).eq("id",tournament.id);
                onTournamentUpdate?.({...tournament,room_status:"results_closed"});
              }}
              style={{padding:"8px 16px",borderRadius:9,background:`${RED}12`,border:`1px solid ${RED}33`,color:RED,fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1.5,cursor:"pointer",fontWeight:700}}>
              🚫 FERMER RÉSULTATS
            </motion.button>
          )}
        </div>
      )}

      {/* Setup panel */}
      <AnimatePresence>
        {showSetup && isOrg && (
          <div style={{padding:"0 20px 12px"}}>
            <RoomSetupPanel tournament={tournament} onDone={() => { setShowSetup(false); window.location.reload(); }} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}