import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BG    = "#020817"; const SURF  = "#060f23"; const CARD  = "#0a1628";
const CYAN  = "#00d4ff"; const INDIGO= "#818cf8"; const GREEN = "#10b981";
const RED   = "#f43f5e"; const AMBER = "#fbbf24"; const VIOLET= "#a78bfa";
const cx = a => `rgba(0,212,255,${a})`;
const gx = a => `rgba(16,185,129,${a})`;
const ax = a => `rgba(251,191,36,${a})`;

// Free Fire placement points
const PLACEMENT_PTS = [0,12,9,8,7,6,5,4,3,2,1,0,0];
const calcPoints = (placement, kills) => (PLACEMENT_PTS[placement]||0) + (kills||0);

const G = ({ children, ac=CYAN, style={}, ...p }) => (
  <div style={{
    background: CARD, borderRadius:16,
    border: `1px solid ${ac}22`,
    boxShadow: `0 0 30px ${ac}08`,
    ...style
  }} {...p}>{children}</div>
);

export default function SubmitResult() {
  const { profile } = useOutletContext();
  const [step, setStep]           = useState(1); // 1=form 2=preview 3=success
  const [tournamentId, setTournamentId] = useState("");
  const [matchNum, setMatchNum]   = useState(1);
  const [placement, setPlacement] = useState(1);
  const [kills, setKills]         = useState(0);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [result, setResult]       = useState(null);
  const fileRef = useRef();

  const points = calcPoints(placement, kills);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Image uniquement"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Max 5MB"); return; }
    setScreenshot(file);
    // Preview
    const reader = new FileReader();
    reader.onload = ev => setScreenshotUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const uploadScreenshot = async () => {
    if (!screenshot) return null;
    setUploading(true);
    const ext = screenshot.name.split(".").pop();
    const path = `match-results/${profile.id}/${Date.now()}.${ext}`;
    const { data, error: upErr } = await supabase.storage
      .from("screenshots")
      .upload(path, screenshot, { cacheControl: "3600", upsert: false });
    setUploading(false);
    if (upErr) { setError("Erreur upload: " + upErr.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from("screenshots").getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!tournamentId.trim()) { setError("Tournament ID requis"); return; }
    setSubmitting(true); setError("");
    try {
      let imgUrl = screenshotUrl && screenshot ? await uploadScreenshot() : null;

      const { data, error: rpcErr } = await supabase.rpc("submit_match_result", {
        p_tournament_id:   tournamentId.trim(),
        p_match_number:    matchNum,
        p_team_id:         profile.team_id || null,
        p_placement:       placement,
        p_kills:           kills,
        p_screenshot_url:  imgUrl,
      });

      if (rpcErr) throw rpcErr;
      if (!data?.success) throw new Error(data?.error || "Erreur soumission");

      setResult(data);
      setStep(3);
    } catch(e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const PlacementBadge = ({ pos }) => {
    const colors = { 1:AMBER, 2:"#c0c0c0", 3:"#cd7f32" };
    const color = colors[pos] || "rgba(255,255,255,.4)";
    return (
      <motion.button
        whileHover={{ scale: 1.08 }} whileTap={{ scale: .95 }}
        onClick={() => setPlacement(pos)}
        style={{
          width: 52, height: 52, borderRadius: 12,
          background: placement === pos ? `${color}22` : "rgba(255,255,255,.03)",
          border: `2px solid ${placement === pos ? color : "rgba(255,255,255,.08)"}`,
          color: placement === pos ? color : "rgba(255,255,255,.3)",
          fontFamily: "Bebas Neue,cursive", fontSize: 22,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 0,
          boxShadow: placement === pos ? `0 0 16px ${color}44` : "none",
          transition: "all .15s"
        }}
      >
        <span>{pos}</span>
        {pos <= 3 && <span style={{ fontSize: 8, marginTop: -2 }}>
          {pos===1?"👑":pos===2?"🥈":"🥉"}
        </span>}
      </motion.button>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:BG, padding:"32px 24px", fontFamily:"Space Grotesk,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input:focus, textarea:focus { outline:none; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} style={{ marginBottom: 32 }}>
          <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:3, color:cx(.4), marginBottom:8 }}>
            🎮 RÉSULTATS DE MATCH
          </p>
          <h1 style={{ fontFamily:"Bebas Neue,cursive", fontSize:42, letterSpacing:2, color:"#fff", margin:0, lineHeight:1 }}>
            SOUMETTRE <span style={{ color:CYAN }}>RÉSULTAT</span>
          </h1>
          <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:10, color:"rgba(255,255,255,.25)", marginTop:8, letterSpacing:1 }}>
            Les résultats seront vérifiés par un admin avant validation
          </p>
        </motion.div>

        {/* Steps */}
        <div style={{ display:"flex", gap:8, marginBottom:28 }}>
          {["INFOS","APERÇU","ENVOYÉ"].map((s,i) => (
            <div key={i} style={{ flex:1, padding:"10px 0", borderRadius:10, textAlign:"center",
              background: step > i ? cx(.12) : "rgba(255,255,255,.03)",
              border: `1px solid ${step > i ? cx(.3) : "rgba(255,255,255,.06)"}`,
              fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2,
              color: step > i ? CYAN : "rgba(255,255,255,.2)" }}>
              {i+1}. {s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: FORM ── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }}>

              {/* Tournament ID */}
              <G style={{ padding:"22px 24px", marginBottom:14 }}>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:VIOLET, marginBottom:14 }}>
                  📋 TOURNOI
                </p>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontFamily:"JetBrains Mono,monospace", fontSize:8, letterSpacing:2, color:"rgba(255,255,255,.25)", marginBottom:7 }}>
                    TOURNAMENT ID
                  </label>
                  <input value={tournamentId} onChange={e=>setTournamentId(e.target.value)}
                    placeholder="Coller l'ID du tournoi"
                    style={{ width:"100%", padding:"12px 16px", borderRadius:10, background:"rgba(129,140,248,.05)", border:`1px solid rgba(129,140,248,.2)`, color:"#fff", fontFamily:"JetBrains Mono,monospace", fontSize:12, boxSizing:"border-box", letterSpacing:1 }}
                  />
                </div>
                <div>
                  <label style={{ display:"block", fontFamily:"JetBrains Mono,monospace", fontSize:8, letterSpacing:2, color:"rgba(255,255,255,.25)", marginBottom:7 }}>
                    NUMÉRO DE MATCH
                  </label>
                  <div style={{ display:"flex", gap:8 }}>
                    {[1,2,3,4,5,6].map(n => (
                      <motion.button key={n} whileHover={{scale:1.08}} whileTap={{scale:.95}}
                        onClick={() => setMatchNum(n)}
                        style={{ flex:1, padding:"10px 0", borderRadius:9, fontFamily:"Bebas Neue,cursive", fontSize:18,
                          background: matchNum===n ? "rgba(129,140,248,.15)" : "rgba(255,255,255,.03)",
                          border: `1px solid ${matchNum===n?"rgba(129,140,248,.4)":"rgba(255,255,255,.07)"}`,
                          color: matchNum===n ? INDIGO : "rgba(255,255,255,.3)", cursor:"pointer" }}>
                        {n}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </G>

              {/* Placement */}
              <G style={{ padding:"22px 24px", marginBottom:14 }}>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:AMBER, marginBottom:14 }}>
                  🏆 CLASSEMENT FINAL
                </p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {Array.from({length:12},(_,i)=>i+1).map(pos => (
                    <PlacementBadge key={pos} pos={pos} />
                  ))}
                </div>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, color:ax(.6), marginTop:12, letterSpacing:1 }}>
                  {placement <= 3 ? `🏆 TOP ${placement} — +${PLACEMENT_PTS[placement]} pts placement` : `+${PLACEMENT_PTS[placement]||0} pts placement`}
                </p>
              </G>

              {/* Kills */}
              <G style={{ padding:"22px 24px", marginBottom:14 }}>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:RED, marginBottom:14 }}>
                  💀 NOMBRE DE KILLS
                </p>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <motion.button whileHover={{scale:1.1}} whileTap={{scale:.9}}
                    onClick={() => setKills(k => Math.max(0, k-1))}
                    style={{ width:44, height:44, borderRadius:10, background:"rgba(244,63,94,.1)", border:"1px solid rgba(244,63,94,.25)", color:RED, fontSize:22, cursor:"pointer", fontFamily:"Bebas Neue,cursive" }}>
                    −
                  </motion.button>
                  <input type="number" value={kills} onChange={e=>setKills(Math.max(0,Math.min(99,+e.target.value||0)))}
                    style={{ flex:1, padding:"14px 0", textAlign:"center", borderRadius:12, background:"rgba(244,63,94,.05)", border:"1px solid rgba(244,63,94,.15)", color:"#fff", fontFamily:"Bebas Neue,cursive", fontSize:36, letterSpacing:2 }} />
                  <motion.button whileHover={{scale:1.1}} whileTap={{scale:.9}}
                    onClick={() => setKills(k => Math.min(99, k+1))}
                    style={{ width:44, height:44, borderRadius:10, background:gx(.1), border:`1px solid ${gx(.25)}`, color:GREEN, fontSize:22, cursor:"pointer", fontFamily:"Bebas Neue,cursive" }}>
                    +
                  </motion.button>
                </div>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, color:"rgba(244,63,94,.6)", marginTop:10, letterSpacing:1 }}>
                  +{kills} pts kills
                </p>
              </G>

              {/* Screenshot */}
              <G style={{ padding:"22px 24px", marginBottom:14 }}>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:cx(.7), marginBottom:14 }}>
                  📸 SCREENSHOT PREUVE
                </p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
                {screenshotUrl ? (
                  <div style={{ position:"relative" }}>
                    <img src={screenshotUrl} alt="screenshot"
                      style={{ width:"100%", borderRadius:12, objectFit:"cover", maxHeight:220, border:`1px solid ${cx(.2)}` }} />
                    <motion.button whileHover={{scale:1.05}} onClick={() => { setScreenshot(null); setScreenshotUrl(""); }}
                      style={{ position:"absolute", top:10, right:10, padding:"6px 12px", borderRadius:8, background:"rgba(244,63,94,.8)", border:"none", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"JetBrains Mono,monospace" }}>
                      ✕ CHANGER
                    </motion.button>
                  </div>
                ) : (
                  <motion.div whileHover={{ borderColor:CYAN, background:cx(.04) }}
                    onClick={() => fileRef.current?.click()}
                    style={{ border:`2px dashed ${cx(.15)}`, borderRadius:14, padding:"36px 24px", textAlign:"center", cursor:"pointer", transition:"all .2s" }}>
                    <p style={{ fontSize:32, marginBottom:8 }}>📸</p>
                    <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:10, color:"rgba(255,255,255,.3)", letterSpacing:1 }}>
                      CLIQUEZ POUR UPLOADER
                    </p>
                    <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:8, color:"rgba(255,255,255,.15)", marginTop:6, letterSpacing:1 }}>
                      Scoreboard ou Room Result · Max 5MB
                    </p>
                  </motion.div>
                )}
              </G>

              {/* Points preview */}
              <G ac={points > 0 ? CYAN : "rgba(255,255,255,.1)"} style={{ padding:"18px 24px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:8, letterSpacing:2, color:"rgba(255,255,255,.25)", marginBottom:4 }}>TOTAL ESTIMÉ</p>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, color:"rgba(255,255,255,.4)", letterSpacing:1 }}>
                    {PLACEMENT_PTS[placement]||0} placement + {kills} kills
                  </p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontFamily:"Bebas Neue,cursive", fontSize:48, color: points > 0 ? CYAN : "rgba(255,255,255,.15)", lineHeight:1, letterSpacing:2, textShadow: points > 0 ? `0 0 20px ${CYAN}66` : "none" }}>
                    {points}
                  </p>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:8, color:"rgba(255,255,255,.2)", letterSpacing:1 }}>POINTS</p>
                </div>
              </G>

              {error && (
                <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(244,63,94,.1)", border:"1px solid rgba(244,63,94,.2)", color:RED, fontFamily:"Space Grotesk,sans-serif", fontSize:13, marginBottom:16 }}>
                  ❌ {error}
                </div>
              )}

              <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}}
                onClick={() => { if(!tournamentId.trim()){setError("Tournament ID requis");return;} setError(""); setStep(2); }}
                style={{ width:"100%", padding:"16px 0", borderRadius:13, background:`linear-gradient(135deg,${CYAN},${INDIGO})`, border:"none", color:"#000", fontFamily:"JetBrains Mono,monospace", fontSize:12, letterSpacing:2, fontWeight:700, cursor:"pointer", boxShadow:`0 8px 32px ${cx(.3)}` }}>
                APERÇU AVANT ENVOI →
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 2: PREVIEW ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }}>
              <G style={{ padding:"28px 28px", marginBottom:16 }}>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:AMBER, marginBottom:20 }}>
                  👁️ VÉRIFICATION AVANT SOUMISSION
                </p>

                {[
                  ["TOURNOI", tournamentId.slice(0,20)+"...", VIOLET],
                  ["MATCH", `Match #${matchNum}`, INDIGO],
                  ["CLASSEMENT", `${placement}ème place`, placement<=3?AMBER:cx(.7)],
                  ["KILLS", `${kills} kills`, RED],
                  ["POINTS CALCULÉS", `${points} pts`, CYAN],
                  ["SCREENSHOT", screenshot ? "✅ Fourni" : "⚠️ Non fourni", screenshot?GREEN:AMBER],
                ].map(([lbl, val, col]) => (
                  <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:1.5, color:"rgba(255,255,255,.3)" }}>{lbl}</span>
                    <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize:11, color:col, letterSpacing:1 }}>{val}</span>
                  </div>
                ))}

                <div style={{ marginTop:20, padding:"14px 16px", borderRadius:10, background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.15)" }}>
                  <p style={{ fontFamily:"Space Grotesk,sans-serif", fontSize:12, color:"rgba(255,255,255,.5)", lineHeight:1.6, margin:0 }}>
                    ⚠️ Les résultats soumis seront vérifiés par un admin. Toute soumission frauduleuse entraîne un ban définitif.
                  </p>
                </div>
              </G>

              {screenshotUrl && (
                <G style={{ padding:"16px", marginBottom:16 }}>
                  <img src={screenshotUrl} alt="proof" style={{ width:"100%", borderRadius:10, objectFit:"cover", maxHeight:200 }} />
                </G>
              )}

              {error && (
                <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(244,63,94,.1)", border:"1px solid rgba(244,63,94,.2)", color:RED, fontFamily:"Space Grotesk,sans-serif", fontSize:13, marginBottom:16 }}>
                  ❌ {error}
                </div>
              )}

              <div style={{ display:"flex", gap:12 }}>
                <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}}
                  onClick={() => setStep(1)}
                  style={{ flex:1, padding:"14px 0", borderRadius:12, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontFamily:"JetBrains Mono,monospace", fontSize:11, letterSpacing:2, cursor:"pointer" }}>
                  ← MODIFIER
                </motion.button>
                <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}}
                  onClick={handleSubmit} disabled={submitting||uploading}
                  style={{ flex:2, padding:"14px 0", borderRadius:12, background:`linear-gradient(135deg,${GREEN},${CYAN})`, border:"none", color:"#000", fontFamily:"JetBrains Mono,monospace", fontSize:11, letterSpacing:2, fontWeight:700, cursor:submitting?"wait":"pointer" }}>
                  {submitting||uploading ? "ENVOI EN COURS..." : "✅ CONFIRMER ET ENVOYER"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: SUCCESS ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} style={{ textAlign:"center", padding:"48px 24px" }}>
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:.2, type:"spring" }}
                style={{ fontSize:72, marginBottom:24 }}>
                ✅
              </motion.div>
              <h2 style={{ fontFamily:"Bebas Neue,cursive", fontSize:36, color:GREEN, letterSpacing:2, marginBottom:8 }}>
                RÉSULTAT SOUMIS
              </h2>
              <p style={{ fontFamily:"Space Grotesk,sans-serif", fontSize:14, color:"rgba(255,255,255,.4)", marginBottom:32, lineHeight:1.6 }}>
                Votre résultat est en attente de vérification.<br/>
                Un admin va vérifier et valider sous 24h.
              </p>
              <G style={{ padding:"24px 28px", marginBottom:28, display:"inline-block", minWidth:280 }}>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, color:"rgba(255,255,255,.25)", letterSpacing:2, marginBottom:12 }}>POINTS EN ATTENTE</p>
                <p style={{ fontFamily:"Bebas Neue,cursive", fontSize:56, color:CYAN, letterSpacing:2, lineHeight:1, textShadow:`0 0 30px ${CYAN}66` }}>
                  +{result?.points || points}
                </p>
                <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, color:ax(.7), letterSpacing:1, marginTop:4 }}>
                  ≈ {(result?.points||points) * 10} COINS si validé
                </p>
              </G>
              <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                <motion.button whileHover={{scale:1.04}} onClick={() => { setStep(1); setTournamentId(""); setPlacement(1); setKills(0); setScreenshot(null); setScreenshotUrl(""); setResult(null); }}
                  style={{ padding:"12px 28px", borderRadius:11, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontFamily:"JetBrains Mono,monospace", fontSize:10, letterSpacing:2, cursor:"pointer" }}>
                  NOUVEAU RÉSULTAT
                </motion.button>
                <motion.button whileHover={{scale:1.04}} onClick={() => window.location.href="/dashboard"}
                  style={{ padding:"12px 28px", borderRadius:11, background:`linear-gradient(135deg,${CYAN},${INDIGO})`, border:"none", color:"#000", fontFamily:"JetBrains Mono,monospace", fontSize:10, letterSpacing:2, fontWeight:700, cursor:"pointer" }}>
                  TABLEAU DE BORD
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}