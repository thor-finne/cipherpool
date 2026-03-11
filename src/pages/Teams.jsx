import { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`,gx=a=>`rgba(16,185,129,${a})`,rx=a=>`rgba(244,63,94,${a})`,vx=a=>`rgba(167,139,250,${a})`;

function G({children,style,ac,onClick}){
  const[h,setH]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{position:"relative",overflow:"hidden",background:CARD,border:`1px solid ${h&&ac?ac+"40":cx(.1)}`,
        borderRadius:14,boxShadow:h&&ac?`0 0 0 1px ${ac}15,0 8px 32px rgba(0,0,0,.5)`:`0 4px 20px rgba(0,0,0,.4)`,
        transition:"all .22s",cursor:onClick?"pointer":"default",...style}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${ac||cx(.3)},transparent)`,opacity:h?1:.3,transition:"opacity .22s",pointerEvents:"none"}}/>
      {children}
    </div>
  );
}

function HeroBg(){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    const ctx=c.getContext("2d");let raf,t=0;
    const resize=()=>{c.width=c.offsetWidth;c.height=c.offsetHeight;};resize();
    const ro=new ResizeObserver(resize);ro.observe(c);
    const orbs=[{cx:.1,cy:.5,r:.5,vx:.0008,vy:.0005,color:[0,212,255],a:.07},{cx:.85,cy:.3,r:.4,vx:-.0006,vy:.0007,color:[129,140,248],a:.05},{cx:.5,cy:.9,r:.35,vx:.0005,vy:-.0007,color:[167,139,250],a:.04}];
    const draw=()=>{t++;ctx.clearRect(0,0,c.width,c.height);
      orbs.forEach(o=>{o.cx+=o.vx*Math.sin(t*.008);o.cy+=o.vy*Math.cos(t*.006);
        if(o.cx<-.1||o.cx>1.1)o.vx*=-1;if(o.cy<-.1||o.cy>1.1)o.vy*=-1;
        const x=o.cx*c.width,y=o.cy*c.height,r=o.r*Math.max(c.width,c.height)*(1+.06*Math.sin(t*.012)),a=o.a*(1+.12*Math.sin(t*.018)),[R,Gr,B]=o.color;
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,`rgba(${R},${Gr},${B},${a})`);g.addColorStop(.5,`rgba(${R},${Gr},${B},${a*.3})`);g.addColorStop(1,`rgba(${R},${Gr},${B},0)`);
        ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);});
      raf=requestAnimationFrame(draw);};draw();
    return()=>{cancelAnimationFrame(raf);ro.disconnect();};
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

const COLORS=["#00d4ff","#818cf8","#a78bfa","#10b981","#f43f5e","#fbbf24","#f97316","#ec4899"];

