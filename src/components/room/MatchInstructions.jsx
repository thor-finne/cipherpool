import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CYAN="#00d4ff", GREEN="#10b981", RED="#f43f5e", AMBER="#fbbf24", INDIGO="#818cf8";
const cx=a=>`rgba(0,212,255,${a})`;

// ── OVERLAY affiché quand le match commence (status = "live") ──
export function MatchStartOverlay({ tournament, onDismiss }) {
  const isCS = tournament?.game_type === "cs";
  const fmt  = tournament?.cs_format || tournament?.mode || "";

  const instructions = isCS ? [
    { icon:"🎯", text:`Format ${fmt.toUpperCase()} — 2 équipes s'affrontent` },
    { icon:"📸", text:"À la fin: faites un screenshot du SCOREBOARD" },
    { icon:"💀", text:"Notez vos kills et le résultat (victoire/défaite)" },
    { icon:"📊", text:'Cliquez "SOUMETTRE RÉSULTAT" pour envoyer vos stats' },
    { icon:"⚠️", text:"Screenshot obligatoire — résultat sans preuve refusé" },
  ] : [
    { icon:"🎯", text:"Battle Royale — survivez le plus longtemps possible" },
    { icon:"📸", text:"À la fin: screenshot de l'écran RÉSULTATS (classement)" },
    { icon:"💀", text:"L'écran doit montrer: votre placement ET vos kills" },
    { icon:"📊", text:'Cliquez "SOUMETTRE RÉSULTAT" pour envoyer vos stats' },
    { icon:"⚠️", text:"Screenshot obligatoire — résultat sans preuve refusé" },
  ];

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.92)",
        backdropFilter:"blur(12px)", zIndex:500,
        display:"flex", alignItems:"center", justifyContent:"center", padding:24
      }}>
      <motion.div
        initial={{ scale:.85, y:30 }} animate={{ scale:1, y:0 }}
        transition={{ type:"spring", damping:18 }}
        style={{
          background:"#0a1628", borderRadius:24, maxWidth:480, width:"100%",
          border:`2px solid ${RED}44`, boxShadow:`0 0 80px ${RED}22`,
          overflow:"hidden"
        }}>

        {/* Header */}
        <div style={{
          background:`linear-gradient(135deg,${RED}22,${AMBER}11)`,
          padding:"28px 32px 20px",
          borderBottom:`1px solid ${RED}22`, textAlign:"center"
        }}>
          <motion.div
            animate={{ scale:[1,1.15,1] }} transition={{ repeat:3, duration:.4 }}
            style={{ fontSize:52, marginBottom:12 }}>
            🏁
          </motion.div>
          <p style={{
            fontFamily:"JetBrains Mono,monospace", fontSize:9,
            letterSpacing:3, color:`${RED}cc`, marginBottom:8
          }}>
            LE MATCH A COMMENCÉ
          </p>
          <h2 style={{
            fontFamily:"Bebas Neue,cursive", fontSize:32,
            color:"#fff", letterSpacing:2, margin:0
          }}>
            {tournament?.name}
          </h2>
          <p style={{
            fontFamily:"JetBrains Mono,monospace", fontSize:10,
            color:"rgba(255,255,255,.35)", marginTop:6, letterSpacing:1
          }}>
            {isCS ? `Clash Squad · ${fmt}` : `Battle Royale · ${tournament?.mode || "Solo"}`}
          </p>
        </div>

        {/* Instructions */}
        <div style={{ padding:"24px 28px" }}>
          <p style={{
            fontFamily:"JetBrains Mono,monospace", fontSize:8,
            letterSpacing:3, color:"rgba(255,255,255,.25)", marginBottom:16
          }}>
            📋 INSTRUCTIONS
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {instructions.map((inst, i) => (
              <motion.div key={i}
                initial={{ opacity:0, x:-16 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display:"flex", gap:12, alignItems:"flex-start",
                  padding:"10px 14px", borderRadius:11,
                  background: i===4 ? `${RED}0d` : "rgba(255,255,255,.03)",
                  border: `1px solid ${i===4 ? RED+"33" : "rgba(255,255,255,.06)"}`
                }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{inst.icon}</span>
                <p style={{
                  fontFamily:"Space Grotesk,sans-serif", fontSize:13,
                  color: i===4 ? RED : "rgba(255,255,255,.7)",
                  lineHeight:1.5, margin:0,
                  fontWeight: i===4 ? 600 : 400
                }}>
                  {inst.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding:"0 28px 28px" }}>
          <motion.button
            whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
            onClick={onDismiss}
            style={{
              width:"100%", padding:"15px 0", borderRadius:14,
              background:`linear-gradient(135deg,${GREEN},${CYAN})`,
              border:"none", color:"#000",
              fontFamily:"JetBrains Mono,monospace", fontSize:12,
              letterSpacing:2, fontWeight:700, cursor:"pointer",
              boxShadow:`0 8px 32px rgba(16,185,129,.35)`
            }}>
            ✅ J'AI COMPRIS — BONNE CHANCE !
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── SUBMIT REMINDER — flottant en bas quand status = "finished" ──
export function SubmitReminder({ onSubmit }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return (
    <motion.div
      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      style={{
        position:"fixed", bottom:24, right:24, zIndex:200,
        background:"#0a1628", border:`1px solid ${CYAN}33`,
        borderRadius:14, padding:"12px 16px",
        display:"flex", alignItems:"center", gap:10,
        boxShadow:`0 8px 32px ${cx(.15)}`
      }}>
      <span style={{ fontSize:18 }}>📊</span>
      <div>
        <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, color:CYAN, letterSpacing:1, marginBottom:2 }}>
          MATCH TERMINÉ
        </p>
        <button onClick={onSubmit}
          style={{ fontFamily:"JetBrains Mono,monospace", fontSize:8, color:"rgba(255,255,255,.5)", background:"none", border:"none", cursor:"pointer", letterSpacing:1, padding:0, textDecoration:"underline" }}>
          Soumettre mon résultat →
        </button>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:40 }}
      style={{
        position:"fixed", bottom:24, left:"50%",
        transform:"translateX(-50%)", zIndex:200,
        background:"#0a1628", borderRadius:20,
        border:`2px solid ${CYAN}44`,
        padding:"20px 28px", maxWidth:480, width:"calc(100% - 48px)",
        boxShadow:`0 0 60px ${cx(.2)}, 0 16px 48px rgba(0,0,0,.5)`,
        textAlign:"center"
      }}>
      <p style={{ fontSize:36, marginBottom:8 }}>🏁</p>
      <p style={{
        fontFamily:"Bebas Neue,cursive", fontSize:26,
        color:"#fff", letterSpacing:2, marginBottom:6
      }}>
        MATCH TERMINÉ !
      </p>
      <p style={{
        fontFamily:"Space Grotesk,sans-serif", fontSize:13,
        color:"rgba(255,255,255,.45)", marginBottom:18, lineHeight:1.5
      }}>
        Soumettez votre résultat maintenant.<br/>
        <span style={{ color:RED, fontWeight:600 }}>
          Le screenshot est obligatoire
        </span>{" "}
        — résultat sans preuve sera refusé.
      </p>
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        <button onClick={() => setDismissed(true)}
          style={{
            padding:"10px 18px", borderRadius:10,
            background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
            color:"rgba(255,255,255,.4)", fontFamily:"JetBrains Mono,monospace",
            fontSize:9, letterSpacing:1, cursor:"pointer"
          }}>
          PLUS TARD
        </button>
        <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:.96 }}
          onClick={onSubmit}
          style={{
            padding:"10px 24px", borderRadius:10,
            background:`linear-gradient(135deg,${CYAN},${INDIGO})`,
            border:"none", color:"#000",
            fontFamily:"JetBrains Mono,monospace", fontSize:10,
            letterSpacing:2, fontWeight:700, cursor:"pointer",
            boxShadow:`0 6px 20px ${cx(.35)}`
          }}>
          📊 SOUMETTRE MAINTENANT
        </motion.button>
      </div>
    </motion.div>
  );
}