import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   LOGIN  —  CipherPool v5
   ✅ Rate limiting : 5 tentatives → blocage 30s
   ✅ Loading state sur le bouton
   ✅ Messages d'erreur précis
   ✅ Entrée animée
   ═══════════════════════════════════════════════════════ */

const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 30_000; // 30 secondes

const C = {
  bg:      "#0a0a0f",
  card:    "#0f0f17",
  border:  "#1f1f2f",
  primary: "#8b3dff",
  primaryGlow:"rgba(139,61,255,0.45)",
  cyan:    "#00e5ff",
  danger:  "#ff4757",
  text:    "#fff",
  textMid: "rgba(255,255,255,0.55)",
  textLow: "rgba(255,255,255,0.25)",
};

function Input({ label, type, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:2, color:C.textLow, display:"block", marginBottom:7 }}>
        {label}
      </label>
      <div style={{ position:"relative" }}>
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width:"100%", boxSizing:"border-box",
            padding: isPassword ? "12px 44px 12px 16px" : "12px 16px",
            borderRadius:12, border:`1px solid ${error ? C.danger+"66" : C.border}`,
            background:"rgba(255,255,255,0.04)", color:C.text,
            fontFamily:"'Space Grotesk',sans-serif", fontSize:14, outline:"none",
            transition:"all .22s",
          }}
          onFocus={e => { e.target.style.borderColor = error ? C.danger : C.primary+"88"; e.target.style.boxShadow = `0 0 0 3px ${C.primary}18`; }}
          onBlur={e  => { e.target.style.borderColor = error ? C.danger+"66" : C.border; e.target.style.boxShadow = "none"; }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, opacity:.45, color:"#fff" }}>
            {show ? "🙈" : "👁"}
          </button>
        )}
      </div>
      {error && <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.danger, marginTop:5, letterSpacing:.5 }}>{error}</p>}
    </div>
  );
}