export default function Teams(){
  const{profile}=useOutletContext();
  const navigate=useNavigate();
  const[teams,setTeams]=useState([]);
  const[myTeam,setMyTeam]=useState(null);
  const[tab,setTab]=useState("all"); // all | my | invites
  const[loading,setLoading]=useState(true);
  const[showCreate,setShowCreate]=useState(false);
  const[showJoin,setShowJoin]=useState(false);
  const[invites,setInvites]=useState([]);
  const[search,setSearch]=useState("");
  const[creating,setCreating]=useState(false);
  const[form,setForm]=useState({name:"",tag:"",description:"",accent_color:COLORS[0],is_open:true});
  const[joinTag,setJoinTag]=useState("");
  const[joining,setJoining]=useState(false);
  const[err,setErr]=useState("");

  useEffect(()=>{fetchAll();},[profile?.id]);

  const fetchAll=async()=>{
    setLoading(true);
    try{
      // All teams with member count
      const{data:teamsData}=await supabase
        .from("teams")
        .select(`*,captain:profiles!teams_captain_id_fkey(full_name,avatar_url),team_members(id)`)
        .eq("status","active")
        .order("points",{ascending:false});
      setTeams(teamsData||[]);

      if(profile?.id){
        // My team
        const{data:memberData}=await supabase
          .from("team_members")
          .select(`team:teams(*)`)
          .eq("user_id",profile.id)
          .maybeSingle();
        setMyTeam(memberData?.team||null);

        // Invites
        const{data:invData}=await supabase
          .from("team_invites")
          .select(`*,team:teams(name,tag,logo_url,accent_color),inviter:profiles!team_invites_invited_by_fkey(full_name)`)
          .eq("invited_user",profile.id)
          .eq("status","pending");
        setInvites(invData||[]);
      }
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const createTeam=async()=>{
    if(!form.name.trim()||!form.tag.trim()){setErr("Nom et TAG obligatoires");return;}
    if(form.tag.length>6){setErr("TAG max 6 caractères");return;}
    if(myTeam){setErr("Vous êtes déjà dans une équipe");return;}
    setCreating(true);setErr("");
    try{
      // Use SECURITY DEFINER function to bypass RLS
      const{data,error}=await supabase.rpc("create_team",{
        p_name:        form.name.trim(),
        p_tag:         form.tag.trim().toUpperCase(),
        p_description: form.description,
        p_accent_color:form.accent_color,
        p_is_open:     form.is_open,
        p_captain_id:  profile.id,
      });
      if(error)throw error;
      if(!data?.success)throw new Error(data?.error||"Erreur création équipe");
      setShowCreate(false);
      setForm({name:"",tag:"",description:"",accent_color:COLORS[0],is_open:true});
      await fetchAll();
      navigate(`/teams/${data.team_id}`);
    }catch(e){setErr(e.message);}
    finally{setCreating(false);}
  };

  const joinByTag=async()=>{
    if(!joinTag.trim()){return;}
    setJoining(true);setErr("");
    try{
      const{data:team,error}=await supabase.from("teams").select("*").eq("tag",joinTag.trim().toUpperCase()).eq("status","active").single();
      if(error||!team){setErr("Équipe introuvable");setJoining(false);return;}
      if(!team.is_open){setErr("Cette équipe n'accepte pas de membres");setJoining(false);return;}
      if(myTeam){setErr("Vous êtes déjà dans une équipe");setJoining(false);return;}
      // Check members count
      const{count}=await supabase.from("team_members").select("id",{count:"exact"}).eq("team_id",team.id);
      if(count>=team.max_members){setErr("Équipe complète");setJoining(false);return;}
      // Send invite request (or direct join if open)
      const{error:invErr}=await supabase.from("team_invites").insert([{team_id:team.id,invited_by:team.captain_id,invited_user:profile.id}]);
      if(invErr&&invErr.code==="23505"){setErr("Demande déjà envoyée");}
      else if(invErr){throw invErr;}
      else{setShowJoin(false);setJoinTag("");}
      await fetchAll();
    }catch(e){setErr(e.message);}
    finally{setJoining(false);}
  };

  const acceptInvite=async(inviteId)=>{
    await supabase.rpc("accept_team_invite",{p_invite_id:inviteId});
    await fetchAll();
  };

  const rejectInvite=async(inviteId)=>{
    await supabase.from("team_invites").update({status:"rejected"}).eq("id",inviteId);
    await fetchAll();
  };

  const filtered=teams.filter(t=>
    t.name.toLowerCase().includes(search.toLowerCase())||
    t.tag.toLowerCase().includes(search.toLowerCase())
  );

  if(loading)return(
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
        style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/>
    </div>
  );

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .tm{font-family:Space Grotesk,sans-serif;color:rgba(255,255,255,.88);min-height:100vh;background:${BG}}
      .tm-in{background:${cx(.06)};border:1px solid ${cx(.18)};border-radius:9px;color:#fff;padding:10px 14px;font-family:Space Grotesk,sans-serif;font-size:13px;outline:none;transition:border .2s;width:100%}
      .tm-in:focus{border-color:${CYAN};box-shadow:0 0 10px ${cx(.15)}}
      .tm-btn{background:none;border:none;cursor:pointer;font-family:Space Grotesk,sans-serif;transition:all .18s}
      .tm-card:hover{transform:translateY(-4px)}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${cx(.22)};border-radius:99px}
    `}</style>

    <div className="tm" style={{padding:"32px"}}>

      {/* HERO */}
      <div style={{position:"relative",overflow:"hidden",borderRadius:18,background:`linear-gradient(135deg,${cx(.08)},${CARD})`,border:`1px solid ${cx(.12)}`,padding:"36px 40px",marginBottom:28}}>
        <HeroBg/>
        <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:3,color:cx(.5),marginBottom:8}}>👥 SYSTÈME D'ÉQUIPES</p>
            <h1 style={{fontFamily:"Bebas Neue,cursive",fontSize:48,letterSpacing:3,margin:0,lineHeight:1,color:"#fff"}}>
              ÉQUIPES <span style={{color:CYAN}}>ESPORT</span>
            </h1>
            <p style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:8,fontFamily:"Space Grotesk,sans-serif"}}>
              {teams.length} équipes actives · Saison 1
            </p>
          </div>
          <div style={{display:"flex",gap:10}}>
            {!myTeam&&<>
              <motion.button whileHover={{scale:1.04}} whileTap={{scale:.97}}
                onClick={()=>{setShowJoin(true);setErr("");}}
                style={{padding:"11px 22px",borderRadius:11,background:cx(.1),border:`1px solid ${cx(.25)}`,color:CYAN,fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:1.5,cursor:"pointer"}}>
                🔍 REJOINDRE
              </motion.button>
              <motion.button whileHover={{scale:1.04}} whileTap={{scale:.97}}
                onClick={()=>{setShowCreate(true);setErr("");}}
                style={{padding:"11px 22px",borderRadius:11,background:`linear-gradient(135deg,${CYAN},${INDIGO})`,border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:1.5,cursor:"pointer",fontWeight:700}}>
                ➕ CRÉER
              </motion.button>
            </>}
            {myTeam&&<motion.button whileHover={{scale:1.04}} whileTap={{scale:.97}}
              onClick={()=>navigate(`/teams/${myTeam.id}`)}
              style={{padding:"11px 22px",borderRadius:11,background:`linear-gradient(135deg,${CYAN},${INDIGO})`,border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:1.5,cursor:"pointer",fontWeight:700}}>
              🛡️ MON ÉQUIPE
            </motion.button>}
          </div>
        </div>
      </div>

      {/* MY TEAM BANNER */}
      {myTeam&&(
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
          onClick={()=>navigate(`/teams/${myTeam.id}`)}
          style={{marginBottom:20,padding:"16px 24px",borderRadius:12,background:`linear-gradient(135deg,${myTeam.accent_color||CYAN}15,${CARD})`,border:`1px solid ${myTeam.accent_color||CYAN}30`,cursor:"pointer",display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:42,height:42,borderRadius:12,background:`linear-gradient(135deg,${myTeam.accent_color||CYAN},${CARD})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:18,color:"#fff",flexShrink:0}}>
            {myTeam.tag}
          </div>
          <div style={{flex:1}}>
            <p style={{fontFamily:"Bebas Neue,cursive",fontSize:18,letterSpacing:2,color:"#fff",marginBottom:2}}>{myTeam.name}</p>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1}}>MON ÉQUIPE · CLIQUEZ POUR VOIR LE PROFIL</p>
          </div>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:myTeam.accent_color||CYAN}}>→</span>
        </motion.div>
      )}

      {/* INVITES */}
      {invites.length>0&&(
        <div style={{marginBottom:20}}>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:12}}>📨 INVITATIONS EN ATTENTE — {invites.length}</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {invites.map(inv=>(
              <motion.div key={inv.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
                style={{padding:"14px 20px",borderRadius:12,background:`linear-gradient(135deg,${AMBER}10,${CARD})`,border:`1px solid ${AMBER}25`,display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${inv.team?.accent_color||CYAN},${CARD})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:13,color:"#fff",flexShrink:0}}>
                  {inv.team?.tag}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:2}}>{inv.team?.name}</p>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)"}}>Invité par {inv.inviter?.full_name}</p>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <motion.button whileHover={{scale:1.05}} onClick={()=>acceptInvite(inv.id)}
                    style={{padding:"7px 16px",borderRadius:8,background:gx(.15),border:`1px solid ${gx(.3)}`,color:GREEN,fontFamily:"JetBrains Mono,monospace",fontSize:10,cursor:"pointer"}}>
                    ✓ ACCEPTER
                  </motion.button>
                  <motion.button whileHover={{scale:1.05}} onClick={()=>rejectInvite(inv.id)}
                    style={{padding:"7px 16px",borderRadius:8,background:rx(.1),border:`1px solid ${rx(.25)}`,color:RED,fontFamily:"JetBrains Mono,monospace",fontSize:10,cursor:"pointer"}}>
                    ✕
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TABS + SEARCH */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:4,background:cx(.04),borderRadius:10,padding:4}}>
          {[["all","TOUTES"],["ranking","CLASSEMENT"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:1.5,
                background:tab===k?`linear-gradient(135deg,${CYAN},${INDIGO})`:"transparent",
                color:tab===k?"#000":"rgba(255,255,255,.4)",fontWeight:tab===k?700:400,transition:"all .2s"}}>
              {l}
            </button>
          ))}
        </div>
        <input className="tm-in" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Rechercher une équipe..." style={{width:260,padding:"9px 14px"}}/>
      </div>

      {/* TEAMS GRID */}
      {tab==="all"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {filtered.map((team,i)=>(
            <motion.div key={team.id} className="tm-card" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}
              onClick={()=>navigate(`/teams/${team.id}`)}
              style={{transition:"transform .2s",cursor:"pointer"}}>
              <G ac={team.accent_color||CYAN} style={{padding:"20px 22px"}}>
                <div style={{position:"absolute",top:0,right:0,width:80,height:80,borderRadius:"50%",background:`radial-gradient(circle,${team.accent_color||CYAN}12,transparent)`,pointerEvents:"none"}}/>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,position:"relative"}}>
                  {team.logo_url
                    ?<img src={team.logo_url} style={{width:48,height:48,borderRadius:12,objectFit:"cover",border:`2px solid ${team.accent_color||CYAN}40`}}/>
                    :<div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${team.accent_color||CYAN}30,${CARD})`,border:`2px solid ${team.accent_color||CYAN}40`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:20,color:team.accent_color||CYAN,flexShrink:0}}>
                      {team.tag}
                    </div>}
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:"Bebas Neue,cursive",fontSize:20,letterSpacing:2,color:"#fff",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team.name}</p>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:team.accent_color||CYAN,background:`${team.accent_color||CYAN}15`,padding:"2px 8px",borderRadius:6,border:`1px solid ${team.accent_color||CYAN}25`}}>
                        [{team.tag}]
                      </span>
                      {team.is_open&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:GREEN,background:gx(.08),padding:"2px 8px",borderRadius:6,border:`1px solid ${gx(.2)}`}}>OUVERT</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                  {[[team.points||0,"PTS",CYAN],[team.wins||0,"WINS",GREEN],[team.team_members?.length||0,"MBR",INDIGO]].map(([v,l,c])=>(
                    <div key={l} style={{textAlign:"center",padding:"8px 4px",borderRadius:8,background:cx(.04),border:`1px solid ${cx(.07)}`}}>
                      <p style={{fontFamily:"Bebas Neue,cursive",fontSize:22,color:c,lineHeight:1}}>{v}</p>
                      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.25)",letterSpacing:1}}>{l}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>
                    CAP: {team.captain?.full_name?.split(" ")[0]||"—"}
                  </p>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:team.accent_color||CYAN}}>VOIR → </p>
                </div>
              </G>
            </motion.div>
          ))}
          {filtered.length===0&&(
            <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 0"}}>
              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUNE ÉQUIPE TROUVÉE</p>
            </div>
          )}
        </div>
      )}

      {/* RANKING */}
      {tab==="ranking"&&(
        <G style={{overflow:"hidden"}}>
          <div style={{padding:"16px 22px 12px",borderBottom:`1px solid ${cx(.08)}`}}>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)"}}>🏆 CLASSEMENT DES ÉQUIPES — SAISON 1</p>
          </div>
          {teams.map((team,i)=>{
            const rankColor=i===0?AMBER:i===1?"#94a3b8":i===2?"#cd7f32":undefined;
            return(
              <motion.div key={team.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*.04}}
                onClick={()=>navigate(`/teams/${team.id}`)}
                style={{display:"flex",alignItems:"center",padding:"14px 22px",borderBottom:i<teams.length-1?`1px solid ${cx(.06)}`:"none",cursor:"pointer",transition:"background .15s",gap:16}}
                onMouseEnter={e=>e.currentTarget.style.background=cx(.03)} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:36,textAlign:"center",flexShrink:0}}>
                  {i<3?<span style={{fontSize:18}}>{["🥇","🥈","🥉"][i]}</span>
                    :<span style={{fontFamily:"Bebas Neue,cursive",fontSize:20,color:"rgba(255,255,255,.25)"}}>#{i+1}</span>}
                </div>
                <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${team.accent_color||CYAN}30,${CARD})`,border:`1px solid ${team.accent_color||CYAN}30`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:14,color:team.accent_color||CYAN,flexShrink:0}}>
                  {team.tag}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontFamily:"Bebas Neue,cursive",fontSize:18,letterSpacing:1,color:rankColor||"#fff",marginBottom:2}}>{team.name}</p>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>
                    {team.team_members?.length||0} membres · CAP: {team.captain?.full_name?.split(" ")[0]||"—"}
                  </p>
                </div>
                {[[team.points||0,"PTS",CYAN],[team.wins||0,"WINS",GREEN],[team.tournaments_played||0,"TOURNOIS",INDIGO]].map(([v,l,c])=>(
                  <div key={l} style={{textAlign:"center",minWidth:52,flexShrink:0}}>
                    <p style={{fontFamily:"Bebas Neue,cursive",fontSize:22,color:c,lineHeight:1}}>{v}</p>
                    <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.25)",letterSpacing:1}}>{l}</p>
                  </div>
                ))}
              </motion.div>
            );
          })}
        </G>
      )}
    </div>

    {/* ═══ MODAL CREATE ═══ */}
    <AnimatePresence>
      {showCreate&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{position:"fixed",inset:0,background:"rgba(2,8,23,.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}>
          <motion.div initial={{scale:.88,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.88,opacity:0}}
            style={{width:"100%",maxWidth:520,background:CARD,border:`1px solid ${cx(.18)}`,borderRadius:18,overflow:"hidden",boxShadow:`0 24px 80px rgba(0,0,0,.7)`}}>
            <div style={{padding:"22px 28px",borderBottom:`1px solid ${cx(.08)}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:cx(.4),marginBottom:4}}>NOUVELLE ÉQUIPE</p>
                <h2 style={{fontFamily:"Bebas Neue,cursive",fontSize:26,letterSpacing:2,color:"#fff",margin:0}}>CRÉER MON ÉQUIPE</h2>
              </div>
              <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{padding:"24px 28px",display:"flex",flexDirection:"column",gap:16}}>
              {err&&<div style={{padding:"10px 14px",borderRadius:9,background:rx(.1),border:`1px solid ${rx(.25)}`,color:RED,fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{err}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12}}>
                <div>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginBottom:6}}>NOM DE L'ÉQUIPE *</p>
                  <input className="tm-in" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="CipherPool Esport"/>
                </div>
                <div>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginBottom:6}}>TAG * (max 6)</p>
                  <input className="tm-in" value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value.toUpperCase()}))} placeholder="CPL" style={{width:90,textAlign:"center",letterSpacing:2,fontFamily:"Bebas Neue,cursive",fontSize:16}}/>
                </div>
              </div>
              <div>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginBottom:6}}>DESCRIPTION</p>
                <textarea className="tm-in" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Décrivez votre équipe..." rows={3} style={{resize:"none"}}/>
              </div>
              <div>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginBottom:8}}>COULEUR DE L'ÉQUIPE</p>
                <div style={{display:"flex",gap:8}}>
                  {COLORS.map(c=>(
                    <motion.button key={c} whileHover={{scale:1.15}} onClick={()=>setForm(f=>({...f,accent_color:c}))}
                      style={{width:30,height:30,borderRadius:8,background:c,border:form.accent_color===c?`3px solid #fff`:`2px solid transparent`,cursor:"pointer",outline:"none"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div onClick={()=>setForm(f=>({...f,is_open:!f.is_open}))}
                  style={{width:42,height:24,borderRadius:12,background:form.is_open?GREEN:"rgba(255,255,255,.1)",cursor:"pointer",position:"relative",transition:"background .2s"}}>
                  <motion.div animate={{x:form.is_open?20:2}} transition={{type:"spring",stiffness:500,damping:30}}
                    style={{position:"absolute",top:3,width:18,height:18,borderRadius:"50%",background:"#fff"}}/>
                </div>
                <p style={{fontFamily:"Space Grotesk,sans-serif",fontSize:13,color:"rgba(255,255,255,.55)"}}>
                  {form.is_open?"Équipe ouverte aux nouveaux membres":"Équipe fermée"}
                </p>
              </div>
              {/* Preview */}
              <div style={{padding:"12px 16px",borderRadius:10,background:cx(.04),border:`1px solid ${cx(.08)}`,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${form.accent_color}40,${CARD})`,border:`2px solid ${form.accent_color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:16,color:form.accent_color}}>
                  {form.tag||"TAG"}
                </div>
                <div>
                  <p style={{fontFamily:"Bebas Neue,cursive",fontSize:16,letterSpacing:2,color:"#fff"}}>{form.name||"Nom de l'équipe"}</p>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:form.accent_color}}>CAP: {profile?.full_name?.split(" ")[0]}</p>
                </div>
              </div>
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}} onClick={createTeam} disabled={creating}
                style={{padding:"13px",borderRadius:11,background:`linear-gradient(135deg,${CYAN},${INDIGO})`,border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:11,letterSpacing:2,fontWeight:700,cursor:"pointer"}}>
                {creating?"CRÉATION...":"🛡️ CRÉER L'ÉQUIPE"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ═══ MODAL JOIN ═══ */}
    <AnimatePresence>
      {showJoin&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{position:"fixed",inset:0,background:"rgba(2,8,23,.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)setShowJoin(false);}}>
          <motion.div initial={{scale:.88,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.88,opacity:0}}
            style={{width:"100%",maxWidth:400,background:CARD,border:`1px solid ${cx(.18)}`,borderRadius:18,padding:"28px",boxShadow:`0 24px 80px rgba(0,0,0,.7)`}}>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:cx(.4),marginBottom:4}}>REJOINDRE</p>
            <h2 style={{fontFamily:"Bebas Neue,cursive",fontSize:28,letterSpacing:2,color:"#fff",margin:"0 0 20px"}}>ENTRER LE TAG</h2>
            {err&&<div style={{padding:"10px 14px",borderRadius:9,background:rx(.1),border:`1px solid ${rx(.25)}`,color:RED,fontFamily:"JetBrains Mono,monospace",fontSize:11,marginBottom:14}}>{err}</div>}
            <input className="tm-in" value={joinTag} onChange={e=>setJoinTag(e.target.value.toUpperCase())}
              placeholder="CPL" style={{textAlign:"center",letterSpacing:4,fontFamily:"Bebas Neue,cursive",fontSize:24,marginBottom:14}}
              onKeyDown={e=>e.key==="Enter"&&joinByTag()}/>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)",textAlign:"center",marginBottom:16}}>Entrez le TAG de l'équipe (ex: CPL, GHX...)</p>
            <div style={{display:"flex",gap:10}}>
              <motion.button whileHover={{scale:1.03}} onClick={()=>setShowJoin(false)}
                style={{flex:1,padding:"11px",borderRadius:10,background:cx(.08),border:`1px solid ${cx(.18)}`,color:CYAN,fontFamily:"JetBrains Mono,monospace",fontSize:10,cursor:"pointer"}}>
                ANNULER
              </motion.button>
              <motion.button whileHover={{scale:1.03}} onClick={joinByTag} disabled={joining}
                style={{flex:1,padding:"11px",borderRadius:10,background:`linear-gradient(135deg,${CYAN},${INDIGO})`,border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                {joining?"...":"🔍 REJOINDRE"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>);
}