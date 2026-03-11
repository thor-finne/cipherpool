import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { supabase } from "../lib/supabase";

const C = {
  bg:      "#0a0a0f",
  card:    "#0f0f17",
  card2:   "#14141f",
  border:  "#1f1f2f",
  primary: "#8b3dff",
  primaryDim:"rgba(139,61,255,0.15)",
  primaryGlow:"rgba(139,61,255,0.7)",
  secondary:"#2ecc71",
  cyan:    "#00e5ff",
  danger:  "#ff4757",
  amber:   "#ffb347",
  text:    "#ffffff",
  textMid: "rgba(255,255,255,0.7)",
  textLow: "rgba(255,255,255,0.3)",
};

function TiltCard({ children, className, intensity = 15, perspective = 1000, glareColor = C.primary }) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  const rotateX = useTransform(useMotionValue(mousePosition.y), [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(useMotionValue(mousePosition.x), [-0.5, 0.5], [-intensity, intensity]);
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMousePosition({ x: 0, y: 0 }); }}
      style={{
        transformStyle: "preserve-3d",
        rotateX: springRotateX,
        rotateY: springRotateY,
        perspective: perspective,
        transition: "all 0.1s",
      }}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at ${mousePosition.x * 100 + 50}% ${mousePosition.y * 100 + 50}%, ${glareColor}30, transparent 70%)`,
              pointerEvents: "none",
              borderRadius: "inherit",
              zIndex: 10,
            }}
          />
        )}
      </AnimatePresence>
      {children}
    </motion.div>
  );
}

function Counter({ to, duration = 1500 }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.floor(ease * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to]);
  return <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }}>{val.toLocaleString("fr-FR")}</motion.span>;
}

function StatCard({ icon, label, value, suffix = "", color, delay = 0, to }) {
  const inner = (
    <TiltCard intensity={8} glareColor={color}>
      <motion.div
        initial={{ opacity:0, y:30, scale:0.9, rotateX: -10 }}
        animate={{ opacity:1, y:0, scale:1, rotateX: 0 }}
        transition={{ delay, duration:0.6, type:"spring", stiffness:100 }}
        whileHover={{ y: -10, scale: 1.02, transition: { type:"spring", stiffness:400, damping:10 } }}
        style={{
          background:`linear-gradient(135deg,${C.card},${C.card2})`,
          border:`1px solid ${C.border}`,
          borderRadius:20,
          padding:"24px 22px",
          position:"relative",
          overflow:"hidden",
          cursor:to?"pointer":"default",
          boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
        }}
      >
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 30% 30%, ${color}40, transparent 70%)`, pointerEvents:"none" }}
        />
        <motion.div
          animate={{ y: ["-100%", "300%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ position:"absolute", left:0, right:0, height:"200%", background:`linear-gradient(180deg, transparent, ${color}20, transparent)`, pointerEvents:"none" }}
        />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], boxShadow: [`0 0 10px ${color}`, `0 0 20px ${color}`, `0 0 10px ${color}`] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position:"absolute", inset:-1, border:`2px solid ${color}`, borderRadius:20, opacity:0.5, pointerEvents:"none" }}
        />
        <div style={{position:"relative", zIndex:2}}>
          <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{fontSize:26, display:"inline-block"}}>
            {icon}
          </motion.span>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:42,letterSpacing:2,color,lineHeight:1,marginTop:10}}>
            {typeof value === "number" ? <><Counter to={value}/>{suffix}</> : value}
          </div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,color:C.textLow,marginTop:5}}>
            {label}
          </div>
        </div>
        <div style={{ position:"absolute", bottom:-20, right:-20, width:100, height:100, background:`radial-gradient(circle, ${color}40, transparent 70%)`, filter:"blur(20px)", pointerEvents:"none" }}/>
      </motion.div>
    </TiltCard>
  );
  return to ? <Link to={to} style={{textDecoration:"none"}}>{inner}</Link> : inner;
}

