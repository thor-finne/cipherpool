import { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`,gx=a=>`rgba(16,185,129,${a})`,rx=a=>`rgba(244,63,94,${a})`,ax=a=>`rgba(251,191,36,${a})`;

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

export default function TeamProfile(){
  const{id}=useParams();
  const{profile}=useOutletContext();
  const navigate=useNavigate();
  const[team,setTeam]=useState(null);
  const[members,setMembers]=useState([]);
  const[tournaments,setTournaments]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("members");
  const[myRole,setMyRole]=useState(null); // captain | co_captain | member | null
  const[showInvite,setShowInvite]=useState(false);
  const[inviteSearch,setInviteSearch]=useState("");
  const[inviteResults,setInviteResults]=useState([]);
  const[showEdit,setShowEdit]=useState(false);
  const[editForm,setEditForm]=useState({});
  const[saving,setSaving]=useState(false);

  useEffect(()=>{fetchTeam();},[id,profile?.id]);

  const fetchTeam=async()=>{
    setLoading(true);
    try{
      const{data:teamData}=await supabase
        .from("teams")
        .select(`*,captain:profiles!teams_captain_id_fkey(id,full_name,avatar_url,free_fire_id)`)
        .eq("id",id).single();
      if(!teamData){navigate("/teams");return;}
      setTeam(teamData);
      setEditForm({name:teamData.name,tag:teamData.tag,description:teamData.description||"",accent_color:teamData.accent_color||CYAN,is_open:teamData.is_open});

      const{data:membersData}=await supabase
        .from("team_members")
        .select(`*,profile:profiles!team_members_user_id_fkey(id,full_name,avatar_url,free_fire_id,level)`)
        .eq("team_id",id)
        .order("role",{ascending:true});
      setMembers(membersData||[]);

      if(profile?.id){
        const me=membersData?.find(m=>m.user_id===profile.id);
        setMyRole(me?.role||null);
      }

      const{data:tourData}=await supabase
        .from("team_tournaments")
        .select(`*,tournament:tournaments(name,background_color,mode,prize_coins)`)
        .eq("team_id",id)
        .order("joined_at",{ascending:false})
        .limit(10);
      setTournaments(tourData||[]);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const searchUsers=async(q)=>{
    if(!q.trim()){setInviteResults([]);return;}
    const{data}=await supabase
      .from("profiles")
      .select("id,full_name,avatar_url,free_fire_id,team_id")
      .ilike("full_name",`%${q}%`)
      .is("team_id",null)
      .neq("id",profile?.id)
      .limit(6);
    setInviteResults(data||[]);
  };

  const inviteUser=async(userId)=>{
    await supabase.from("team_invites").insert([{team_id:id,invited_by:profile.id,invited_user:userId}]);
    setInviteResults(prev=>prev.filter(u=>u.id!==userId));
  };

  const kickMember=async(userId)=>{
    if(!confirm("Expulser ce membre ?"))return;
    await supabase.from("team_members").delete().eq("team_id",id).eq("user_id",userId);
    await supabase.from("profiles").update({team_id:null}).eq("id",userId);
    fetchTeam();
  };

  const leaveTeam=async()=>{
    if(!confirm("Quitter cette équipe ?"))return;
    await supabase.rpc("leave_team",{p_team_id:id,p_user_id:profile.id});
    navigate("/teams");
  };

  const disbandTeam=async()=>{
    if(!confirm("DISSOUDRE l'équipe ? Cette action est irréversible."))return;
    await supabase.from("teams").update({status:"disbanded"}).eq("id",id);
    navigate("/teams");
  };

  const saveEdit=async()=>{
    setSaving(true);
    try{
      await supabase.from("teams").update({
        name:editForm.name,tag:editForm.tag.toUpperCase(),
        description:editForm.description,accent_color:editForm.accent_color,is_open:editForm.is_open
      }).eq("id",id);
      setShowEdit(false);fetchTeam();
    }catch(e){console.error(e);}
    finally{setSaving(false);}
  };

  const promoteCoCapt=async(userId)=>{
    await supabase.from("team_members").update({role:"co_captain"}).eq("team_id",id).eq("user_id",userId);
    fetchTeam();
  };

  const ac=team?.accent_color||CYAN;
  const isCaptain=myRole==="captain";
  const isCoCapt=myRole==="co_captain";
  const canManage=isCaptain||isCoCapt;

  if(loading)return(
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
        style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/>
    </div>
  );

  if(!team)return null;

  const wr=team.tournaments_played>0?Math.round((team.wins/team.tournaments_played)*100):0;

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .tp{font-family:Space Grotesk,sans-serif;color:rgba(255,255,255,.88);min-height:100vh;background:${BG}}
      .tp-in{background:${cx(.06)};border:1px solid ${cx(.18)};border-radius:9px;color:#fff;padding:10px 14px;font-family:Space Grotesk,sans-serif;font-size:13px;outline:none;transition:border .2s;width:100%}
      .tp-in:focus{border-color:${ac};box-shadow:0 0 10px ${ac}22}
      .tp-tab{background:none;border:none;cursor:pointer;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:2px;padding:12px 16px;transition:all .2s;white-space:nowrap}
      .mrow:hover{background:${cx(.04)};border-radius:8px}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${cx(.22)};border-radius:99px}
    `}</style>

    <div className="tp">
      {/* HERO BANNER */}
      <div style={{position:"relative",height:220,overflow:"hidden",background:`linear-gradient(135deg,${ac}20,${BG} 70%)`,borderBottom:`1px solid ${ac}20`}}>
        {team.banner_url&&<img src={team.banner_url} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.25}}/>}
        <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${ac}08 1px,transparent 1px),linear-gradient(90deg,${ac}08 1px,transparent 1px)`,backgroundSize:"50px 50px",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:100,background:`linear-gradient(to top,${BG},transparent)`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:16,right:16,display:"flex",gap:10}}>
          {canManage&&<motion.button whileHover={{scale:1.05}} onClick={()=>setShowEdit(true)}
            style={{padding:"8px 16px",borderRadius:9,background:cx(.08),border:`1px solid ${cx(.2)}`,color:CYAN,fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1.5,cursor:"pointer"}}>
            ✏️ MODIFIER
          </motion.button>}
          {myRole&&!isCaptain&&<motion.button whileHover={{scale:1.05}} onClick={leaveTeam}
            style={{padding:"8px 16px",borderRadius:9,background:rx(.08),border:`1px solid ${rx(.2)}`,color:RED,fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1.5,cursor:"pointer"}}>
            🚪 QUITTER
          </motion.button>}
          {isCaptain&&<motion.button whileHover={{scale:1.05}} onClick={disbandTeam}
            style={{padding:"8px 16px",borderRadius:9,background:rx(.08),border:`1px solid ${rx(.2)}`,color:RED,fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1.5,cursor:"pointer"}}>
            💀 DISSOUDRE
          </motion.button>}
        </div>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 32px"}}>
        {/* TEAM HEADER */}
        <div style={{display:"flex",alignItems:"flex-end",gap:22,marginTop:-60,paddingBottom:28,flexWrap:"wrap"}}>
          <motion.div initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:260,damping:22}}>
            {team.logo_url
              ?<img src={team.logo_url} style={{width:100,height:100,borderRadius:18,objectFit:"cover",border:`3px solid ${ac}`,boxShadow:`0 0 30px ${ac}40`}}/>
              :<div style={{width:100,height:100,borderRadius:18,background:`linear-gradient(135deg,${ac}30,${CARD})`,border:`3px solid ${ac}50`,boxShadow:`0 0 30px ${ac}30`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:34,color:ac}}>
                {team.tag}
              </div>}
          </motion.div>
          <motion.div initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:.1}} style={{flex:1,paddingBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
              <h1 style={{fontFamily:"Bebas Neue,cursive",fontSize:38,letterSpacing:3,margin:0,lineHeight:1,color:"#fff",textShadow:`0 0 30px ${ac}40`}}>{team.name}</h1>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:ac,background:`${ac}15`,border:`1px solid ${ac}30`,padding:"4px 12px",borderRadius:20}}>
                [{team.tag}]
              </span>
              {team.is_open&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:GREEN,background:gx(.1),border:`1px solid ${gx(.25)}`,padding:"4px 12px",borderRadius:20}}>✓ OUVERT</span>}
            </div>
            {team.description&&<p style={{color:"rgba(255,255,255,.4)",fontSize:13,marginBottom:8}}>{team.description}</p>}
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(255,255,255,.25)"}}>
              👑 {team.captain?.full_name} · {members.length}/{team.max_members} membres
            </p>
          </motion.div>
          {/* STATS */}
          <motion.div initial={{opacity:0,scale:.88}} animate={{opacity:1,scale:1}} transition={{delay:.15,type:"spring"}} style={{display:"flex",gap:12,flexShrink:0}}>
            {[[team.points||0,"POINTS",ac],[team.wins||0,"WINS",GREEN],[team.tournaments_played||0,"TOURNOIS",INDIGO]].map(([v,l,c])=>(
              <div key={l} style={{textAlign:"center",padding:"16px 20px",borderRadius:14,background:CARD,border:`1px solid ${c}20`,minWidth:80}}>
                <p style={{fontFamily:"Bebas Neue,cursive",fontSize:32,color:c,lineHeight:1,textShadow:`0 0 20px ${c}40`}}>{v}</p>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.25)",letterSpacing:1.5,marginTop:4}}>{l}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* TABS */}
        <div style={{borderBottom:`1px solid ${cx(.1)}`,display:"flex",gap:2,marginBottom:24,overflowX:"auto"}}>
          {[["members","👥 MEMBRES"],["stats","📊 STATISTIQUES"],["tournaments","🏆 TOURNOIS"]].map(([k,l])=>(
            <button key={k} className="tp-tab" onClick={()=>setTab(k)}
              style={{color:tab===k?"#fff":"rgba(255,255,255,.28)",borderBottom:`2px solid ${tab===k?ac:"transparent"}`,marginBottom:-1}}>
              {l}
            </button>
          ))}
          {canManage&&<button className="tp-tab" onClick={()=>setTab("manage")}
            style={{color:tab==="manage"?"#fff":"rgba(255,255,255,.28)",borderBottom:`2px solid ${tab==="manage"?AMBER:"transparent"}`,marginBottom:-1,marginLeft:"auto"}}>
            ⚙️ GESTION
          </button>}
        </div>

        <AnimatePresence mode="wait">

          {/* MEMBERS TAB */}
          {tab==="members"&&(
            <motion.div key="members" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                {members.map((m,i)=>{
                  const roleColor=m.role==="captain"?AMBER:m.role==="co_captain"?CYAN:INDIGO;
                  const roleLabel=m.role==="captain"?"👑 CAPITAINE":m.role==="co_captain"?"⭐ CO-CAPT":"🎮 MEMBRE";
                  const initials=m.profile?.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2)||"?";
                  return(
                    <motion.div key={m.id} initial={{opacity:0,scale:.92}} animate={{opacity:1,scale:1}} transition={{delay:i*.05}}>
                      <G ac={roleColor} style={{padding:"18px 20px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:14}}>
                          <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${roleColor}30,${CARD})`,border:`2px solid ${roleColor}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                            {m.profile?.avatar_url
                              ?<img src={m.profile.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              :<span style={{fontFamily:"Bebas Neue,cursive",fontSize:20,color:roleColor}}>{initials}</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.profile?.full_name}</p>
                            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:roleColor,background:`${roleColor}12`,padding:"2px 8px",borderRadius:6,border:`1px solid ${roleColor}25`}}>{roleLabel}</span>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"rgba(255,255,255,.4)"}}>FF: {m.profile?.free_fire_id||"—"}</p>
                            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.2)"}}>Lv.{m.profile?.level||1}</p>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                          {[[m.kills_in_team||0,"KILLS",CYAN],[m.wins_in_team||0,"WINS",GREEN]].map(([v,l,c])=>(
                            <div key={l} style={{textAlign:"center",padding:"7px",borderRadius:8,background:cx(.04),border:`1px solid ${cx(.07)}`}}>
                              <p style={{fontFamily:"Bebas Neue,cursive",fontSize:20,color:c,lineHeight:1}}>{v}</p>
                              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.2)",letterSpacing:1}}>{l}</p>
                            </div>
                          ))}
                        </div>
                      </G>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STATS TAB */}
          {tab==="stats"&&(
            <motion.div key="stats" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
                {[[team.points||0,"POINTS",ac,"🏅"],[team.wins||0,"VICTOIRES",GREEN,"🏆"],[team.losses||0,"DÉFAITES",RED,"💀"],
                  [team.tournaments_played||0,"TOURNOIS",INDIGO,"🎮"],[team.total_kills||0,"TOTAL KILLS",AMBER,"⚔️"],[`${wr}%`,"WIN RATE",CYAN,"📈"]].map(([v,l,c,ic],i)=>(
                  <motion.div key={l} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.07}}>
                    <G ac={c} style={{padding:"20px 18px",textAlign:"center"}}>
                      <div style={{position:"absolute",top:-16,right:-16,width:65,height:65,borderRadius:"50%",background:`radial-gradient(circle,${c}14,transparent)`,pointerEvents:"none"}}/>
                      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.2)",marginBottom:6,position:"relative"}}>{ic} {l}</p>
                      <p style={{fontFamily:"Bebas Neue,cursive",fontSize:36,color:c,textShadow:`0 0 24px ${c}40`,lineHeight:1,position:"relative"}}>{v}</p>
                    </G>
                  </motion.div>
                ))}
              </div>
              <G ac={ac} style={{padding:"22px 26px"}}>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:14}}>PERFORMANCE GLOBALE</p>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
                  <div>
                    <p style={{fontFamily:"Bebas Neue,cursive",fontSize:28,letterSpacing:2,color:ac,lineHeight:1}}>{wr}% WIN RATE</p>
                    <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(255,255,255,.3)",marginTop:4}}>{team.wins||0}V — {team.losses||0}D</p>
                  </div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"rgba(255,255,255,.3)",textAlign:"right"}}>
                    <p>Saison 1</p>
                    <p style={{color:ac,marginTop:4}}>{members.length} membres actifs</p>
                  </div>
                </div>
                <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:99,overflow:"hidden"}}>
                  <motion.div initial={{width:0}} animate={{width:`${wr}%`}} transition={{duration:1.6,ease:[.22,1,.36,1],delay:.3}}
                    style={{height:"100%",background:`linear-gradient(90deg,${GREEN},${ac})`,borderRadius:99,boxShadow:`0 0 14px ${gx(.4)}`}}/>
                </div>
              </G>
            </motion.div>
          )}

          {/* TOURNAMENTS TAB */}
          {tab==="tournaments"&&(
            <motion.div key="tournaments" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:16}}>
                HISTORIQUE DES TOURNOIS — {tournaments.length}
              </p>
              {tournaments.length===0
                ?<div style={{textAlign:"center",padding:"60px 0"}}><p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUN TOURNOI JOUÉ</p></div>
                :<div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {tournaments.map((tt,i)=>{
                    const posColor=tt.position===1?AMBER:tt.position<=3?CYAN:"rgba(255,255,255,.3)";
                    return(
                      <motion.div key={tt.id} initial={{opacity:0,x:-14}} animate={{opacity:1,x:0}} transition={{delay:i*.06}}>
                        <G ac={tt.tournament?.background_color||CYAN} style={{padding:"16px 22px",display:"flex",alignItems:"center",gap:18}}>
                          <div style={{textAlign:"center",minWidth:48,flexShrink:0}}>
                            <p style={{fontFamily:"Bebas Neue,cursive",fontSize:28,color:posColor,lineHeight:1}}>
                              {tt.position?`#${tt.position}`:"—"}
                            </p>
                          </div>
                          <div style={{flex:1}}>
                            <p style={{fontSize:14,fontWeight:600,color:"rgba(255,255,255,.88)",marginBottom:3}}>{tt.tournament?.name||"Tournoi"}</p>
                            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)"}}>{tt.tournament?.mode?.toUpperCase()}</p>
                          </div>
                          {[[tt.kills||0,"KILLS",AMBER],[tt.prize_won||0,"COINS",CYAN]].map(([v,l,c])=>(
                            <div key={l} style={{textAlign:"center",minWidth:60,flexShrink:0}}>
                              <p style={{fontFamily:"Bebas Neue,cursive",fontSize:22,color:c,lineHeight:1}}>{v}</p>
                              <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.25)",letterSpacing:1}}>{l}</p>
                            </div>
                          ))}
                        </G>
                      </motion.div>
                    );
                  })}
                </div>}
            </motion.div>
          )}

          {/* MANAGE TAB */}
          {tab==="manage"&&canManage&&(
            <motion.div key="manage" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {/* Invite */}
                <G ac={CYAN} style={{padding:"22px"}}>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:14}}>📨 INVITER UN JOUEUR</p>
                  <input className="tp-in" value={inviteSearch} onChange={e=>{setInviteSearch(e.target.value);searchUsers(e.target.value);}} placeholder="Rechercher un joueur..." style={{marginBottom:12}}/>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {inviteResults.map(u=>(
                      <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:9,background:cx(.04),border:`1px solid ${cx(.08)}`}}>
                        <div style={{width:32,height:32,borderRadius:9,background:cx(.1),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:14,color:CYAN,flexShrink:0}}>
                          {u.full_name?.charAt(0)||"?"}
                        </div>
                        <div style={{flex:1}}>
                          <p style={{fontSize:13,fontWeight:600,color:"#fff"}}>{u.full_name}</p>
                          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)"}}>FF: {u.free_fire_id||"—"}</p>
                        </div>
                        <motion.button whileHover={{scale:1.05}} onClick={()=>inviteUser(u.id)}
                          style={{padding:"6px 14px",borderRadius:7,background:cx(.1),border:`1px solid ${cx(.25)}`,color:CYAN,fontFamily:"JetBrains Mono,monospace",fontSize:9,cursor:"pointer"}}>
                          INVITER
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </G>

                {/* Members management */}
                <G ac={AMBER} style={{padding:"22px"}}>
                  <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.22)",marginBottom:14}}>⚙️ GESTION DES MEMBRES</p>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {members.filter(m=>m.user_id!==profile?.id&&m.role!=="captain").map(m=>(
                      <div key={m.id} className="mrow" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 8px",transition:"background .15s"}}>
                        <div style={{width:32,height:32,borderRadius:9,background:cx(.1),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Bebas Neue,cursive",fontSize:14,color:CYAN,flexShrink:0,overflow:"hidden"}}>
                          {m.profile?.avatar_url?<img src={m.profile.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:m.profile?.full_name?.charAt(0)||"?"}
                        </div>
                        <p style={{flex:1,fontSize:13,color:"rgba(255,255,255,.7)"}}>{m.profile?.full_name}</p>
                        {isCaptain&&m.role==="member"&&<motion.button whileHover={{scale:1.05}} onClick={()=>promoteCoCapt(m.user_id)}
                          style={{padding:"5px 10px",borderRadius:6,background:`${AMBER}12`,border:`1px solid ${AMBER}25`,color:AMBER,fontFamily:"JetBrains Mono,monospace",fontSize:8,cursor:"pointer"}}>
                          ⭐ CO-CAPT
                        </motion.button>}
                        <motion.button whileHover={{scale:1.05}} onClick={()=>kickMember(m.user_id)}
                          style={{padding:"5px 10px",borderRadius:6,background:rx(.1),border:`1px solid ${rx(.25)}`,color:RED,fontFamily:"JetBrains Mono,monospace",fontSize:8,cursor:"pointer"}}>
                          KICK
                        </motion.button>
                      </div>
                    ))}
                    {members.filter(m=>m.user_id!==profile?.id&&m.role!=="captain").length===0&&
                      <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(255,255,255,.2)",textAlign:"center",padding:"20px 0"}}>Vous êtes seul</p>}
                  </div>
                </G>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>

    {/* EDIT MODAL */}
    <AnimatePresence>
      {showEdit&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{position:"fixed",inset:0,background:"rgba(2,8,23,.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)setShowEdit(false);}}>
          <motion.div initial={{scale:.88,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.88,opacity:0}}
            style={{width:"100%",maxWidth:480,background:CARD,border:`1px solid ${ac}25`,borderRadius:18,padding:"28px",boxShadow:`0 24px 80px rgba(0,0,0,.7)`}}>
            <h2 style={{fontFamily:"Bebas Neue,cursive",fontSize:26,letterSpacing:2,color:"#fff",margin:"0 0 20px"}}>MODIFIER L'ÉQUIPE</h2>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginBottom:6}}>NOM</p>
                <input className="tp-in" value={editForm.name||""} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div>
                <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginBottom:6}}>DESCRIPTION</p>
                <textarea className="tp-in" value={editForm.description||""} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={3} style={{resize:"none"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div onClick={()=>setEditForm(f=>({...f,is_open:!f.is_open}))}
                  style={{width:42,height:24,borderRadius:12,background:editForm.is_open?GREEN:"rgba(255,255,255,.1)",cursor:"pointer",position:"relative",transition:"background .2s"}}>
                  <motion.div animate={{x:editForm.is_open?20:2}} transition={{type:"spring",stiffness:500,damping:30}}
                    style={{position:"absolute",top:3,width:18,height:18,borderRadius:"50%",background:"#fff"}}/>
                </div>
                <p style={{fontFamily:"Space Grotesk,sans-serif",fontSize:13,color:"rgba(255,255,255,.55)"}}>{editForm.is_open?"Ouvert":"Fermé"}</p>
              </div>
              <div style={{display:"flex",gap:10,marginTop:6}}>
                <motion.button whileHover={{scale:1.02}} onClick={()=>setShowEdit(false)}
                  style={{flex:1,padding:"11px",borderRadius:10,background:cx(.08),border:`1px solid ${cx(.18)}`,color:CYAN,fontFamily:"JetBrains Mono,monospace",fontSize:10,cursor:"pointer"}}>
                  ANNULER
                </motion.button>
                <motion.button whileHover={{scale:1.02}} onClick={saveEdit} disabled={saving}
                  style={{flex:1,padding:"11px",borderRadius:10,background:`linear-gradient(135deg,${ac},${INDIGO})`,border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                  {saving?"...":"💾 SAUVEGARDER"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>);
}