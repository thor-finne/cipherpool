import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`,gx=a=>`rgba(16,185,129,${a})`,ax=a=>`rgba(251,191,36,${a})`,vx=a=>`rgba(167,139,250,${a})`,rx=a=>`rgba(244,63,94,${a})`;

function G({children,style,ac}){
  const[h,setH]=useState(false);
  return(
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{position:"relative",overflow:"hidden",background:CARD,border:`1px solid ${h&&ac?ac+"40":cx(.1)}`,borderRadius:14,
        boxShadow:h&&ac?`0 0 0 1px ${ac}12,0 8px 32px rgba(0,0,0,.5)`:`0 4px 20px rgba(0,0,0,.4)`,transition:"all .22s",...style}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${ac||cx(.3)},transparent)`,opacity:h?1:.3,transition:"opacity .22s",pointerEvents:"none"}}/>
      {children}
    </div>
  );
}

function CountdownTimer(){
  const[time,setTime]=useState("");
  useEffect(()=>{
    const tick=()=>{
      const now=new Date(),midnight=new Date();
      midnight.setHours(24,0,0,0);
      const diff=midnight-now;
      const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
      setTime(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[]);
  return <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:14,color:CYAN,letterSpacing:2}}>{time}</span>;
}

export default function DailyRewards(){
  const{profile,refreshProfile}=useOutletContext();
  const[rewards,setRewards]=useState([]);
  const[missions,setMissions]=useState([]);
  const[userMissions,setUserMissions]=useState([]);
  const[lastClaim,setLastClaim]=useState(null);
  const[streak,setStreak]=useState(0);
  const[claiming,setClaiming]=useState(false);
  const[claimResult,setClaimResult]=useState(null);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("daily");

  useEffect(()=>{fetchAll();},[profile?.id]);

  const fetchAll=async()=>{
    setLoading(true);
    try{
      const[{data:rwData},{data:msData},{data:claimData},{data:umData}]=await Promise.all([
        supabase.from("daily_rewards").select("*").order("day"),
        supabase.from("missions").select("*").eq("is_active",true).order("type"),
        profile?.id?supabase.from("user_daily_claims").select("*").eq("user_id",profile.id).order("claimed_at",{ascending:false}).limit(1):{data:[]},
        profile?.id?supabase.from("user_missions").select("*").eq("user_id",profile.id).eq("reset_date",new Date().toISOString().split("T")[0]):{data:[]}
      ]);
      setRewards(rwData||[]);
      setMissions(msData||[]);
      setUserMissions(umData||[]);
      if(claimData?.[0]){setLastClaim(claimData[0]);setStreak(claimData[0].streak||1);}
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const canClaim=!lastClaim||new Date(lastClaim.claimed_at).toDateString()!==new Date().toDateString();
  const currentDay=(streak%7)||7;

  const claimReward=async()=>{
    if(!canClaim||claiming)return;
    setClaiming(true);
    try{
      const{data,error}=await supabase.rpc("claim_daily_reward",{p_user_id:profile.id});
      if(error)throw error;
      setClaimResult(data);
      await fetchAll();
      refreshProfile?.();
      setTimeout(()=>setClaimResult(null),4000);
    }catch(e){console.error(e);}
    finally{setClaiming(false);}
  };

  const claimMission=async(missionId)=>{
    const um=userMissions.find(u=>u.mission_id===missionId);
    if(!um||!um.completed||um.claimed)return;
    const mission=missions.find(m=>m.id===missionId);
    if(!mission)return;
    await supabase.from("user_missions").update({claimed:true,claimed_at:new Date().toISOString()}).eq("id",um.id);
    await supabase.from("wallets").rpc || await supabase.rpc("grant_coins",{target_user:profile.id,amount:mission.coins_reward}).catch(()=>
      supabase.from("wallets").update({balance:supabase.raw(`balance + ${mission.coins_reward}`)}).eq("user_id",profile.id)
    );
    await fetchAll();refreshProfile?.();
  };

  if(loading)return(
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
        style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/>
    </div>
  );

  const totalCoinsAvail=missions.filter(m=>{const um=userMissions.find(u=>u.mission_id===m.id);return um?.completed&&!um?.claimed;}).reduce((s,m)=>s+m.coins_reward,0);

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .dr{font-family:Space Grotesk,sans-serif;color:rgba(255,255,255,.88);min-height:100vh;background:${BG};padding:32px}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${cx(.22)};border-radius:99px}
    `}</style>

    <div className="dr">
      {/* CLAIM RESULT TOAST */}
      <AnimatePresence>
        {claimResult?.success&&(
          <motion.div initial={{opacity:0,y:-40,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-40,scale:.9}}
            style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:100,
              padding:"16px 28px",borderRadius:14,background:`linear-gradient(135deg,${AMBER}20,${CARD})`,
              border:`1px solid ${AMBER}40`,boxShadow:`0 0 30px ${ax(.3)},0 16px 48px rgba(0,0,0,.6)`,textAlign:"center",minWidth:280}}>
            <p style={{fontFamily:"Bebas Neue,cursive",fontSize:28,color:AMBER,letterSpacing:2,lineHeight:1}}>
              {claimResult.is_special?"🎉 RÉCOMPENSE SPÉCIALE":"✅ REWARD RÉCLAMÉ"}
            </p>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:13,color:"#fff",marginTop:6}}>
              +{claimResult.coins} 💎 · +{claimResult.xp} XP ⚡
            </p>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(255,255,255,.4)",marginTop:4}}>
              Jour {claimResult.day} · Streak {claimResult.streak} 🔥
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div style={{marginBottom:28}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:3,color:cx(.5),marginBottom:6}}>🎁 RÉCOMPENSES</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
          <h1 style={{fontFamily:"Bebas Neue,cursive",fontSize:46,letterSpacing:3,margin:0,color:"#fff"}}>
            DAILY <span style={{color:AMBER}}>REWARDS</span>
          </h1>
          <div style={{textAlign:"right"}}>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"rgba(255,255,255,.4)"}}>RESET DANS</p>
            <CountdownTimer/>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",gap:4,background:cx(.04),borderRadius:10,padding:4,marginBottom:24,width:"fit-content"}}>
        {[["daily","JOURNALIER"],["weekly","HEBDOMADAIRE"],["missions","MISSIONS"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"9px 20px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:1.5,
              background:tab===k?`linear-gradient(135deg,${AMBER},${CYAN})`:"transparent",
              color:tab===k?"#000":"rgba(255,255,255,.4)",fontWeight:tab===k?700:400,transition:"all .2s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* DAILY TAB */}
      {tab==="daily"&&(<>
        {/* STREAK + CLAIM */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,marginBottom:24,alignItems:"stretch"}}>
          <G ac={AMBER} style={{padding:"24px 28px"}}>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:12}}>🔥 STREAK ACTUELLE</p>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <motion.p animate={{scale:[1,1.05,1]}} transition={{duration:2,repeat:Infinity}}
                style={{fontFamily:"Bebas Neue,cursive",fontSize:64,color:AMBER,lineHeight:1,textShadow:`0 0 30px ${ax(.6)}`}}>
                {streak}
              </motion.p>
              <div>
                <p style={{fontFamily:"Bebas Neue,cursive",fontSize:18,letterSpacing:2,color:"#fff",marginBottom:4}}>JOURS D'AFFILÉE</p>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(255,255,255,.35)"}}>
                  {canClaim?"Réclamez votre récompense !":"Déjà réclamé aujourd'hui"}
                </p>
              </div>
            </div>
          </G>
          <motion.button whileHover={canClaim?{scale:1.04}:{}} whileTap={canClaim?{scale:.96}:{}} onClick={claimReward} disabled={!canClaim||claiming}
            style={{padding:"0 36px",borderRadius:14,background:canClaim?`linear-gradient(135deg,${AMBER},${CYAN})`:"rgba(255,255,255,.05)",
              border:canClaim?"none":`1px solid ${cx(.1)}`,color:canClaim?"#000":"rgba(255,255,255,.25)",
              fontFamily:"JetBrains Mono,monospace",fontSize:11,letterSpacing:2,fontWeight:700,cursor:canClaim?"pointer":"not-allowed",
              boxShadow:canClaim?`0 0 30px ${ax(.4)}`:"none",transition:"all .2s",minWidth:160}}>
            {claiming?"...":canClaim?"🎁 RÉCLAMER":("✓ RÉCLAMÉ")}
          </motion.button>
        </div>

        {/* 7-DAY CALENDAR */}
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:14}}>CYCLE DE 7 JOURS</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10,marginBottom:24}}>
          {rewards.map((r,i)=>{
            const isDone=streak>0&&(i<(streak%7)||(streak%7===0&&i<7));
            const isCurrent=currentDay===r.day;
            const isSpecial=r.is_special;
            return(
              <motion.div key={r.id} whileHover={{y:-4}} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}>
                <div style={{position:"relative",borderRadius:12,padding:"16px 8px",textAlign:"center",
                  background:isCurrent?`linear-gradient(135deg,${AMBER}20,${CARD})`:isDone?gx(.06):cx(.04),
                  border:`1px solid ${isCurrent?AMBER:isDone?gx(.3):cx(.08)}`,
                  boxShadow:isCurrent?`0 0 20px ${ax(.3)}`:"none",transition:"all .22s"}}>
                  {isCurrent&&<motion.div animate={{opacity:[.5,1,.5]}} transition={{duration:1.5,repeat:Infinity}}
                    style={{position:"absolute",inset:-1,borderRadius:12,border:`2px solid ${AMBER}`,pointerEvents:"none"}}/>}
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.25)",letterSpacing:1,marginBottom:6}}>
                    JOUR {r.day}
                  </p>
                  <div style={{fontSize:isSpecial?28:22,marginBottom:6,filter:isDone?`grayscale(0)drop-shadow(0 0 6px ${AMBER}60)`:"none"}}>
                    {isDone?"✅":r.icon}
                  </div>
                  <p style={{fontFamily:"Bebas Neue,cursive",fontSize:isSpecial?20:16,color:isCurrent?AMBER:isDone?GREEN:"rgba(255,255,255,.4)",lineHeight:1}}>
                    {r.coins}
                  </p>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:"rgba(255,255,255,.2)",letterSpacing:1}}>COINS</p>
                  {isSpecial&&<div style={{position:"absolute",top:-6,left:"50%",transform:"translateX(-50%)",background:AMBER,color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:7,padding:"2px 6px",borderRadius:4,fontWeight:700,whiteSpace:"nowrap"}}>SPÉCIAL</div>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </>)}

      {/* MISSIONS TAB */}
      {(tab==="missions"||tab==="weekly")&&(()=>{
        const type=tab==="weekly"?"weekly":"daily";
        const filteredMs=missions.filter(m=>m.type===type);
        return(
          <div>
            {totalCoinsAvail>0&&tab==="missions"&&(
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
                style={{marginBottom:16,padding:"14px 20px",borderRadius:12,background:ax(.08),border:`1px solid ${ax(.2)}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{fontFamily:"Space Grotesk,sans-serif",fontSize:13,color:"#fff"}}>💎 Récompenses disponibles</p>
                <span style={{fontFamily:"Bebas Neue,cursive",fontSize:22,color:AMBER}}>+{totalCoinsAvail} COINS</span>
              </motion.div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredMs.map((m,i)=>{
                const um=userMissions.find(u=>u.mission_id===m.id);
                const progress=um?.progress||0;
                const pct=Math.min(100,Math.round((progress/m.target_value)*100));
                const completed=um?.completed||false;
                const claimed=um?.claimed||false;
                const catColor=m.category==="tournament"?AMBER:m.category==="social"?GREEN:CYAN;
                return(
                  <motion.div key={m.id} initial={{opacity:0,x:-14}} animate={{opacity:1,x:0}} transition={{delay:i*.06}}>
                    <G ac={completed&&!claimed?catColor:undefined} style={{padding:"18px 22px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:16}}>
                        <motion.div animate={completed&&!claimed?{scale:[1,1.1,1]}:{}} transition={{duration:1.5,repeat:Infinity}}
                          style={{fontSize:28,flexShrink:0}}>{m.icon}</motion.div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                            <p style={{fontSize:14,fontWeight:600,color:"#fff"}}>{m.title}</p>
                            <div style={{display:"flex",gap:8,flexShrink:0,marginLeft:10}}>
                              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:CYAN}}>💎 {m.coins_reward}</span>
                              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:INDIGO}}>⚡ {m.xp_reward}</span>
                            </div>
                          </div>
                          <p style={{fontSize:11,color:"rgba(255,255,255,.35)",marginBottom:8}}>{m.description}</p>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{flex:1,height:4,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden"}}>
                              <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1,ease:[.22,1,.36,1]}}
                                style={{height:"100%",background:completed?`linear-gradient(90deg,${GREEN},${catColor})`:`linear-gradient(90deg,${catColor},${catColor}80)`,borderRadius:99}}/>
                            </div>
                            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",flexShrink:0,minWidth:50,textAlign:"right"}}>
                              {progress}/{m.target_value}
                            </span>
                          </div>
                        </div>
                        {completed&&!claimed&&(
                          <motion.button whileHover={{scale:1.05}} whileTap={{scale:.95}} onClick={()=>claimMission(m.id)}
                            style={{padding:"10px 16px",borderRadius:10,background:`linear-gradient(135deg,${catColor},${INDIGO})`,border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                            RÉCLAMER
                          </motion.button>
                        )}
                        {claimed&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:GREEN,flexShrink:0}}>✓ RÉCLAMÉ</span>}
                        {!completed&&<div style={{width:36,height:36,borderRadius:10,background:cx(.04),border:`1px solid ${cx(.08)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontFamily:"Bebas Neue,cursive",fontSize:14,color:"rgba(255,255,255,.2)"}}>{pct}%</span>
                        </div>}
                      </div>
                    </G>
                  </motion.div>
                );
              })}
              {filteredMs.length===0&&(
                <div style={{textAlign:"center",padding:"60px 0"}}>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUNE MISSION DISPONIBLE</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  </>);
}