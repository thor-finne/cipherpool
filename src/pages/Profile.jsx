import { useState, useEffect, useRef } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import { usePermissions } from "../utils/permissions";
import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════════════════
   CIPHERPOOL — PROFILE PAGE
   Palette: Midnight Navy #020817 · Electric Cyan #00d4ff · Gaming Dark
   ═══════════════════════════════════════════════════════════════════ */

const CYAN   = "#00d4ff";
const CYAN2  = "#22e5ff";
const INDIGO = "#818cf8";
const VIOLET = "#a78bfa";
const GREEN  = "#10b981";
const AMBER  = "#fbbf24";
const RED    = "#f43f5e";
const ORANGE = "#fb923c";
// Security: sanitize input
const sanitize = (str, maxLen=500) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
    .trim().slice(0, maxLen);
};

const BG     = "#020817";
const SURF   = "#060f23";
const CARD   = "#0a1628";

const cx = a => `rgba(0,212,255,${a})`;
const ix = a => `rgba(129,140,248,${a})`;
const vx = a => `rgba(167,139,250,${a})`;
const gx = a => `rgba(16,185,129,${a})`;
const rx = a => `rgba(244,63,94,${a})`;

const RARITY = {
  legendary:{ color:CYAN,   glow:cx(.55), bg:cx(.08), border:cx(.25), label:"LÉGENDAIRE" },
  epic:     { color:VIOLET, glow:vx(.55), bg:vx(.1),  border:vx(.3),  label:"ÉPIQUE"     },
  rare:     { color:INDIGO, glow:ix(.55), bg:ix(.1),  border:ix(.25), label:"RARE"       },
  common:   { color:"#94a3b8", glow:"rgba(148,163,184,.3)", bg:"rgba(148,163,184,.07)", border:"rgba(148,163,184,.2)", label:"COMMUN" },
};

const ROLE_META = {
  super_admin:{ label:"SUPER ADMIN", color:CYAN,   glow:cx(.35) },
  admin:      { label:"ADMIN",       color:INDIGO, glow:ix(.35) },
  founder:    { label:"FONDATEUR",   color:VIOLET, glow:vx(.35) },
  designer:   { label:"DESIGNER",    color:GREEN,  glow:gx(.35) },
  user:       { label:"MEMBRE",      color:"#94a3b8", glow:"transparent" },
};

const TABS = [
  { key:"stats",        label:"STATISTIQUES", icon:"📊", color:CYAN   },
  { key:"history",      label:"HISTORIQUE",   icon:"🏆", color:VIOLET },
  { key:"achievements", label:"SUCCÈS",        icon:"🎖️", color:INDIGO },
  { key:"wallet",       label:"FINANCES",      icon:"💎", color:GREEN  },
  { key:"edit",         label:"MON PROFIL",    icon:"✏️", color:AMBER  },
];

/* ── Animated canvas background ─────────────────────────────────── */
function HeroBg() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let raf, t = 0;
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const orbs = [
      { cx:.12, cy:.6,  r:.55, vx:.0009,  vy:.0006,  color:[0,212,255],   a:.09 },
      { cx:.82, cy:.3,  r:.42, vx:-.0007, vy:.0007,  color:[129,140,248], a:.07 },
      { cx:.5,  cy:.85, r:.38, vx:.0006,  vy:-.0008, color:[167,139,250], a:.05 },
      { cx:.92, cy:.82, r:.28, vx:-.0007, vy:-.0005, color:[16,185,129],  a:.04 },
    ];
    const draw = () => {
      t++;
      ctx.clearRect(0,0,c.width,c.height);
      orbs.forEach(o => {
        o.cx += o.vx * Math.sin(t*.008);
        o.cy += o.vy * Math.cos(t*.006);
        if (o.cx<-.1||o.cx>1.1) o.vx*=-1;
        if (o.cy<-.1||o.cy>1.1) o.vy*=-1;
        const x=o.cx*c.width, y=o.cy*c.height;
        const r=o.r*Math.max(c.width,c.height)*(1+.07*Math.sin(t*.014));
        const a=o.a*(1+.15*Math.sin(t*.02));
        const [R,G,B]=o.color;
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,  `rgba(${R},${G},${B},${a})`);
        g.addColorStop(.45,`rgba(${R},${G},${B},${a*.4})`);
        g.addColorStop(1,  `rgba(${R},${G},${B},0)`);
        ctx.fillStyle=g; ctx.fillRect(0,0,c.width,c.height);
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(raf); ro.disconnect(); };
  },[]);
  return <canvas ref={ref} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }} />;
}

/* ── Animated number ─────────────────────────────────────────────── */
function N({ v, sfx="" }) {
  const [d, setD] = useState(0);
  const r = useRef(null);
  useEffect(()=>{
    const end=parseFloat(String(v).replace(/[^\d.]/g,""))||0;
    if(!end){setD(0);return;}
    const s=performance.now(),dur=1150;
    const step=ts=>{
      const p=Math.min((ts-s)/dur,1);
      setD(Math.floor((1-Math.pow(1-p,3))*end));
      if(p<1) r.current=requestAnimationFrame(step); else setD(end);
    };
    r.current=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(r.current);
  },[v]);
  const sv=String(v);
  return <>{sv.includes(".")?parseFloat(v).toFixed(2):d.toLocaleString("fr-FR")}{sv.includes("%")?"%":sfx}</>;
}

