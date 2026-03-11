import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`,gx=a=>`rgba(16,185,129,${a})`,rx=a=>`rgba(244,63,94,${a})`,ax=a=>`rgba(251,191,36,${a})`;

function StatCard({label,value,sub,color,icon,delay=0}){
  return(
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay,type:"spring",stiffness:180}}
      whileHover={{y:-4,transition:{duration:.15}}}
      style={{position:"relative",overflow:"hidden",background:CARD,border:`1px solid ${color}20`,borderRadius:14,padding:"22px 20px",
        boxShadow:`0 0 20px ${color}10,0 4px 20px rgba(0,0,0,.4)`,transition:"all .22s"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${color},transparent)`,opacity:.6}}/>
      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:10}}>{icon} {label}</p>
      <p style={{fontFamily:"Bebas Neue,cursive",fontSize:40,color:color,lineHeight:1,marginBottom:4,textShadow:`0 0 20px ${color}50`}}>{value}</p>
      {sub&&<p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>{sub}</p>}
    </motion.div>
  );
}

function Bar({value,max,color}){
  const pct=max>0?Math.min(100,(value/max)*100):0;
  return(
    <div style={{height:6,background:"rgba(255,255,255,.05)",borderRadius:99,overflow:"hidden"}}>
      <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1.2,ease:[.22,1,.36,1]}}
        style={{height:"100%",background:color,borderRadius:99,boxShadow:`0 0 8px ${color}80`}}/>
    </div>
  );
}

const POSITIONS={"1er":"🥇","2ème":"🥈","3ème":"🥉"};