function HeroBanner({ tournament, timeLeft }) {
  const pad = n => String(n).padStart(2, "0");
  const hasTime = timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0;
  const fillPct = tournament ? Math.min(100, (tournament.current_players / tournament.max_players) * 100) : 0;

  return (
    <TiltCard intensity={5} perspective={1500} glareColor={C.primary}>
      <motion.div
        initial={{ opacity:0, scale:0.95, rotateY:-5 }}
        animate={{ opacity:1, scale:1, rotateY:0 }}
        transition={{ duration:0.8, type:"spring", stiffness:80 }}
        style={{ borderRadius:24, overflow:"hidden", position:"relative", minHeight:350, border:`1px solid ${C.primary}40`, boxShadow:`0 0 100px ${C.primaryGlow}40, 0 20px 80px rgba(0,0,0,0.8)` }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
          style={{ position:"absolute", inset:-20, background: tournament?.banner_url ? `url(${tournament.banner_url}) center/cover` : "linear-gradient(135deg,#0a0520,#1a0a40,#0a0520)" }}
        >
          <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(139,61,255,0.05) 20px, rgba(139,61,255,0.05) 40px)" }}/>
        </motion.div>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.8) 50%, rgba(10,10,15,0.4) 100%)" }}/>

        {[...Array(20)].map((_, i) => (
          <motion.div key={i}
            animate={{ y:[Math.random()*500,-Math.random()*500], x:[Math.random()*500,-Math.random()*500], opacity:[0,1,0], scale:[0,Math.random()*2,0] }}
            transition={{ duration:Math.random()*5+5, repeat:Infinity, delay:Math.random()*5 }}
            style={{ position:"absolute", width:Math.random()*4+1, height:Math.random()*4+1, background:C.primary, borderRadius:"50%", boxShadow:`0 0 20px ${C.primary}`, left:`${Math.random()*100}%`, top:`${Math.random()*100}%`, pointerEvents:"none", zIndex:3 }}
          />
        ))}

        <div style={{position:"relative",padding:"40px 44px",display:"flex",flexDirection:"column",justifyContent:"flex-end",minHeight:350, zIndex:4}}>
          {tournament ? (<>
            <motion.div initial={{opacity:0,x:-30,rotateY:-20}} animate={{opacity:1,x:0,rotateY:0}} transition={{delay:0.15,type:"spring"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                <motion.div
                  animate={{ scale:[1,1.1,1], boxShadow:["0 0 10px #ef4444","0 0 30px #ef4444","0 0 10px #ef4444"] }}
                  transition={{duration:1,repeat:Infinity}}
                  style={{display:"flex",alignItems:"center",gap:6,background:"rgba(239,68,68,.2)",border:"1px solid rgba(239,68,68,.4)",color:"#ef4444",padding:"5px 12px",borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,fontWeight:700}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 8px #ef4444",flexShrink:0}}/>LIVE
                </motion.div>
                <span style={{background:"rgba(0,212,255,.12)",border:"1px solid rgba(0,212,255,.25)",color:"#00d4ff",padding:"5px 12px",borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2}}>
                  {tournament.game_type?.toUpperCase()||"FREE FIRE"} · {tournament.mode?.toUpperCase()||"SOLO"}
                </span>
              </div>
              <motion.h2
                animate={{ textShadow:["0 2px 40px rgba(139,61,255,.5)","0 2px 60px rgba(139,61,255,.8)","0 2px 40px rgba(139,61,255,.5)"] }}
                transition={{duration:2,repeat:Infinity}}
                style={{fontFamily:"'Bebas Neue',cursive",fontSize:54,letterSpacing:3,color:"#fff",margin:0,lineHeight:1.05}}
              >{tournament.name}</motion.h2>
              {tournament.description && <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,color:C.textMid,marginTop:10,maxWidth:460}}>{tournament.description}</p>}
              <div style={{display:"flex",alignItems:"center",gap:28,marginTop:18,flexWrap:"wrap"}}>
                <motion.div whileHover={{scale:1.1,x:5}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.textLow,letterSpacing:2,marginBottom:3}}>PRIZE POOL</div>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,color:C.amber,letterSpacing:1}}>🏆 {(tournament.prize_coins||0).toLocaleString()} PTS</div>
                </motion.div>
                <div style={{width:1,height:40,background:C.border}}/>
                <motion.div whileHover={{scale:1.1}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.textLow,letterSpacing:2,marginBottom:3}}>JOUEURS</div>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,color:C.secondary,letterSpacing:1}}>👥 {tournament.current_players}/{tournament.max_players}</div>
                  <div style={{width:120,background:"rgba(255,255,255,.08)",borderRadius:4,height:3,marginTop:4}}>
                    <motion.div initial={{width:0}} animate={{width:`${fillPct}%`}} transition={{delay:.4,duration:.8,type:"spring"}} style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${C.primary},${C.secondary})`}}/>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            {hasTime && (
              <motion.div initial={{opacity:0,y:20,rotateX:-20}} animate={{opacity:1,y:0,rotateX:0}} transition={{delay:.3,type:"spring"}} style={{display:"flex",gap:10,marginTop:22}}>
                {[["HEURES",pad(timeLeft.hours)],["MIN",pad(timeLeft.minutes)],["SEC",pad(timeLeft.seconds)]].map(([lbl,val],idx)=>(
                  <motion.div key={lbl} whileHover={{scale:1.1,y:-5}} whileTap={{scale:0.95}} style={{background:"rgba(0,0,0,.65)",backdropFilter:"blur(12px)",border:`1px solid ${C.primary}40`,borderRadius:10,padding:"10px 16px",textAlign:"center",minWidth:64}}>
                    <motion.div animate={{scale:[1,1.2,1]}} transition={{duration:1,delay:idx*0.2,repeat:Infinity}} style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:C.primary,letterSpacing:2,lineHeight:1,textShadow:`0 0 20px ${C.primary}`}}>{val}</motion.div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7,color:C.textLow,letterSpacing:2,marginTop:3}}>{lbl}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.42}} style={{display:"flex",gap:12,marginTop:22}}>
              <motion.div whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
                <Link to={`/tournaments/${tournament.id}`} style={{padding:"13px 32px",borderRadius:12,background:`linear-gradient(135deg,${C.primary},#4f46e5)`,color:"#fff",fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:2,fontWeight:700,textDecoration:"none",boxShadow:`0 8px 32px ${C.primary},0 0 0 1px ${C.primary}80`,display:"inline-block"}}>⚡ REJOINDRE</Link>
              </motion.div>
              <motion.div whileHover={{x:5}}>
                <Link to="/tournaments" style={{padding:"13px 22px",borderRadius:12,background:"rgba(255,255,255,.05)",border:`1px solid ${C.border}`,color:C.textMid,fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:2,textDecoration:"none",display:"inline-block"}}>VOIR TOUT →</Link>
              </motion.div>
            </motion.div>
          </>) : (
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{type:"spring"}} style={{textAlign:"center",width:"100%"}}>
              <motion.div animate={{rotate:[0,10,-10,0]}} transition={{duration:3,repeat:Infinity}} style={{fontSize:72,marginBottom:18}}>🏟️</motion.div>
              <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:34,letterSpacing:3,color:"rgba(255,255,255,.4)",margin:0}}>ARÈNE EN VEILLE</h2>
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,color:C.textLow,marginTop:8}}>Aucun tournoi actif pour le moment</p>
              <Link to="/tournaments" style={{display:"inline-block",marginTop:20,padding:"12px 28px",borderRadius:12,background:C.primaryDim,border:`1px solid ${C.primary}60`,color:C.primary,fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:2,textDecoration:"none"}}>PARCOURIR →</Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </TiltCard>
  );
}