export default function Login() {
  const navigate  = useNavigate();
  const [email,    setEmail]   = useState("");
  const [password, setPass]    = useState("");
  const [loading,  setLoading] = useState(false);
  const [errors,   setErrors]  = useState({});
  const [globalErr,setGlobal]  = useState("");

  // ── Rate limiting ──────────────────────────────────────
  const attempts  = useRef(0);
  const lockedUntil = useRef(0);
  const [lockSecs, setLockSecs] = useState(0);

  const startCountdown = () => {
    const tick = () => {
      const rem = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      if (rem > 0) { setLockSecs(rem); setTimeout(tick, 1000); }
      else { setLockSecs(0); setGlobal(""); }
    };
    tick();
  };

  // ── Validation ─────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email requis";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email invalide";
    if (!password) e.password = "Mot de passe requis";
    else if (password.length < 6) e.password = "Minimum 6 caractères";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobal("");

    // ── Vérifier le blocage ──
    if (Date.now() < lockedUntil.current) {
      const rem = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      setGlobal(`Trop de tentatives. Réessaie dans ${rem}s.`);
      return;
    }

    if (!validate()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) {
        attempts.current += 1;
        const remaining = MAX_ATTEMPTS - attempts.current;

        if (attempts.current >= MAX_ATTEMPTS) {
          lockedUntil.current = Date.now() + LOCKOUT_MS;
          attempts.current = 0;
          setGlobal(`Trop de tentatives. Compte bloqué 30 secondes.`);
          startCountdown();
        } else {
          // Messages d'erreur précis
          const msg =
            error.message.includes("Invalid login") ? `Email ou mot de passe incorrect. ${remaining} essai${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}.` :
            error.message.includes("Email not confirmed") ? "Confirme ton email avant de te connecter." :
            error.message.includes("rate limit") ? "Trop de requêtes. Attends quelques secondes." :
            error.message;
          setGlobal(msg);
        }
      } else {
        attempts.current = 0;
        navigate("/dashboard");
      }
    } catch (_) {
      setGlobal("Erreur réseau. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockSecs > 0;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>

      {/* BG orbs */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"-15%", left:"-10%", width:500, height:500, background:`radial-gradient(${C.primary}18,transparent 65%)` }}/>
        <div style={{ position:"absolute", bottom:"-10%", right:"-10%", width:400, height:400, background:`radial-gradient(${C.cyan}10,transparent 65%)` }}/>
      </div>

      <motion.div
        initial={{ opacity:0, y:28, scale:.96 }}
        animate={{ opacity:1, y:0,  scale:1 }}
        transition={{ duration:.55, ease:[.22,1,.36,1] }}
        style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1 }}
      >
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <motion.div whileHover={{ rotate:5, scale:1.08 }}
            style={{ width:52, height:52, borderRadius:15, background:`linear-gradient(135deg,${C.primary},#4f46e5)`, display:"inline-flex", alignItems:"center", justifyContent:"center", boxShadow:`0 8px 32px ${C.primaryGlow}`, marginBottom:14 }}>
            <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#fff", letterSpacing:1 }}>CP</span>
          </motion.div>
          <h1 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, letterSpacing:4, color:"#fff", margin:0 }}>
            CIPHER<span style={{ color:C.primary, textShadow:`0 0 24px ${C.primaryGlow}` }}>POOL</span>
          </h1>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:3, color:C.textLow, marginTop:6 }}>CONNEXION À TON COMPTE</p>
        </div>

        {/* Card */}
        <div style={{
          background:"rgba(15,15,23,0.92)", backdropFilter:"blur(24px)",
          border:`1px solid ${C.border}`, borderRadius:22, padding:"32px 30px",
          boxShadow:`0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
        }}>

          {/* Rate limit indicator */}
          {isLocked && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
              style={{ background:"rgba(255,71,87,0.1)", border:"1px solid rgba(255,71,87,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:22, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>🔒</span>
              <div>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13, color:C.danger, margin:0 }}>Compte temporairement bloqué</p>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"rgba(255,71,87,0.7)", margin:"3px 0 0" }}>
                  Réessaie dans <strong>{lockSecs}s</strong>
                </p>
              </div>
              {/* Countdown ring */}
              <div style={{ marginLeft:"auto", position:"relative", width:32, height:32, flexShrink:0 }}>
                <svg width="32" height="32" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,71,87,0.2)" strokeWidth="2.5"/>
                  <circle cx="16" cy="16" r="13" fill="none" stroke={C.danger} strokeWidth="2.5"
                    strokeDasharray={`${2*Math.PI*13}`}
                    strokeDashoffset={`${2*Math.PI*13*(1 - lockSecs/30)}`}
                    style={{ transition:"stroke-dashoffset 1s linear" }}/>
                </svg>
                <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.danger, fontWeight:700 }}>{lockSecs}</span>
              </div>
            </motion.div>
          )}

          {/* Attempts warning */}
          {attempts.current > 0 && attempts.current < MAX_ATTEMPTS && !isLocked && (
            <div style={{ background:"rgba(255,179,71,0.08)", border:"1px solid rgba(255,179,71,0.2)", borderRadius:10, padding:"9px 14px", marginBottom:18, fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#ffb347", letterSpacing:.5 }}>
              ⚠️ {MAX_ATTEMPTS - attempts.current} tentative{MAX_ATTEMPTS - attempts.current > 1 ? "s" : ""} restante{MAX_ATTEMPTS - attempts.current > 1 ? "s" : ""} avant blocage
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input label="EMAIL" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(er => ({...er, email:""})); }} placeholder="ton@email.com" error={errors.email}/>
            <Input label="MOT DE PASSE" type="password" value={password} onChange={e => { setPass(e.target.value); setErrors(er => ({...er, password:""})); }} placeholder="••••••••" error={errors.password}/>

            {/* Global error */}
            <AnimatePresence>
              {globalErr && !isLocked && (
                <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  style={{ background:"rgba(255,71,87,0.08)", border:"1px solid rgba(255,71,87,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:18, fontFamily:"'Space Grotesk',sans-serif", fontSize:12, color:C.danger }}>
                  {globalErr}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || isLocked}
              whileHover={!loading && !isLocked ? { scale:1.02, y:-1 } : {}}
              whileTap={!loading && !isLocked ? { scale:.97 } : {}}
              style={{
                width:"100%", padding:"14px", borderRadius:13,
                background: isLocked ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg,${C.primary},#4f46e5)`,
                border:"none", color: isLocked ? "rgba(255,255,255,0.25)" : "#fff",
                fontFamily:"'JetBrains Mono',monospace", fontSize:12, letterSpacing:2, fontWeight:700,
                cursor: loading || isLocked ? "not-allowed" : "pointer",
                boxShadow: isLocked ? "none" : `0 8px 28px ${C.primaryGlow}`,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                transition:"all .25s",
              }}
            >
              {loading ? (
                <>
                  <motion.div animate={{ rotate:360 }} transition={{ duration:.8, repeat:Infinity, ease:"linear" }}
                    style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.2)", borderTopColor:"#fff", borderRadius:"50%" }}/>
                  CONNEXION EN COURS...
                </>
              ) : isLocked ? (
                `🔒 BLOQUÉ (${lockSecs}s)`
              ) : "⚡ SE CONNECTER"}
            </motion.button>
          </form>

          <p style={{ textAlign:"center", fontFamily:"'Space Grotesk',sans-serif", fontSize:13, color:C.textMid, marginTop:22 }}>
            Pas encore de compte ?{" "}
            <Link to="/register" style={{ color:C.primary, textDecoration:"none", fontWeight:700 }}>Créer un compte</Link>
          </p>
        </div>

        {/* Security badge */}
        <p style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textLow, letterSpacing:2, marginTop:18 }}>
          🔒 CONNEXION SÉCURISÉE · MAX {MAX_ATTEMPTS} TENTATIVES
        </p>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        input::placeholder { color:rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}