export default function PlayerStats(){
  const{profile}=useOutletContext();
  const[stats,setStats]=useState(null);
  const[history,setHistory]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("stats");

  useEffect(()=>{fetchData();},[profile?.id]);

  const fetchData=async()=>{
    if(!profile?.id){setLoading(false);return;}
    setLoading(true);
    try{
      // Fetch stats + real match history from match_results
      const[{data:sData},{data:matchData}]=await Promise.all([
        supabase.from("player_stats").select("*").eq("user_id",profile.id).maybeSingle(),
        supabase.from("match_results")
          .select("id, tournament_id, placement, kills, points, estimated_coins, status, submitted_at")
          .eq("user_id", profile.id)
          .eq("status", "verified")
          .order("submitted_at", {ascending:false})
          .limit(20)
      ]);

      // Enrich match history with tournament names
      let enrichedHistory = [];
      if (matchData?.length) {
        const tIds = [...new Set(matchData.map(m => m.tournament_id))];
        const { data: tours } = await supabase.from("tournaments")
          .select("id, name, game_type").in("id", tIds);
        const tMap = Object.fromEntries((tours||[]).map(t=>[t.id,t]));
        enrichedHistory = matchData.map(m => ({
          ...m,
          tournament: tMap[m.tournament_id] || { name: "Tournoi", game_type: "BR" },
          position: m.placement,
          prize_won: m.estimated_coins || 0,
        }));
      }

      setStats(sData||{kills:0,wins:0,tournaments_played:0,total_points:0});
      setHistory(enrichedHistory);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const s=stats||{};
  const wr=s.tournaments_played>0?Math.round(((s.wins||0)/s.tournaments_played)*100):0;
  const kd = s.kd_ratio ? parseFloat(s.kd_ratio).toFixed(2) : s.tournaments_played > 0 ? (s.kills/s.tournaments_played).toFixed(2) : '0.00';

  const displayHistory = history;

  if(loading)return(
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
        style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/>
    </div>
  );

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .ps{font-family:Space Grotesk,sans-serif;color:rgba(255,255,255,.88);min-height:100vh;background:${BG};padding:32px}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${cx(.22)};border-radius:99px}
    `}</style>

    <div className="ps">
      {/* HEADER */}
      <div style={{marginBottom:28}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:3,color:cx(.5),marginBottom:6}}>📊 STATISTIQUES JOUEUR</p>
        <div style={{display:"flex",alignItems:"flex-end",gap:18,flexWrap:"wrap"}}>
          {profile?.avatar_url
            ?<img src={profile.avatar_url} style={{width:64,height:64,borderRadius:14,border:`2px solid ${cx(.3)}`,objectFit:"cover"}}/>
            :<div style={{width:64,height:64,borderRadius:14,border:`2px solid ${cx(.3)}`,background:cx(.1),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:28,color:CYAN}}>
              {(profile?.username||"?")[0].toUpperCase()}
            </div>}
          <div>
            <h1 style={{fontFamily:"Bebas Neue,cursive",fontSize:40,letterSpacing:3,margin:0,color:"#fff",lineHeight:1}}>
              {profile?.username||"JOUEUR"} <span style={{color:CYAN,fontSize:24}}>#{s.rank||"-"}</span>
            </h1>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(255,255,255,.3)",marginTop:4}}>
              {s.tournaments_played||0} TOURNOIS · SAISON 1
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",gap:4,background:cx(.04),borderRadius:10,padding:4,marginBottom:24,width:"fit-content"}}>
        {[["stats","STATISTIQUES"],["history","HISTORIQUE"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"9px 22px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:1.5,
              background:tab===k?`linear-gradient(135deg,${CYAN},${INDIGO})`:"transparent",
              color:tab===k?"#000":"rgba(255,255,255,.4)",fontWeight:tab===k?700:400,transition:"all .2s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* STATS TAB */}
      {tab==="stats"&&(<>
        {/* KPI GRID */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:24}}>
          <StatCard label="KILLS TOTAL" value={s.kills||0} color={RED} icon="🎯" delay={0}/>
          <StatCard label="VICTOIRES" value={s.wins||0} color={AMBER} icon="🏆" delay={.05}/>
          <StatCard label="TOP 3" value={s.top3_finishes||0} color={GREEN} icon="🥉" delay={.1}/>
          <StatCard label="K/D RATIO" value={kd} color={CYAN} icon="⚔️" delay={.15}/>
          <StatCard label="WIN RATE" value={`${wr}%`} color={INDIGO} icon="📈" delay={.2}/>
          <StatCard label="MVP" value={s.mvp_count||0} color={VIOLET} icon="⭐" delay={.25}/>
          <StatCard label="GAINS TOTAUX" value={`${s.total_earnings||0}`} sub="COINS" color={AMBER} icon="💎" delay={.3}/>
          <StatCard label="MEILLEURE POS." value={s.best_position?`#${s.best_position}`:"-"} color={GREEN} icon="🏅" delay={.35}/>
        </div>

        {/* PERFORMANCE BARS */}
        <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:.4}}
          style={{background:CARD,border:`1px solid ${cx(.09)}`,borderRadius:14,padding:"24px 24px",marginBottom:16}}>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:20}}>PERFORMANCE GLOBALE</p>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              ["Win Rate",wr,100,AMBER,"🏆"],
              ["Kills par match",Math.min(100,((s.kills||0)/Math.max(1,s.tournaments_played||1))*10),100,RED,"🎯"],
              ["Top 3 Rate",s.tournaments_played>0?Math.round(((s.top3_finishes||0)/s.tournaments_played)*100):0,100,GREEN,"🥉"],
              ["MVP Rate",s.tournaments_played>0?Math.round(((s.mvp_count||0)/s.tournaments_played)*100):0,100,VIOLET,"⭐"],
            ].map(([l,v,m,c,ico])=>(
              <div key={l}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontFamily:"Space Grotesk,sans-serif",fontSize:12,color:"rgba(255,255,255,.5)"}}>{ico} {l}</span>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:c}}>{Math.round(v)}%</span>
                </div>
                <Bar value={v} max={m} color={c}/>
              </div>
            ))}
          </div>
        </motion.div>
      </>)}

      {/* HISTORY TAB */}
      {tab==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {displayHistory.map((match,i)=>{
            const pos=match.position||"-";
            const isWin=pos===1;
            const isTop3=pos<=3;
            const posColor=pos===1?AMBER:pos===2?GREEN:pos===3?CYAN:INDIGO;
            const tn=match.tournament||{};
            return(
              <motion.div key={match.id} initial={{opacity:0,x:-14}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}
                style={{position:"relative",overflow:"hidden",background:CARD,border:`1px solid ${isWin?ax(.2):cx(.08)}`,borderRadius:14,padding:"18px 22px",
                  boxShadow:isWin?`0 0 20px ${ax(.1)}`:"0 4px 16px rgba(0,0,0,.4)"}}>
                {isWin&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${AMBER},transparent)`}}/>}
                <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                  <div style={{width:52,height:52,borderRadius:12,background:`${posColor}15`,border:`2px solid ${posColor}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:"Bebas Neue,cursive",fontSize:22,color:posColor,lineHeight:1}}>#{pos}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:4}}>{tn.name||"Tournoi"}</p>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>🕐 {tn.created_at?new Date(tn.created_at).toLocaleDateString("fr-FR"):"-"}</span>
                      {tn.game_type&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:cx(.5)}}>{tn.game_type}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:16,flexShrink:0}}>
                    <div style={{textAlign:"center"}}>
                      <p style={{fontFamily:"Bebas Neue,cursive",fontSize:20,color:RED,lineHeight:1}}>{match.kills||0}</p>
                      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.2)"}}>KILLS</p>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <p style={{fontFamily:"Bebas Neue,cursive",fontSize:20,color:match.prize_won>0?AMBER:"rgba(255,255,255,.2)",lineHeight:1}}>{match.prize_won||0}</p>
                      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.2)"}}>COINS</p>
                    </div>
                    <div style={{width:80,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
                      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,padding:"4px 10px",borderRadius:6,
                        background:isWin?ax(.1):isTop3?gx(.08):rx(.06),
                        color:isWin?AMBER:isTop3?GREEN:RED,
                        border:`1px solid ${isWin?ax(.2):isTop3?gx(.2):rx(.15)}`}}>
                        {isWin?"VICTOIRE":isTop3?"TOP 3":"DÉFAITE"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {displayHistory.length===0&&(
            <div style={{textAlign:"center",padding:"60px 0"}}>
              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUN MATCH JOUÉ</p>
            </div>
          )}
        </div>
      )}
    </div>
  </>);
}