function TournamentCard({ t, delay = 0 }) {
  const fillPct = Math.min(100, ((t.current_players||0) / (t.max_players||1)) * 100);
  return (
    <TiltCard intensity={12} glareColor={C.primary}>
      <motion.div
        initial={{opacity:0,y:30,rotateX:-15}} animate={{opacity:1,y:0,rotateX:0}}
        transition={{delay,duration:0.7,type:"spring",stiffness:80}} whileHover={{y:-8}}
        style={{background:`linear-gradient(135deg,${C.card},${C.card2})`,borderRadius:20,border:`1px solid ${C.border}`,overflow:"hidden",position:"relative",boxShadow:"0 20px 40px rgba(0,0,0,0.6)"}}
      >
        <motion.div animate={{opacity:[0.3,0.6,0.3]}} transition={{duration:2,repeat:Infinity}}
          style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 0%, ${C.primary}20, transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{height:100,position:"relative",overflow:"hidden"}}>
          <motion.div whileHover={{scale:1.1}} transition={{duration:0.3}} style={{height:"100%"}}>
            {t.banner_url
              ? <img src={t.banner_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <div style={{height:"100%",background:`linear-gradient(135deg,#0a0520,#1a0a40)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🎮</div>}
          </motion.div>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(18,18,26,.95) 100%)"}}/>
          <motion.div animate={{scale:[1,1.1,1],boxShadow:["0 0 10px #2ecc71","0 0 20px #2ecc71","0 0 10px #2ecc71"]}} transition={{duration:1.5,repeat:Infinity}} style={{position:"absolute",top:10,right:10}}>
            <span style={{background:"rgba(46,204,113,.2)",border:"1px solid rgba(46,204,113,.4)",color:C.secondary,padding:"3px 10px",borderRadius:6,fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:1}}>OUVERT</span>
          </motion.div>
        </div>
        <div style={{padding:"16px 18px",position:"relative",zIndex:2}}>
          <motion.p whileHover={{x:5}} style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:"#fff",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</motion.p>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.textLow,letterSpacing:1,marginTop:5}}>{t.game_type?.toUpperCase()||"GAME"} · {t.mode?.toUpperCase()||"SOLO"}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
            <motion.div animate={{scale:[1,1.1,1]}} transition={{duration:2,repeat:Infinity}} style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:C.amber,letterSpacing:1}}>🏆 {(t.prize_coins||0).toLocaleString()}</motion.div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.textMid}}>👥 {t.current_players}/{t.max_players}</div>
          </div>
          <div style={{marginTop:8,background:"rgba(255,255,255,.05)",borderRadius:6,height:4,overflow:"hidden"}}>
            <motion.div initial={{width:0}} animate={{width:`${fillPct}%`}} transition={{duration:1,delay:delay+0.5,type:"spring"}} style={{height:"100%",borderRadius:6,background:`linear-gradient(90deg,${C.primary},${C.secondary})`}}/>
          </div>
          <motion.div whileHover={{scale:1.02}} whileTap={{scale:0.98}}>
            <Link to={`/tournaments/${t.id}`} style={{display:"block",marginTop:14,textAlign:"center",padding:"12px 0",borderRadius:10,background:C.primaryDim,border:`1px solid ${C.primary}40`,color:C.primary,fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,textDecoration:"none",fontWeight:600}}>REJOINDRE →</Link>
          </motion.div>
        </div>
      </motion.div>
    </TiltCard>
  );
}

function QuickLink({ to, icon, label, color, delay }) {
  return (
    <motion.div initial={{opacity:0,x:20,rotateY:-20}} animate={{opacity:1,x:0,rotateY:0}} transition={{delay,type:"spring"}} whileHover={{scale:1.02,x:5}}>
      <Link to={to} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderRadius:14,background:`linear-gradient(135deg,${C.card},${C.card2})`,border:`1px solid ${C.border}`,textDecoration:"none",position:"relative",overflow:"hidden"}}>
        <motion.div initial={{x:"-100%"}} whileHover={{x:"100%"}} transition={{duration:0.8}}
          style={{position:"absolute",inset:0,background:`linear-gradient(90deg, transparent, ${color}40, transparent)`,pointerEvents:"none"}}/>
        <span style={{fontSize:20}}>{icon}</span>
        <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:600,color:C.textMid,flex:1,zIndex:2}}>{label}</span>
        <motion.span animate={{x:[0,5,0]}} transition={{duration:1,repeat:Infinity}} style={{color:C.textLow,fontSize:16,zIndex:2}}>›</motion.span>
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { profile, balance } = useOutletContext() || {};
  const [nextTournament, setNextTournament] = useState(null);
  const [tournaments,    setTournaments]    = useState([]);
  const [stats,          setStats]          = useState({ played:0, wins:0, kills:0, winRate:0, rank:null });
  const [messages,       setMessages]       = useState([]);
  const [timeLeft,       setTimeLeft]       = useState({ hours:0, minutes:0, seconds:0 });
  const [loading,        setLoading]        = useState(true);

  const greeting = (() => { const h=new Date().getHours(); return h<12?"Bonjour":h<18?"Bon après-midi":"Bonsoir"; })();
  const firstName = profile?.full_name?.split(" ")[0]||"JOUEUR";
  const isApproved = profile?.verification_status==="approved";

  useEffect(() => { if (profile?.id) fetchData(); }, [profile?.id]);

  useEffect(() => {
    if (!nextTournament?.start_date) return;
    const tick = () => {
      const diff = new Date(nextTournament.start_date) - new Date();
      if (diff > 0) setTimeLeft({ hours:Math.floor(diff/3600000)%24, minutes:Math.floor(diff/60000)%60, seconds:Math.floor(diff/1000)%60 });
      else setTimeLeft({ hours:0, minutes:0, seconds:0 });
    };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [nextTournament]);

  const fetchData = async () => {
    if (!profile?.id) return;
    try {
      const [{ data:msgs },{ data:next },{ data:all },{ data:st }] = await Promise.all([
        supabase.from("admin_messages").select("*").order("created_at",{ascending:false}).limit(3),
        supabase.from("tournaments").select("*").eq("status","open").order("start_date",{ascending:true}).limit(1),
        supabase.from("tournaments").select("*").eq("status","open").order("start_date",{ascending:true}).limit(4),
        supabase.from("player_stats").select("*").eq("user_id",profile.id).maybeSingle(),
      ]);
      setMessages(msgs||[]);
      setNextTournament(next?.[0]||null);
      setTournaments(all||[]);
      if (st) setStats({ played:st.tournaments_played||0, wins:st.wins||0, kills:st.kills||0, winRate:st.wins>0&&st.tournaments_played>0?Math.round((st.wins/st.tournaments_played)*100):0, rank:st.rank||null });
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{minHeight:"calc(100vh - 64px)",display:"flex",alignItems:"center",justifyContent:"center",background:"transparent"}}>
      <motion.div animate={{scale:[1,1.2,1],rotate:[0,180,360],opacity:[0.3,1,0.3]}} transition={{duration:2,repeat:Infinity}}
        style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:6,color:C.primary}}>CHARGEMENT...</motion.div>
    </div>
  );

  return (
    <div style={{minHeight:"calc(100vh - 64px)",padding:"32px 32px 48px",fontFamily:"'Space Grotesk',sans-serif",perspective:2000}}>

      <motion.div initial={{opacity:0,y:-20,rotateX:-10}} animate={{opacity:1,y:0,rotateX:0}} transition={{duration:0.7,type:"spring"}}
        style={{marginBottom:30,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
        <div>
          <motion.p animate={{x:[0,5,0]}} transition={{duration:2,repeat:Infinity}}
            style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:3,color:C.textLow,margin:"0 0 6px"}}>
            {greeting.toUpperCase()} · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
          </motion.p>
          <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:46,letterSpacing:3,margin:0,lineHeight:1}}>
            <span style={{color:C.textMid}}>BIENVENUE, </span>
            <motion.span animate={{textShadow:["0 0 20px #8b3dff","0 0 40px #8b3dff","0 0 20px #8b3dff"]}} transition={{duration:2,repeat:Infinity}}
              style={{background:`linear-gradient(135deg,${C.primary},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              {firstName.toUpperCase()}
            </motion.span>
          </h1>
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            {isApproved
              ? <motion.span whileHover={{scale:1.05}} style={{background:"rgba(46,204,113,.12)",border:"1px solid rgba(46,204,113,.25)",color:C.secondary,padding:"4px 12px",borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1}}>✅ COMPTE VÉRIFIÉ</motion.span>
              : <motion.span whileHover={{scale:1.05}} style={{background:"rgba(255,179,71,.12)",border:"1px solid rgba(255,179,71,.25)",color:C.amber,padding:"4px 12px",borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1}}>⏳ VÉRIFICATION EN COURS</motion.span>
            }
            <motion.span animate={{scale:[1,1.05,1]}} transition={{duration:2,repeat:Infinity}} whileHover={{scale:1.1}}
              style={{background:"rgba(139,61,255,.12)",border:"1px solid rgba(139,61,255,.25)",color:C.primary,padding:"4px 12px",borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1}}>
              💎 {(balance||profile?.coins||0).toLocaleString()} PTS
            </motion.span>
          </div>
        </div>
        <motion.div whileHover={{scale:1.05,rotate:2}} whileTap={{scale:0.95}}>
          <Link to="/tournaments" style={{padding:"14px 28px",borderRadius:14,background:`linear-gradient(135deg,${C.primary},#4f46e5)`,color:"#fff",fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:2,fontWeight:700,textDecoration:"none",boxShadow:`0 10px 30px ${C.primary}`,display:"inline-block"}}>
            🏆 VOIR LES TOURNOIS
          </Link>
        </motion.div>
      </motion.div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        <StatCard icon="🎮" label="TOURNOIS JOUÉS"   value={stats.played}  color={C.cyan}      delay={0}   to="/stats"/>
        <StatCard icon="🏆" label="VICTOIRES"         value={stats.wins}    color={C.amber}     delay={0.1} to="/stats"/>
        <StatCard icon="🎯" label="KILLS TOTAUX"      value={stats.kills}   color={C.danger}    delay={0.2} to="/stats"/>
        <StatCard icon="📈" label="TAUX DE VICTOIRE"  value={stats.winRate} suffix="%" color={C.secondary} delay={0.3} to="/stats"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20,marginBottom:24,alignItems:"start"}}>
        <HeroBanner tournament={nextTournament} timeLeft={timeLeft}/>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <TiltCard intensity={10} glareColor={C.primary}>
            <motion.div initial={{opacity:0,x:20,rotateY:20}} animate={{opacity:1,x:0,rotateY:0}} transition={{delay:0.4,type:"spring"}}
              style={{background:`linear-gradient(135deg,${C.card},${C.card2})`,borderRadius:20,border:`1px solid ${C.border}`,padding:"24px",position:"relative",overflow:"hidden"}}>
              <motion.div animate={{opacity:[0.3,0.6,0.3],scale:[1,1.2,1]}} transition={{duration:3,repeat:Infinity}}
                style={{position:"absolute",inset:0,background:`radial-gradient(circle at 70% 30%, ${C.primary}30, transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{position:"relative"}}>
                <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:3,color:C.textLow,margin:"0 0 10px"}}>MON CLASSEMENT</p>
                <motion.div animate={{scale:[1,1.1,1]}} transition={{duration:2,repeat:Infinity}}
                  style={{fontFamily:"'Bebas Neue',cursive",fontSize:58,color:stats.rank?C.primary:"rgba(255,255,255,.12)",letterSpacing:2,lineHeight:1}}>
                  {stats.rank?`#${stats.rank}`:"—"}
                </motion.div>
                <div style={{marginTop:12,background:"rgba(255,255,255,.05)",borderRadius:6,height:5,overflow:"hidden"}}>
                  <motion.div initial={{width:0}} animate={{width:`${Math.min(stats.winRate,100)}%`}} transition={{delay:0.8,duration:1,type:"spring"}}
                    style={{height:"100%",borderRadius:6,background:`linear-gradient(90deg,${C.primary},${C.secondary})`}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.textLow}}>0%</span>
                  <motion.span animate={{opacity:[0.5,1,0.5]}} transition={{duration:1.5,repeat:Infinity}}
                    style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.primary}}>{stats.winRate}% WIN</motion.span>
                </div>
              </div>
            </motion.div>
          </TiltCard>

          {[
            {to:"/tournaments",   icon:"🏆",label:"Tournois",    color:C.primary},
            {to:"/leaderboard",   icon:"📊",label:"Classement",  color:C.cyan},
            {to:"/stats",         icon:"📈",label:"Mes Stats",   color:C.secondary},
            {to:"/daily-rewards", icon:"🎁",label:"Récompenses", color:C.amber},
            {to:"/achievements",  icon:"🏅",label:"Achievements",color:"#a78bfa"},
          ].map((item,i)=><QuickLink key={item.to} {...item} delay={0.5+i*0.1}/>)}
        </div>
      </div>

      {tournaments.length > 1 && (
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <motion.h2 animate={{x:[0,5,0]}} transition={{duration:2,repeat:Infinity}}
              style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,color:C.textMid,margin:0}}>🔥 AUTRES TOURNOIS OUVERTS</motion.h2>
            <Link to="/tournaments" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,color:C.primary,textDecoration:"none"}}>VOIR TOUT →</Link>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {tournaments.slice(1,4).map((t,i)=><TournamentCard key={t.id} t={t} delay={0.6+i*0.1}/>)}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <motion.div initial={{opacity:0,y:20,rotateX:-10}} animate={{opacity:1,y:0,rotateX:0}} transition={{delay:0.8,type:"spring"}}
          style={{background:`linear-gradient(135deg,${C.card},${C.card2})`,borderRadius:20,border:`1px solid ${C.border}`,padding:"24px 28px",position:"relative",overflow:"hidden"}}>
          <motion.div animate={{opacity:[0.2,0.4,0.2],scale:[1,1.1,1]}} transition={{duration:3,repeat:Infinity}}
            style={{position:"absolute",inset:0,background:`radial-gradient(circle at 30% 50%, ${C.primary}20, transparent 70%)`,pointerEvents:"none"}}/>
          <h3 style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:C.textMid,margin:"0 0 18px"}}>📢 ANNONCES OFFICIELLES</h3>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {messages.map((m,idx)=>(
              <motion.div key={m.id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.9+idx*0.1}}
                whileHover={{x:5,scale:1.01}}
                style={{padding:"16px 20px",borderRadius:14,background:`linear-gradient(135deg,${C.primary}15,#4f46e510)`,border:`1px solid ${C.primary}30`}}>
                <p style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:"#fff",margin:0}}>{m.title}</p>
                <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:C.textMid,margin:"5px 0 0"}}>{m.content}</p>
                <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.textLow,margin:"7px 0 0",letterSpacing:1}}>
                  {new Date(m.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { background: #0a0a0f; margin: 0; }
      `}</style>
    </div>
  );
}