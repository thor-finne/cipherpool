import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   BACK BUTTON  —  CipherPool v4
   Usage:  <BackButton />                    ← retour automatique
           <BackButton to="/dashboard" />    ← destination fixe
           <BackButton label="Tournois" />   ← label custom
   ═══════════════════════════════════════════════════════════════ */

// Pages sans back button (racines de navigation)
const NO_BACK = ["/dashboard", "/", "/login", "/register"];

export default function BackButton({ to, label, style: extraStyle }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Ne pas afficher sur les pages racines
  if (!to && NO_BACK.includes(location.pathname)) return null;

  const handleBack = () => {
    if (to) navigate(to);
    else if (window.history.length > 2) navigate(-1);
    else navigate("/dashboard");
  };

  return (
    <motion.button
      onClick={handleBack}
      initial={{ opacity:0, x:-12 }}
      animate={{ opacity:1, x:0 }}
      transition={{ duration:.3, ease:[.22,1,.36,1] }}
      whileHover={{ x:-3, scale:1.02 }}
      whileTap={{ scale:.96 }}
      style={{
        display:"inline-flex",
        alignItems:"center",
        gap:8,
        padding:"9px 18px",
        borderRadius:12,
        background:"rgba(139,61,255,0.08)",
        border:"1px solid rgba(139,61,255,0.2)",
        color:"rgba(255,255,255,0.55)",
        fontFamily:"'JetBrains Mono',monospace",
        fontSize:11,
        letterSpacing:1.5,
        cursor:"pointer",
        backdropFilter:"blur(10px)",
        transition:"all .2s",
        boxShadow:"0 2px 12px rgba(0,0,0,0.3)",
        ...extraStyle,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(139,61,255,0.15)";
        e.currentTarget.style.borderColor = "rgba(139,61,255,0.45)";
        e.currentTarget.style.color = "#fff";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,61,255,0.2)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(139,61,255,0.08)";
        e.currentTarget.style.borderColor = "rgba(139,61,255,0.2)";
        e.currentTarget.style.color = "rgba(255,255,255,0.55)";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
      }}
    >
      {/* Arrow */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label || "RETOUR"}
    </motion.button>
  );
}