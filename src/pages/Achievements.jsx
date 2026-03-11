import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`,gx=a=>`rgba(16,185,129,${a})`,ax=a=>`rgba(251,191,36,${a})`,vx=a=>`rgba(167,139,250,${a})`,rx=a=>`rgba(244,63,94,${a})`;

const RARITY={
  common:   {color:"#94a3b8",glow:"rgba(148,163,184,.3)",bg:"rgba(148,163,184,.07)",border:"rgba(148,163,184,.18)",label:"COMMUN"},
  rare:     {color:INDIGO,   glow:`rgba(129,140,248,.4)`, bg:`rgba(129,140,248,.08)`,border:`rgba(129,140,248,.22)`,label:"RARE"},
  epic:     {color:VIOLET,   glow:`rgba(167,139,250,.4)`, bg:`rgba(167,139,250,.08)`,border:`rgba(167,139,250,.22)`,label:"ÉPIQUE"},
  legendary:{color:AMBER,    glow:`rgba(251,191,36,.4)`,  bg:`rgba(251,191,36,.08)`, border:`rgba(251,191,36,.22)`, label:"LÉGENDAIRE"},
};

const CAT_COLORS={combat:CYAN,tournament:AMBER,social:GREEN,special:VIOLET};

export default function Achievements(){
  const{profile}=useOutletContext();
  const[all,setAll]=useState([]);
  const[earned,setEarned]=useState([]);
  const[filter,setFilter]=useState("all");
  const[loading,setLoading]=useState(true);
  const[selected,setSelected]=useState(null);

  useEffect(()=>{fetchAll();},[profile?.id]);

  const fetchAll=async()=>{
    setLoading(true);
    const[{data:achData},{data:earnedData}]=await Promise.all([
      supabase.from("achievements").select("*").order("rarity",{ascending:true}),
      profile?.id?supabase.from("user_achievements").select("*,achievement:achievements(*)").eq("user_id",profile.id):{data:[]}
    ]);
    setAll(achData||[]);
    setEarned(earnedData||[]);
    setLoading(false);
  };

  const earnedIds=new Set(earned.map(e=>e.achievement_id));
  const cats=["all","combat","tournament","social","special"];

  const filtered=(filter==="earned"
    ?all.filter(a=>earnedIds.has(a.id))
    :filter==="locked"
    ?all.filter(a=>!earnedIds.has(a.id))
    :filter==="all"
    ?all
    :all.filter(a=>a.category===filter)
  );

  const pct=all.length>0?Math.round((earnedIds.size/all.length)*100):0;

  if(loading)return(
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
        style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/>
    </div>
  );

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .ach{font-family:Space Grotesk,sans-serif;color:rgba(255,255,255,.88);min-height:100vh;background:${BG};padding:32px}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${cx(.22)};border-radius:99px}
    `}</style>

    <div className="ach">
      {/* HEADER */}
      <div style={{marginBottom:28}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:3,color:cx(.5),marginBottom:6}}>🏅 SUCCÈS & RÉCOMPENSES</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
          <h1 style={{fontFamily:"Bebas Neue,cursive",fontSize:46,letterSpacing:3,margin:0,color:"#fff"}}>
            ACHIEVEMENTS <span style={{color:CYAN}}>{earnedIds.size}/{all.length}</span>
          </h1>
          <div style={{textAlign:"right"}}>
            <p style={{fontFamily:"Bebas Neue,cursive",fontSize:32,color:CYAN,lineHeight:1}}>{pct}%</p>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)"}}>COMPLÉTÉ</p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{marginTop:14,height:6,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden"}}>
          <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1.6,ease:[.22,1,.36,1],delay:.2}}
            style={{height:"100%",background:`linear-gradient(90deg,${CYAN},${INDIGO})`,borderRadius:99,boxShadow:`0 0 14px ${cx(.5)}`}}/>
        </div>
        {/* Cat stats */}
        <div style={{display:"flex",gap:12,marginTop:14,flexWrap:"wrap"}}>
          {Object.entries(CAT_COLORS).map(([cat,color])=>{
            const total=all.filter(a=>a.category===cat).length;
            const done=all.filter(a=>a.category===cat&&earnedIds.has(a.id)).length;
            return(
              <div key={cat} style={{padding:"8px 14px",borderRadius:9,background:`${color}10`,border:`1px solid ${color}20`,display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:color,letterSpacing:1,textTransform:"uppercase"}}>{cat}</span>
                <span style={{fontFamily:"Bebas Neue,cursive",fontSize:14,color:"#fff"}}>{done}/{total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTERS */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {[["all","TOUS"],["earned","OBTENUS"],["locked","VERROUILLÉS"],...cats.slice(1).map(c=>[c,c.toUpperCase()])].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)}
            style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1.5,
              background:filter===k?`linear-gradient(135deg,${CYAN},${INDIGO})`:`${cx(.06)}`,
              color:filter===k?"#000":"rgba(255,255,255,.4)",fontWeight:filter===k?700:400,transition:"all .2s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {filtered.map((ach,i)=>{
          const isEarned=earnedIds.has(ach.id);
          const r=RARITY[ach.rarity]||RARITY.common;
          const earnedData=earned.find(e=>e.achievement_id===ach.id);
          return(
            <motion.div key={ach.id} initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:i*.03,type:"spring",stiffness:200}}
              whileHover={{y:-4,transition:{duration:.15}}} onClick={()=>setSelected(ach)}
              style={{cursor:"pointer",opacity:isEarned?1:.45,filter:isEarned?"none":"grayscale(40%)"}}>
              <div style={{position:"relative",overflow:"hidden",background:isEarned?r.bg:CARD,border:`1px solid ${isEarned?r.border:cx(.08)}`,
                borderRadius:14,padding:"18px 18px",boxShadow:isEarned?`0 0 20px ${r.glow},0 4px 20px rgba(0,0,0,.4)`:`0 4px 20px rgba(0,0,0,.4)`,transition:"all .22s"}}>
                {isEarned&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${r.color},transparent)`,opacity:.8}}/>}
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <motion.div animate={isEarned?{scale:[1,1.1,1]}:{}} transition={{duration:2,repeat:Infinity,delay:i*.2}}
                    style={{fontSize:36,flexShrink:0,filter:isEarned?`drop-shadow(0 0 8px ${r.color}60)`:"none"}}>
                    {ach.icon}
                  </motion.div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <p style={{fontSize:14,fontWeight:700,color:isEarned?r.color:"rgba(255,255,255,.5)",lineHeight:1.2}}>{ach.name}</p>
                      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:r.color,background:r.bg,border:`1px solid ${r.border}`,padding:"2px 6px",borderRadius:5,flexShrink:0,marginLeft:6}}>
                        {r.label}
                      </span>
                    </div>
                    <p style={{fontSize:11,color:"rgba(255,255,255,.35)",lineHeight:1.5,marginBottom:8}}>{ach.description}</p>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      {ach.coins_reward>0&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:CYAN}}>💎 {ach.coins_reward}</span>}
                      {ach.xp_reward>0&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:INDIGO}}>⚡ {ach.xp_reward} XP</span>}
                      {isEarned&&earnedData?.earned_at&&
                        <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.2)",marginLeft:"auto"}}>
                          {new Date(earnedData.earned_at).toLocaleDateString("fr-FR")}
                        </span>}
                    </div>
                  </div>
                </div>
                {isEarned&&<div style={{position:"absolute",top:10,right:10,width:20,height:20,borderRadius:"50%",background:gx(.15),border:`1px solid ${gx(.3)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>✓</div>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length===0&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUN SUCCÈS DANS CETTE CATÉGORIE</p>
        </div>
      )}
    </div>

    {/* DETAIL MODAL */}
    <AnimatePresence>
      {selected&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{position:"fixed",inset:0,background:"rgba(2,8,23,.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}
          onClick={()=>setSelected(null)}>
          <motion.div initial={{scale:.85,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.85,opacity:0}}
            onClick={e=>e.stopPropagation()}
            style={{width:"100%",maxWidth:420,background:CARD,border:`1px solid ${(RARITY[selected.rarity]||RARITY.common).border}`,borderRadius:20,padding:"32px",boxShadow:`0 0 40px ${(RARITY[selected.rarity]||RARITY.common).glow},0 24px 80px rgba(0,0,0,.7)`}}>
            {(()=>{
              const r=RARITY[selected.rarity]||RARITY.common;
              const isE=earnedIds.has(selected.id);
              return(<>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <motion.div animate={{scale:[1,1.15,1],rotate:[0,5,-5,0]}} transition={{duration:2,repeat:Infinity}}
                    style={{fontSize:64,marginBottom:12,display:"inline-block",filter:`drop-shadow(0 0 16px ${r.color}70)`}}>
                    {selected.icon}
                  </motion.div>
                  <h2 style={{fontFamily:"Bebas Neue,cursive",fontSize:30,letterSpacing:2,color:r.color,margin:"0 0 6px"}}>{selected.name}</h2>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:r.color,background:r.bg,border:`1px solid ${r.border}`,padding:"4px 14px",borderRadius:20}}>{r.label}</span>
                </div>
                <p style={{color:"rgba(255,255,255,.5)",fontSize:13,textAlign:"center",lineHeight:1.7,marginBottom:20}}>{selected.description}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                  {[[`💎 ${selected.coins_reward}`,"COINS REWARD",CYAN],[`⚡ ${selected.xp_reward}`,"XP REWARD",INDIGO]].map(([v,l,c])=>(
                    <div key={l} style={{textAlign:"center",padding:"12px",borderRadius:10,background:cx(.04),border:`1px solid ${cx(.08)}`}}>
                      <p style={{fontFamily:"Bebas Neue,cursive",fontSize:22,color:c,lineHeight:1}}>{v}</p>
                      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.25)",letterSpacing:1,marginTop:4}}>{l}</p>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:"center",padding:"12px",borderRadius:10,background:isE?gx(.08):rx(.06),border:`1px solid ${isE?gx(.2):rx(.15)}`}}>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:isE?GREEN:RED,letterSpacing:1}}>
                    {isE?"✅ SUCCÈS OBTENU":"🔒 NON DÉBLOQUÉ"}
                  </p>
                  {isE&&earned.find(e=>e.achievement_id===selected.id)?.earned_at&&
                    <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)",marginTop:4}}>
                      {new Date(earned.find(e=>e.achievement_id===selected.id).earned_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
                    </p>}
                </div>
              </>);
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>);
}