/* ── Glass card ──────────────────────────────────────────────────── */
function G({ children, style, ac }) {
  const [h,setH]=useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ position:"relative",overflow:"hidden",
        background: h&&ac ? `linear-gradient(135deg,${ac}09,${CARD})` : CARD,
        backdropFilter:"blur(16px)",
        border:`1px solid ${h&&ac?ac+"35":cx(.1)}`,
        borderRadius:14,
        boxShadow: h&&ac
          ? `0 0 0 1px ${ac}12,0 8px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05)`
          : `0 4px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.03)`,
        transition:"all .22s",...style }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${ac||cx(.3)},transparent)`,opacity:h?1:.3,transition:"opacity .22s",pointerEvents:"none" }} />
      <div style={{ position:"absolute",top:0,left:"8%",right:"8%",height:1,background:"rgba(255,255,255,.04)",pointerEvents:"none" }} />
      {children}
    </div>
  );
}

/* ── KPI card ────────────────────────────────────────────────────── */
function Kpi({ label, value, ac, icon, delay=0 }) {
  return (
    <motion.div initial={{opacity:0,y:18,scale:.94}} animate={{opacity:1,y:0,scale:1}} transition={{delay,duration:.44,ease:[.22,1,.36,1]}} whileHover={{y:-4,transition:{duration:.18}}}>
      <G ac={ac} style={{ padding:"20px 18px" }}>
        <div style={{ position:"absolute",top:-18,right:-18,width:75,height:75,borderRadius:"50%",background:`radial-gradient(circle,${ac}16,transparent 70%)`,pointerEvents:"none" }} />
        <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:8,position:"relative" }}><span style={{marginRight:5}}>{icon}</span>{label}</p>
        <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:38,letterSpacing:1,lineHeight:1,color:"#fff",textShadow:`0 0 30px ${ac}40`,position:"relative" }}>
          <N v={String(value)} />
        </p>
      </G>
    </motion.div>
  );
}

/* ── Edit Profile Form ──────────────────────────────────────────── */
function EditProfileForm({ profile, onSaved }) {
  const [ffid, setFfid]     = useState(profile?.free_fire_id || "");
  const [bio,  setBio]      = useState(profile?.bio          || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,  setError]  = useState("");

  const handleSaveDirect = async () => {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const { error: e } = await supabase
        .from("profiles")
        .update({ free_fire_id: sanitize(ffid,20)||null, bio: sanitize(bio,250)||null })
        .eq("id", profile?.id);
      if (e) throw e;
      setSuccess(true); onSaved?.();
      setTimeout(()=>setSuccess(false), 3000);
    } catch(e) { setError(e.message||"Erreur"); }
    finally { setSaving(false); }
  };

  const sendSupportRequest = (field, currentVal) => {
    const fieldNames = { full_name:"Nom complet", age:"Age", city:"Ville", country:"Pays" };
    const params = new URLSearchParams({
      type:"profile_edit", userId:profile?.id||"", name:profile?.full_name||"",
      email:profile?.email||"", ffid:profile?.free_fire_id||"",
      role:profile?.role||"user", level:String(profile?.level||1),
      joinDate:profile?.created_at?new Date(profile.created_at).toLocaleDateString("fr-FR"):"",
      field:fieldNames[field]||field, currentVal:currentVal||"",
    });
    window.location.href = "/support?"+params.toString();
  };

  const ReadonlyField = ({ label, icon, field, value }) => (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.25)",marginBottom:7}}>{icon} {label}</label>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{flex:1,padding:"12px 16px",borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",color:"rgba(255,255,255,.35)",fontFamily:"Space Grotesk,sans-serif",fontSize:13}}>
          {value||<span style={{color:"rgba(255,255,255,.15)"}}>—</span>}
        </div>
        <motion.button whileHover={{scale:1.04}} whileTap={{scale:.96}} onClick={()=>sendSupportRequest(field,value)}
          style={{padding:"11px 16px",borderRadius:10,background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.2)",color:AMBER,fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
          ✏️ MODIFIER
        </motion.button>
      </div>
      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.18)",marginTop:5,letterSpacing:1}}>⚠️ Traité par le support sous 24h</p>
    </div>
  );

  return (
    <div style={{maxWidth:660}}>
      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.2)",marginBottom:24}}>MON PROFIL</p>

      {/* DIRECT — FF ID + Bio */}
      <G ac={CYAN} style={{padding:"24px 28px",marginBottom:14}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2,color:CYAN,marginBottom:18}}>🎮 MODIFICATION DIRECTE</p>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.3)",marginBottom:8}}>🎮 FREE FIRE ID</label>
          <input value={ffid} onChange={e=>setFfid(e.target.value)} placeholder="ex: 1234567890" maxLength={20}
            style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(0,212,255,.05)",border:"1px solid rgba(0,212,255,.2)",color:"#fff",fontFamily:"JetBrains Mono,monospace",fontSize:14,outline:"none",boxSizing:"border-box",letterSpacing:2}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.3)",marginBottom:8}}>📝 BIO</label>
          <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Parle de toi, ton style de jeu..." maxLength={250} rows={3}
            style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(0,212,255,.05)",border:"1px solid rgba(0,212,255,.2)",color:"rgba(255,255,255,.85)",fontFamily:"Space Grotesk,sans-serif",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.2)",textAlign:"right",marginTop:4}}>{bio.length}/250</p>
        </div>
        {error&&<div style={{padding:"10px 14px",borderRadius:9,background:"rgba(244,63,94,.1)",border:"1px solid rgba(244,63,94,.2)",color:RED,fontSize:12,marginBottom:12,fontFamily:"Space Grotesk,sans-serif"}}>❌ {error}</div>}
        {success&&<motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} style={{padding:"10px 14px",borderRadius:9,background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.2)",color:GREEN,fontSize:12,marginBottom:12,fontFamily:"Space Grotesk,sans-serif"}}>✅ Sauvegardé!</motion.div>}
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}} onClick={handleSaveDirect} disabled={saving}
          style={{width:"100%",padding:"13px 0",borderRadius:11,background:"linear-gradient(135deg,#00d4ff,#818cf8)",border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:11,letterSpacing:2,fontWeight:700,cursor:saving?"wait":"pointer"}}>
          {saving?"SAUVEGARDE...":"💾 SAUVEGARDER"}
        </motion.button>
      </G>

      {/* VIA SUPPORT */}
      <G ac={AMBER} style={{padding:"24px 28px"}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2,color:AMBER,marginBottom:6}}>📋 INFOS PERSONNELLES</p>
        <p style={{fontFamily:"Space Grotesk,sans-serif",fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:20,lineHeight:1.6}}>
          Ces champs nécessitent une vérification. Cliquez sur ✏️ MODIFIER pour envoyer une demande au support — traitée sous 24h.
        </p>
        <ReadonlyField label="NOM COMPLET" icon="🏷️" field="full_name" value={profile?.full_name} />
        <ReadonlyField label="ÂGE"         icon="📅" field="age"       value={profile?.age?String(profile.age):""} />
        <ReadonlyField label="VILLE"        icon="🌍" field="city"      value={profile?.city} />
        <ReadonlyField label="PAYS"         icon="🌐" field="country"   value={profile?.country} />
      </G>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════ */
export default function Profile() {
  const { profile:ap, balance:cb, equippedItems:ce, refreshProfile } = useOutletContext();
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [avatarMenu,  setAvatarMenu]  = useState(false);
  const [tab,         setTab]         = useState("stats");
  const [imgErr,      setImgErr]      = useState(false);
  const menuRef = useRef(null);
  const { isAdmin } = usePermissions(ap);

  const { profile:dp, stats, achievements, recentMatches, transactions, loading, uploadAvatar } = useProfileData(ap?.id);

  const profile  = dp || ap;
  const balance  = cb ?? 0;
  const eq       = ce || {};

  const approved  = true; // Allow everyone to change avatar
  const isVerified = profile?.verification_status==="approved";
  const role      = ROLE_META[profile?.role]||ROLE_META.user;
  const initials  = profile?.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
  const xpPct     = (profile?.xp%100)||0;
  const wr        = stats?.total_matches>0 ? Math.round((stats.wins/stats.total_matches)*100) : 0;
  const kd        = stats?.deaths>0 ? (stats.kills/stats.deaths).toFixed(2) : (stats?.kills||0);
  const hasImg    = !!(eq?.avatar?.image_url||(profile?.avatar_url&&!imgErr));
  const tabColor  = TABS.find(t=>t.key===tab)?.color||CYAN;

  // Close menu on outside click
  useEffect(() => {
    if (!avatarMenu) return;
    const close = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setAvatarMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [avatarMenu]);

  const handleUpload = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    setAvatarMenu(false);
    setUploading(true);
    setImgErr(false);
    try {
      const userId = ap?.id;
      if (!userId) throw new Error("No user");

      // 1. Supprimer tous les anciens avatars
      const exts = ["jpg","jpeg","png","webp","gif","JPG","PNG","WEBP"];
      await supabase.storage.from("avatars").remove(exts.map(x => `${userId}/avatar.${x}`));
      // Supprimer aussi les anciens avec timestamp
      const { data: listed } = await supabase.storage.from("avatars").list(userId);
      if (listed?.length) {
        await supabase.storage.from("avatars").remove(listed.map(f => `${userId}/${f.name}`));
      }

      // 2. Upload avec timestamp unique
      const ext = f.name.split(".").pop().toLowerCase() || "jpg";
      const ts  = Date.now();
      const fileName = `${userId}/avatar_${ts}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, f, { upsert: true, cacheControl: "0" });
      if (upErr) throw upErr;

      // 3. URL publique + cache bust
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = data.publicUrl + "?t=" + ts;

      // 4. Update profile
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (updErr) throw updErr;

      refreshProfile?.();
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarMenu(false);
    setDeleting(true);
    try {
      // Remove from storage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to remove common extensions
        for (const ext of ["jpg","jpeg","png","webp","gif"]) {
          await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]);
        }
      }
      // Clear avatar_url from profile
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", ap?.id);
      refreshProfile?.();
      setImgErr(false);
    } catch(_) {}
    finally { setDeleting(false); }
  };

  if (loading) return (
    <div style={{ minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <motion.div animate={{rotate:360}} transition={{duration:1.1,repeat:Infinity,ease:"linear"}}
          style={{ width:38,height:38,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%",margin:"0 auto 14px" }} />
        <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:5,color:cx(.4) }}>CHARGEMENT</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .prf{font-family:Space Grotesk,sans-serif;color:rgba(255,255,255,.88);min-height:100vh;background:${BG}}
        .ptab{background:none;border:none;cursor:pointer;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:2px;font-weight:600;padding:14px 16px;margin-bottom:-1px;transition:all .2s;white-space:nowrap;position:relative}
        .ptab:hover{color:rgba(255,255,255,.8)!important}
        .avw:hover .avo{opacity:1!important}
        .rowh{transition:background .15s}.rowh:hover{background:${cx(.04)}!important}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes scan{0%{top:-100%}100%{top:200%}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${cx(.22)};border-radius:99px}
      `}</style>

      <div className="prf">

        {/* ══ HERO ════════════════════════════════════════════════ */}
        <div style={{ position:"relative",overflow:"hidden" }}>
          <div style={{ height:230,position:"relative",overflow:"hidden",background:SURF }}>
            {eq?.banner?.image_url && <img src={eq.banner.image_url} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.35 }} />}
            <HeroBg />
            {/* Grid */}
            <div style={{ position:"absolute",inset:0,backgroundImage:`linear-gradient(${cx(.07)} 1px,transparent 1px),linear-gradient(90deg,${cx(.07)} 1px,transparent 1px)`,backgroundSize:"50px 50px",pointerEvents:"none" }} />
            {/* Scan line */}
            <div style={{ position:"absolute",left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${cx(.3)},transparent)`,animation:"scan 4s linear infinite",pointerEvents:"none" }} />
            {/* Fade */}
            <div style={{ position:"absolute",bottom:0,left:0,right:0,height:130,background:`linear-gradient(to top,${BG},transparent)`,pointerEvents:"none" }} />
          </div>

          <div style={{ maxWidth:1060,margin:"0 auto",padding:"0 32px" }}>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.5}}
              style={{ display:"flex",alignItems:"flex-end",gap:26,marginTop:-72,paddingBottom:28,flexWrap:"wrap" }}>

              {/* ── Avatar with menu ── */}
              <motion.div ref={menuRef}
                initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:.08,type:"spring",stiffness:260,damping:22}}
                style={{ position:"relative",flexShrink:0 }}>

                {/* Avatar circle — click to open menu */}
                <div className="avw" onClick={()=>approved&&setAvatarMenu(m=>!m)}
                  style={{ width:100,height:100,borderRadius:18,cursor:approved?"pointer":"default",
                    background:`linear-gradient(135deg,${cx(.18)},${CARD})`,
                    border:eq?.frame?`3px solid ${RARITY[eq.frame.rarity]?.color||CYAN}`:`2px solid ${cx(.22)}`,
                    boxShadow:eq?.frame?`0 0 28px ${RARITY[eq.frame.rarity]?.glow||cx(.5)},0 12px 48px rgba(0,0,0,.7)`:`0 12px 48px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.08)`,
                    display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative" }}>
                  {hasImg
                    ? <img src={eq?.avatar?.image_url||profile?.avatar_url} onError={()=>setImgErr(true)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />
                    : <span style={{ fontFamily:"'Bebas Neue',cursive",fontSize:38,color:CYAN,letterSpacing:2,textShadow:`0 0 22px ${cx(.55)}` }}>{initials}</span>
                  }
                  {/* Hover overlay */}
                  {approved && (
                    <div className="avo" style={{ position:"absolute",inset:0,opacity:0,background:"rgba(2,8,23,.75)",backdropFilter:"blur(4px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,transition:"opacity .2s",pointerEvents:"none" }}>
                      {(uploading||deleting)
                        ? <motion.div animate={{rotate:360}} transition={{duration:.9,repeat:Infinity,ease:"linear"}} style={{width:22,height:22,border:`2px solid ${cx(.3)}`,borderTopColor:CYAN,borderRadius:"50%"}}/>
                        : <>
                          <span style={{fontSize:18}}>📷</span>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:1.5,color:CYAN}}>MODIFIER</span>
                        </>
                      }
                    </div>
                  )}
                </div>

                {/* Online dot */}
                <motion.div animate={{scale:[1,1.5,1],opacity:[1,.4,1]}} transition={{duration:2.2,repeat:Infinity}}
                  style={{ position:"absolute",bottom:7,right:7,width:12,height:12,borderRadius:"50%",background:GREEN,border:`3px solid ${BG}`,boxShadow:`0 0 12px ${gx(.7)}`,zIndex:2 }} />

                {/* Badge */}
                {eq?.badge?.image_url && (
                  <div style={{ position:"absolute",top:-5,right:-5,width:26,height:26,borderRadius:"50%",overflow:"hidden",border:`2px solid ${BG}`,boxShadow:`0 0 12px ${cx(.55)}`,zIndex:3 }}>
                    <img src={eq.badge.image_url} style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                  </div>
                )}

                {/* ── Dropdown menu ── */}
                <AnimatePresence>
                  {avatarMenu && approved && (
                    <motion.div
                      initial={{opacity:0,scale:.9,y:-8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.9,y:-8}}
                      transition={{duration:.18,ease:[.22,1,.36,1]}}
                      style={{ position:"absolute",top:"calc(100% + 10px)",left:0,zIndex:50,minWidth:200,
                        background:"rgba(2,8,23,0.96)",backdropFilter:"blur(20px)",
                        border:`1px solid ${cx(.2)}`,borderRadius:14,overflow:"hidden",
                        boxShadow:`0 16px 48px rgba(0,0,0,.7),0 0 0 1px ${cx(.08)}` }}>

                      {/* Arrow */}
                      <div style={{ position:"absolute",top:-6,left:20,width:12,height:12,background:"rgba(2,8,23,0.96)",border:`1px solid ${cx(.2)}`,transform:"rotate(45deg)",borderRight:"none",borderBottom:"none" }}/>

                      {/* Upload option */}
                      <label style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 16px",cursor:"pointer",transition:"background .15s",borderBottom:`1px solid ${cx(.08)}`}}
                        onMouseEnter={e=>e.currentTarget.style.background=cx(.06)}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ width:34,height:34,borderRadius:10,background:cx(.1),border:`1px solid ${cx(.2)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>📷</div>
                        <div>
                          <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:600,color:"#fff",marginBottom:2 }}>Changer la photo</p>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1 }}>JPG · PNG · WEBP</p>
                        </div>
                        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{display:"none"}} />
                      </label>

                      {/* Delete option — only if has image */}
                      {hasImg && (
                        <button onClick={handleDeleteAvatar} disabled={deleting}
                          style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 16px",cursor:"pointer",background:"transparent",border:"none",width:"100%",textAlign:"left",transition:"background .15s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(244,63,94,0.07)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <div style={{ width:34,height:34,borderRadius:10,background:"rgba(244,63,94,0.1)",border:"1px solid rgba(244,63,94,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>🗑️</div>
                          <div>
                            <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:600,color:RED,marginBottom:2 }}>Supprimer la photo</p>
                            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1 }}>REMET LES INITIALES</p>
                          </div>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Name block */}
              <motion.div initial={{opacity:0,x:-18}} animate={{opacity:1,x:0}} transition={{delay:.12,duration:.5,ease:[.22,1,.36,1]}}
                style={{ flex:1,minWidth:220,paddingBottom:4 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap" }}>
                  <h1 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:36,letterSpacing:2,margin:0,lineHeight:1,
                    color:eq?.name_color?RARITY[eq.name_color.rarity]?.color||"#fff":"#fff",
                    textShadow:eq?.name_color?`0 0 30px ${RARITY[eq.name_color.rarity]?.glow}`:`0 2px 18px rgba(0,0,0,.6)` }}>
                    {profile?.full_name||"—"}
                  </h1>
                  <motion.span whileHover={{scale:1.05}} style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,color:role.color,background:`${role.color}14`,border:`1px solid ${role.color}30`,padding:"4px 12px",borderRadius:20,boxShadow:`0 0 16px ${role.glow}`,cursor:"default" }}>{role.label}</motion.span>
                  {isVerified
                    ? <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:GREEN,background:gx(.1),border:`1px solid ${gx(.25)}`,padding:"4px 12px",borderRadius:20 }}>✓ VÉRIFIÉ</span>
                    : <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:AMBER,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.25)",padding:"4px 12px",borderRadius:20 }}>⏳ EN ATTENTE</span>
                  }
                </div>
                <div style={{ display:"flex",gap:20,flexWrap:"wrap",marginBottom:12 }}>
                  {[["🎮","FREE FIRE",profile?.free_fire_id||"—"],["⚡","NIVEAU",profile?.level||1],["📅","DEPUIS",profile?.created_at?new Date(profile.created_at).toLocaleDateString("fr-FR",{month:"short",year:"numeric"}):"—"]].map(([em,k,v])=>(
                    <span key={k} style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"rgba(255,255,255,.22)" }}>{em} {k} <span style={{color:"rgba(255,255,255,.5)"}}>{v}</span></span>
                  ))}
                </div>
                <div style={{ maxWidth:300 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:1.5 }}>XP PROGRESSION</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:CYAN }}>{xpPct}/100</span>
                  </div>
                  <div style={{ height:4,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden" }}>
                    <motion.div initial={{width:0}} animate={{width:`${xpPct}%`}} transition={{duration:1.4,ease:[.22,1,.36,1],delay:.3}}
                      style={{ height:"100%",borderRadius:99,background:`linear-gradient(90deg,${CYAN},${CYAN2},${CYAN})`,backgroundSize:"200% 100%",animation:"shimmer 2.5s linear infinite",boxShadow:`0 0 12px ${cx(.55)}` }} />
                  </div>
                </div>
                {Object.keys(eq).length>0 && (
                  <div style={{ display:"flex",gap:6,marginTop:11,flexWrap:"wrap" }}>
                    {Object.entries(eq).map(([type,item])=>{
                      const rs=RARITY[item.rarity]||RARITY.common;
                      return <motion.span key={type} whileHover={{scale:1.07,y:-2}} style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:rs.color,background:rs.bg,border:`1px solid ${rs.border}`,padding:"3px 10px",borderRadius:20,boxShadow:`0 0 10px ${rs.glow}22`,cursor:"default" }}>{item.name}</motion.span>;
                    })}
                  </div>
                )}
              </motion.div>

              {/* Balance */}
              <motion.div initial={{opacity:0,scale:.88}} animate={{opacity:1,scale:1}} transition={{delay:.18,type:"spring",stiffness:220,damping:22}} whileHover={{y:-5}} style={{flexShrink:0,minWidth:168}}>
                <G ac={CYAN} style={{ padding:"20px 24px",textAlign:"center" }}>
                  <div style={{ position:"absolute",top:-28,right:-28,width:90,height:90,borderRadius:"50%",background:`radial-gradient(circle,${cx(.18)},transparent)`,pointerEvents:"none" }} />
                  <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:7,position:"relative" }}>SOLDE</p>
                  <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:2,color:CYAN,lineHeight:1,textShadow:`0 0 32px ${cx(.55)}`,position:"relative" }}><N v={balance} /></p>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,.2)",marginTop:4,position:"relative" }}>💎 PIÈCES</p>
                  <Link to="/store" style={{ display:"block",marginTop:12,padding:"7px 0",borderRadius:9,background:cx(.08),border:`1px solid ${cx(.22)}`,color:CYAN,fontSize:10,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textDecoration:"none",transition:"all .2s",position:"relative" }}
                    onMouseEnter={e=>{e.currentTarget.style.background=cx(.18);e.currentTarget.style.boxShadow=`0 0 20px ${cx(.25)}`;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=cx(.08);e.currentTarget.style.boxShadow="none";}}>
                    🛍️ BOUTIQUE
                  </Link>
                </G>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ══ TABS ════════════════════════════════════════════════ */}
        <div style={{ borderBottom:`1px solid ${cx(.1)}`,position:"sticky",top:0,background:"rgba(2,8,23,0.9)",backdropFilter:"blur(24px)",zIndex:10,boxShadow:`0 4px 28px rgba(0,0,0,.35)` }}>
          <div style={{ maxWidth:1060,margin:"0 auto",padding:"0 32px",display:"flex",gap:2,overflowX:"auto" }}>
            {TABS.map((t,i)=>(
              <motion.button key={t.key} className="ptab" onClick={()=>setTab(t.key)}
                initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}
                style={{ color:tab===t.key?"#fff":"rgba(255,255,255,.28)",borderBottom:`2px solid ${tab===t.key?t.color:"transparent"}` }}>
                {tab===t.key && <motion.div layoutId="tab-bg" style={{ position:"absolute",inset:"2px 0 0",borderRadius:"8px 8px 0 0",background:`linear-gradient(to bottom,${t.color}10,transparent)`,pointerEvents:"none" }} />}
                <span style={{position:"relative",marginRight:6}}>{t.icon}</span>
                <span style={{position:"relative"}}>{t.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ══ CONTENT ═════════════════════════════════════════════ */}
        <div style={{ maxWidth:1060,margin:"0 auto",padding:"32px 32px 64px" }}>
          <AnimatePresence mode="wait">

            {/* STATS */}
            {tab==="stats" && (
              <motion.div key="stats" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.28}}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16 }}>
                  <Kpi label="PARTIES JOUÉES"  value={stats?.total_matches||0} ac={INDIGO} icon="🎮" delay={.04} />
                  <Kpi label="VICTOIRES"        value={stats?.wins||0}          ac={GREEN}  icon="🏆" delay={.08} />
                  <Kpi label="DÉFAITES"         value={stats?.losses||0}        ac={RED}    icon="💀" delay={.12} />
                  <Kpi label="WIN RATE"         value={`${wr}%`}                ac={CYAN}   icon="📈" delay={.16} />
                  <Kpi label="RATIO K/D"        value={kd}                      ac={VIOLET} icon="⚔️" delay={.20} />
                  <Kpi label="ÉLIMINATIONS"     value={stats?.kills||0}         ac={ORANGE} icon="🎯" delay={.24} />
                </div>

                <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:.28}} style={{marginBottom:16}}>
                  <G ac={CYAN} style={{ padding:"24px 28px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12 }}>
                      <div>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:5 }}>PERFORMANCE GLOBALE</p>
                        <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:2,color:CYAN,textShadow:`0 0 24px ${cx(.5)}` }}>{wr}% WIN RATE</p>
                      </div>
                      <div style={{ display:"flex",gap:28 }}>
                        <div style={{textAlign:"center"}}>
                          <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,color:GREEN,textShadow:`0 0 18px ${gx(.5)}`,lineHeight:1 }}>{stats?.wins||0}</p>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:GREEN,letterSpacing:2,marginTop:3 }}>VICTOIRES</p>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,color:RED,textShadow:`0 0 18px ${rx(.5)}`,lineHeight:1 }}>{stats?.losses||0}</p>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:RED,letterSpacing:2,marginTop:3 }}>DÉFAITES</p>
                        </div>
                      </div>
                    </div>
                    <div style={{ height:6,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden",position:"relative" }}>
                      <motion.div initial={{width:0}} animate={{width:`${wr}%`}} transition={{duration:1.5,ease:[.22,1,.36,1],delay:.3}}
                        style={{ position:"absolute",left:0,top:0,height:"100%",background:`linear-gradient(90deg,${GREEN},${CYAN})`,borderRadius:99,boxShadow:`0 0 16px ${gx(.5)}` }} />
                    </div>
                    <div style={{ display:"flex",justifyContent:"space-between",marginTop:7 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:GREEN }}>▮ {wr}% VICTOIRES</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:RED }}>{100-wr}% DÉFAITES ▮</span>
                    </div>
                  </G>
                </motion.div>

                <div style={{ display:"grid",gridTemplateColumns:"1fr 210px",gap:12 }}>
                  <motion.div initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:.32}}>
                    <G style={{ padding:"22px 26px",height:"100%" }}>
                      <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.2)",marginBottom:16 }}>INFORMATIONS</p>
                      {[["FREE FIRE ID",profile?.free_fire_id||"—"],["EMAIL",profile?.email||"—"],["INSCRIT LE",profile?.created_at?new Date(profile.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):"—"],["STATUT",approved?"✓ VÉRIFIÉ":"⏳ EN ATTENTE"]].map(([k,v],i)=>(
                        <motion.div key={k} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*.05+.34}}
                          style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:i<3?`1px solid ${cx(.08)}`:"none" }}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,.2)" }}>{k}</span>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"rgba(255,255,255,.55)" }}>{v}</span>
                        </motion.div>
                      ))}
                    </G>
                  </motion.div>
                  <motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:.34,type:"spring",stiffness:200}} whileHover={{y:-4}}>
                    <G ac={stats?.rank<=10?CYAN:undefined} style={{ height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center" }}>
                      {stats?.rank<=10 && <motion.div animate={{rotate:360}} transition={{duration:22,repeat:Infinity,ease:"linear"}} style={{ position:"absolute",inset:0,background:`conic-gradient(from 0deg,transparent 78%,${cx(.18)} 100%)`,borderRadius:14,pointerEvents:"none" }} />}
                      <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.2)",marginBottom:10,position:"relative" }}>CLASSEMENT</p>
                      <motion.p animate={stats?.rank<=3?{textShadow:[`0 0 35px ${cx(.35)}`,`0 0 60px ${cx(.55)}`,`0 0 35px ${cx(.35)}`]}:{}} transition={{duration:2,repeat:Infinity}}
                        style={{ fontFamily:"'Bebas Neue',cursive",fontSize:54,letterSpacing:-2,lineHeight:1,color:stats?.rank<=10?CYAN:"rgba(255,255,255,.3)",position:"relative" }}>
                        {stats?.rank?`#${stats.rank}`:"—"}
                      </motion.p>
                      {stats?.rank&&stats.rank<=10 && <motion.p animate={{opacity:[.5,1,.5]}} transition={{duration:2,repeat:Infinity}} style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,color:CYAN,marginTop:9,textShadow:`0 0 12px ${cx(.55)}` }}>🏆 TOP 10</motion.p>}
                    </G>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* HISTORY */}
            {tab==="history" && (
              <motion.div key="hist" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.28}}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.2)",marginBottom:18 }}>DERNIÈRES PARTIES — <span style={{color:VIOLET}}>{recentMatches.length}</span></p>
                {recentMatches.length===0
                  ? <div style={{textAlign:"center",padding:"80px 0"}}><motion.div animate={{y:[0,-10,0]}} transition={{duration:3,repeat:Infinity}} style={{fontSize:56,marginBottom:14}}>🏆</motion.div><p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.15)" }}>AUCUNE PARTIE JOUÉE</p></div>
                  : <div style={{display:"flex",flexDirection:"column",gap:9}}>
                      {recentMatches.map((m,i)=>{
                        const pc=m.position===1?CYAN:m.position<=3?VIOLET:"rgba(255,255,255,.3)";
                        return (
                          <motion.div key={m.id} initial={{opacity:0,x:-18}} animate={{opacity:1,x:0}} transition={{delay:i*.06}} whileHover={{x:5,transition:{duration:.18}}}>
                            <G ac={m.position===1?CYAN:m.position<=3?VIOLET:undefined} style={{ padding:"16px 22px",display:"flex",alignItems:"center",gap:20 }}>
                              <div style={{minWidth:52,flexShrink:0,textAlign:"center"}}>
                                <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,color:pc,lineHeight:1,textShadow:m.position===1?`0 0 22px ${cx(.55)}`:"none" }}>#{m.position||"?"}</p>
                              </div>
                              <div style={{flex:1}}>
                                <p style={{ fontSize:14,fontWeight:600,color:"rgba(255,255,255,.88)",marginBottom:3 }}>{m.matches?.tournaments?.name||"Tournoi"}</p>
                                <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"rgba(255,255,255,.22)" }}>{m.created_at?new Date(m.created_at).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}):""}</p>
                              </div>
                              <div style={{textAlign:"center"}}>
                                <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:ORANGE,lineHeight:1 }}>{m.kills||0}</p>
                                <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(255,255,255,.2)",letterSpacing:1 }}>KILLS</p>
                              </div>
                              {m.reward>0 && <div style={{textAlign:"right",minWidth:70}}>
                                <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:CYAN,lineHeight:1,textShadow:`0 0 16px ${cx(.55)}` }}>+{m.reward}</p>
                                <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(255,255,255,.2)",letterSpacing:1 }}>PIÈCES</p>
                              </div>}
                            </G>
                          </motion.div>
                        );
                      })}
                    </div>
                }
              </motion.div>
            )}

            {/* ACHIEVEMENTS */}
            {tab==="achievements" && (
              <motion.div key="ach" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.28}}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.2)",marginBottom:18 }}>SUCCÈS DÉBLOQUÉS — <span style={{color:INDIGO}}>{achievements.length}</span></p>
                {achievements.length===0
                  ? <div style={{textAlign:"center",padding:"80px 0"}}><motion.div animate={{rotate:[0,10,-10,0]}} transition={{duration:2,repeat:Infinity}} style={{fontSize:56,marginBottom:14}}>🎖️</motion.div><p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.15)" }}>AUCUN SUCCÈS</p></div>
                  : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:11}}>
                      {achievements.map((a,i)=>(
                        <motion.div key={a.id} initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:i*.06}} whileHover={{scale:1.03,y:-4}}>
                          <G ac={INDIGO} style={{ padding:"20px",display:"flex",gap:14,alignItems:"flex-start" }}>
                            <div style={{fontSize:30,flexShrink:0}}>{a.achievements?.icon||"🏆"}</div>
                            <div>
                              <p style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,.88)",marginBottom:4 }}>{a.achievements?.name}</p>
                              <p style={{ fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.6 }}>{a.achievements?.description}</p>
                              <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:INDIGO,marginTop:7,letterSpacing:1 }}>📅 {a.earned_at?new Date(a.earned_at).toLocaleDateString("fr-FR"):""}</p>
                            </div>
                          </G>
                        </motion.div>
                      ))}
                    </div>
                }
              </motion.div>
            )}

            {/* WALLET */}
            {tab==="wallet" && (
              <motion.div key="wallet" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.28}}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20 }}>
                  {[
                    {label:"SOLDE ACTUEL",  val:balance,ac:CYAN,  icon:"💎"},
                    {label:"TOTAL DÉPENSÉ", val:transactions.filter(t=>["purchase","debit","penalty"].includes(t.type)).reduce((s,t)=>s+(t.amount||0),0),ac:RED,   icon:"🛍️"},
                    {label:"TOTAL REÇU",    val:transactions.filter(t=>!["purchase","debit","penalty"].includes(t.type)).reduce((s,t)=>s+(t.amount||0),0),ac:GREEN, icon:"💰"},
                  ].map((c,i)=>(
                    <motion.div key={i} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.08}} whileHover={{y:-4}}>
                      <G ac={c.ac} style={{ padding:"20px 22px" }}>
                        <div style={{ position:"absolute",top:-16,right:-16,width:70,height:70,borderRadius:"50%",background:`radial-gradient(circle,${c.ac}15,transparent)`,pointerEvents:"none" }} />
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:9,position:"relative" }}>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)" }}>{c.label}</p>
                          <span style={{fontSize:16,opacity:.7}}>{c.icon}</span>
                        </div>
                        <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:32,letterSpacing:1,color:c.ac,lineHeight:1,textShadow:`0 0 22px ${c.ac}45`,position:"relative" }}><N v={c.val} /></p>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,.18)",marginTop:3,position:"relative" }}>PIÈCES</p>
                      </G>
                    </motion.div>
                  ))}
                </div>
                <G style={{ overflow:"hidden" }}>
                  <div style={{ padding:"18px 24px 13px",borderBottom:`1px solid ${cx(.1)}` }}>
                    <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.2)" }}>HISTORIQUE DES TRANSACTIONS</p>
                  </div>
                  {transactions.length===0
                    ? <p style={{ color:"rgba(255,255,255,.15)",fontSize:13,textAlign:"center",padding:"40px 0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:2 }}>AUCUNE TRANSACTION</p>
                    : transactions.map((tx,i)=>{
                        const deb=["purchase","debit","penalty"].includes(tx.type?.toLowerCase());
                        return (
                          <motion.div key={tx.id||i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*.04+.15}} className="rowh"
                            style={{ display:"flex",alignItems:"center",padding:"13px 24px",borderBottom:i<transactions.length-1?`1px solid ${cx(.07)}`:"none",gap:13 }}>
                            <div style={{ width:32,height:32,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:deb?rx(.1):gx(.1),border:`1px solid ${deb?rx(.22):gx(.25)}` }}>{deb?"⬆":"⬇"}</div>
                            <p style={{ flex:1,fontSize:13,fontWeight:500,color:"rgba(255,255,255,.55)" }}>{tx.description||tx.type||"—"}</p>
                            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"rgba(255,255,255,.2)" }}>{tx.created_at?new Date(tx.created_at).toLocaleDateString("fr-FR"):""}</p>
                            <p style={{ fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:1,minWidth:80,textAlign:"right",color:deb?RED:GREEN,textShadow:`0 0 12px ${deb?rx(.4):gx(.4)}` }}>{deb?"−":"+"}{(tx.amount||0).toLocaleString("fr-FR")}</p>
                          </motion.div>
                        );
                      })
                  }
                </G>
              </motion.div>
            )}


            {/* EDIT PROFILE */}
            {tab==="edit" && (
              <motion.div key="edit" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.28}}>
                <EditProfileForm profile={profile} onSaved={refreshProfile} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}