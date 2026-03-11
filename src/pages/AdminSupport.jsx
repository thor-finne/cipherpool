import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   CIPHERPOOL — ADMIN SUPPORT
   Super Admin: voir tickets + accepter demandes profil
   + planifier ouverture/fermeture automatique du site
   ═══════════════════════════════════════════════════════ */
const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`,rx=a=>`rgba(244,63,94,${a})`,gx=a=>`rgba(16,185,129,${a})`,ax=a=>`rgba(251,191,36,${a})`;

function G({children,style,ac}){const[h,setH]=useState(false);return(<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{position:"relative",overflow:"hidden",background:CARD,border:`1px solid ${h&&ac?ac+"35":cx(.1)}`,borderRadius:14,boxShadow:`0 4px 20px rgba(0,0,0,.4)`,transition:"border .22s",...style}}><div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${ac||cx(.3)},transparent)`,opacity:h?1:.3,transition:"opacity .22s",pointerEvents:"none"}}/>{children}</div>);}

export default function AdminSupport(){
  const{profile}=useOutletContext();
  const[tickets,setTickets]=useState([]);
  const[selected,setSelected]=useState(null);
  const[messages,setMessages]=useState([]);
  const[newMsg,setNewMsg]=useState("");
  const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState("open");
  const[tab,setTab]=useState("tickets");
  // Schedule modal
  const[showSchedule,setShowSchedule]=useState(false);
  const[scheduleTicket,setScheduleTicket]=useState(null);
  const[schedDate,setSchedDate]=useState("");
  const[schedTime,setSchedTime]=useState("");
  const[schedDuration,setSchedDuration]=useState(60);
  const[saving,setSaving]=useState(false);
  const[schedules,setSchedules]=useState([]);
  const bottomRef=useRef(null);

  const isSuperAdmin=profile?.role==="super_admin";
  const isAdmin=["admin","super_admin"].includes(profile?.role);

  useEffect(()=>{
    if(!isAdmin)return;
    fetchTickets();fetchSchedules();
    const ch=supabase.channel("admin_support_ch")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"support_tickets"},()=>fetchTickets())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"support_tickets"},()=>fetchTickets())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages"},p=>{
        if(selected&&p.new.ticket_id===selected.id)fetchMessages(selected.id);
      })
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[isAdmin]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const fetchTickets=async()=>{
    const{data}=await supabase.from("support_tickets")
      .select(`*,user:profiles!support_tickets_user_id_fkey(id,full_name,email,free_fire_id,role,level,created_at,verification_status),assigned_to:profiles!support_tickets_assigned_to_fkey(id,full_name,role)`)
      .order("created_at",{ascending:false});
    setTickets(data||[]);setLoading(false);
  };

  const fetchMessages=async(id)=>{
    const{data}=await supabase.from("support_messages")
      .select(`*,sender:profiles!support_messages_sender_id_fkey(id,full_name,role)`)
      .eq("ticket_id",id).order("created_at",{ascending:true});
    setMessages(data||[]);
  };

  const fetchSchedules=async()=>{
    const{data}=await supabase.from("site_schedule")
      .select("*").order("open_at",{ascending:true});
    setSchedules(data||[]);
  };

  const assignToMe=async()=>{
    if(!selected)return;
    await supabase.from("support_tickets").update({assigned_to:profile?.id,status:"pending"}).eq("id",selected.id);
    fetchTickets();setSelected({...selected,assigned_to:profile,status:"pending"});
  };

  const sendReply=async()=>{
    if(!newMsg.trim()||!selected)return;
    await supabase.from("support_messages").insert([{ticket_id:selected.id,sender_id:profile?.id,message:newMsg.trim()}]);
    await supabase.from("support_tickets").update({status:"answered"}).eq("id",selected.id);
    setNewMsg("");fetchMessages(selected.id);fetchTickets();
  };

  const closeTicket=async()=>{
    if(!selected)return;
    await supabase.from("support_tickets").update({status:"closed"}).eq("id",selected.id);
    fetchTickets();setSelected(null);setMessages([]);
  };

  // Accept profile edit request → open schedule modal
  const acceptEditRequest=async(ticket)=>{
    // Mark ticket as in-progress
    await supabase.from("support_tickets").update({status:"pending",assigned_to:profile?.id}).eq("id",ticket.id);
    fetchTickets();
    // Prefill today + now
    const now=new Date();
    const pad=n=>String(n).padStart(2,"0");
    setSchedDate(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`);
    setSchedTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setSchedDuration(60);
    setScheduleTicket(ticket);
    setShowSchedule(true);
  };

  // Save schedule + notify user
  const saveSchedule=async()=>{
    if(!schedDate||!schedTime||!scheduleTicket)return;
    setSaving(true);
    try{
      const openAt=new Date(`${schedDate}T${schedTime}:00`);
      const closeAt=new Date(openAt.getTime()+schedDuration*60*1000);

      // Insert schedule
      await supabase.from("site_schedule").insert([{
        open_at:openAt.toISOString(),
        close_at:closeAt.toISOString(),
        created_by:profile?.id,
        ticket_id:scheduleTicket.id,
        status:"pending",
        duration_minutes:schedDuration,
      }]);

      // Reply to ticket with confirmation
      const userId=scheduleTicket.user?.id;
      const userName=scheduleTicket.user?.full_name||"utilisateur";
      const reply=`✅ Bonjour ${userName},\n\nVotre demande de modification a été ACCEPTÉE.\n\n📅 Date : ${openAt.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}\n🕐 Heure d'ouverture : ${openAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}\n⏱️ Durée : ${schedDuration} minutes\n🔒 Fermeture automatique à : ${closeAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}\n\nLe site s'ouvrira automatiquement à cette heure. Effectuez vos modifications pendant la fenêtre impartie.\n\nCordialement,\nL'équipe CipherPool`;

      await supabase.from("support_messages").insert([{ticket_id:scheduleTicket.id,sender_id:profile?.id,message:reply}]);
      await supabase.from("support_tickets").update({status:"answered"}).eq("id",scheduleTicket.id);

      // Admin message notification to user
      if(userId){
        await supabase.from("admin_messages").insert([{
          user_id:userId,
          is_global:false,
          type:"update",
          title:"✅ Demande de modification acceptée",
          content:`Votre fenêtre de modification est planifiée le ${openAt.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} à ${openAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} pendant ${schedDuration} minutes.`,
        }]);
      }

      fetchTickets();fetchSchedules();
      if(selected?.id===scheduleTicket.id)fetchMessages(scheduleTicket.id);
      setShowSchedule(false);setScheduleTicket(null);
    }catch(e){console.error(e);}
    finally{setSaving(false);}
  };

  const deleteSchedule=async(id)=>{
    await supabase.from("site_schedule").delete().eq("id",id);
    fetchSchedules();
  };

  const statusCfg={open:{label:"OUVERT",color:GREEN,bg:gx(.1),border:gx(.25)},pending:{label:"EN COURS",color:AMBER,bg:ax(.1),border:ax(.25)},answered:{label:"RÉPONDU",color:CYAN,bg:cx(.1),border:cx(.25)},closed:{label:"FERMÉ",color:"#94a3b8",bg:"rgba(148,163,184,.1)",border:"rgba(148,163,184,.2)"}};
  const priorCfg={normal:{label:"NORMAL",color:"#94a3b8"},urgent:{label:"URGENT",color:AMBER},critique:{label:"CRITIQUE",color:RED}};

  const filtered=tickets.filter(t=>{
    if(filter==="all")return true;
    if(filter==="mine")return t.assigned_to?.id===profile?.id;
    if(filter==="profile_edit")return t.subject?.toLowerCase().includes("modification");
    return t.status===filter;
  });

  const isProfileEdit=t=>t?.subject?.toLowerCase().includes("modification de profil")||t?.category==="compte";

  if(!isAdmin)return<div style={{minHeight:"80vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:RED,fontFamily:"'JetBrains Mono',monospace",fontSize:12,letterSpacing:2}}>ACCÈS REFUSÉ</p></div>;
  if(loading)return<div style={{minHeight:"80vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/></div>;

  const S={fontFamily:"'Space Grotesk',sans-serif"};
  const M={fontFamily:"'JetBrains Mono',monospace"};
  const BB={fontFamily:"'Bebas Neue',cursive"};

  return(
    <div style={{minHeight:"100vh",background:BG,...S,color:"rgba(255,255,255,.88)",padding:"32px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .sp-in{background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.18);border-radius:9px;color:#fff;padding:9px 13px;font-family:Space Grotesk,sans-serif;font-size:13px;outline:none;transition:border .2s;width:100%}
      .sp-in:focus{border-color:#00d4ff;box-shadow:0 0 10px rgba(0,212,255,.12)}
      .rowh:hover{background:rgba(0,212,255,.04)}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,212,255,.22);border-radius:99px}`}</style>

      <div style={{maxWidth:1200,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div>
            <h1 style={{...BB,fontSize:34,letterSpacing:3,margin:0,lineHeight:1}}>ADMIN <span style={{color:CYAN,textShadow:`0 0 28px ${cx(.5)}`}}>SUPPORT</span></h1>
            <p style={{...M,fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:2,marginTop:5}}>GESTION DES TICKETS · PLANIFICATION</p>
          </div>
          <div style={{display:"flex",gap:8}}>
            {[["tickets","🎟️ TICKETS"],["schedule","⏰ PLANNING"]].map(([k,lb])=>(
              <button key={k} onClick={()=>setTab(k)} style={{...M,padding:"9px 18px",borderRadius:10,border:`1px solid ${tab===k?cx(.35):cx(.1)}`,background:tab===k?cx(.1):"transparent",color:tab===k?CYAN:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:10,letterSpacing:2,transition:"all .2s"}}>
                {lb} {k==="schedule"&&schedules.length>0&&<span style={{background:AMBER,color:"#000",borderRadius:"50%",padding:"0 5px",fontSize:9,fontWeight:700,marginLeft:4}}>{schedules.filter(s=>s.status==="pending").length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:24}}>
          {[[CYAN,tickets.length,"TOTAL"],[GREEN,tickets.filter(t=>t.status==="open").length,"OUVERTS"],[AMBER,tickets.filter(t=>["urgent","critique"].includes(t.priority)).length,"URGENTS"],[VIOLET,tickets.filter(t=>t.assigned_to?.id===profile?.id).length,"MES TICKETS"],[INDIGO,tickets.filter(t=>isProfileEdit(t)&&t.status!=="closed").length,"MODIF. PROFIL"]].map(([ac,val,lb])=>(
            <G key={lb} ac={ac} style={{padding:"14px 16px"}}>
              <p style={{...M,fontSize:8,letterSpacing:2,color:"rgba(255,255,255,.25)",marginBottom:6}}>{lb}</p>
              <p style={{...BB,fontSize:30,color:ac,letterSpacing:1,lineHeight:1}}>{val}</p>
            </G>
          ))}
        </div>

        {/* ═══ TAB TICKETS ═══ */}
        {tab==="tickets"&&(
          <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:14}}>

            {/* List */}
            <div>
              <select value={filter} onChange={e=>setFilter(e.target.value)} className="sp-in" style={{marginBottom:10,cursor:"pointer"}}>
                <option value="all">TOUS</option>
                <option value="open">OUVERTS</option>
                <option value="pending">EN COURS</option>
                <option value="answered">RÉPONDUS</option>
                <option value="mine">MES TICKETS</option>
                <option value="profile_edit">MODIF. PROFIL</option>
                <option value="closed">FERMÉS</option>
              </select>
              <G style={{padding:0,overflow:"hidden"}}>
                <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${cx(.08)}`}}>
                  <p style={{...M,fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.25)"}}>{filtered.length} TICKET{filtered.length!==1?"S":""}</p>
                </div>
                {filtered.length===0?<div style={{textAlign:"center",padding:"40px 20px"}}><p style={{...M,fontSize:9,letterSpacing:3,color:"rgba(255,255,255,.2)"}}>AUCUN TICKET</p></div>:(
                  <div style={{maxHeight:560,overflowY:"auto",padding:"6px"}}>
                    {filtered.map(t=>{
                      const sc=statusCfg[t.status]||statusCfg.open;
                      const active=selected?.id===t.id;
                      const isPE=isProfileEdit(t);
                      return(
                        <div key={t.id} onClick={()=>{setSelected(t);fetchMessages(t.id);}}
                          style={{padding:"11px 13px",borderRadius:10,cursor:"pointer",marginBottom:4,transition:"all .18s",background:active?cx(.1):"transparent",border:`1px solid ${active?cx(.28):isPE?"rgba(251,191,36,.15)":"transparent"}`}}
                          onMouseEnter={e=>{if(!active)e.currentTarget.style.background=cx(.05);}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                            <p style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.8)",flex:1,marginRight:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isPE&&"✏️ "}{t.subject}</p>
                            <span style={{...M,fontSize:7,letterSpacing:1,color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,padding:"2px 7px",borderRadius:20,flexShrink:0}}>{sc.label}</span>
                          </div>
                          <p style={{...M,fontSize:9,color:"rgba(255,255,255,.35)",marginBottom:4}}>{t.user?.full_name}</p>
                          {t.priority!=="normal"&&<span style={{...M,fontSize:7,color:priorCfg[t.priority]?.color,background:`${priorCfg[t.priority]?.color}15`,padding:"1px 7px",borderRadius:20}}>{priorCfg[t.priority]?.label}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </G>
            </div>

            {/* Chat + user info */}
            {selected?(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>

                {/* User info card — affiché si demande modification profil */}
                {isProfileEdit(selected)&&selected.user&&(
                  <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}>
                    <G ac={AMBER} style={{padding:"16px 20px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                        <p style={{...M,fontSize:10,letterSpacing:2.5,color:AMBER}}>👤 INFORMATIONS UTILISATEUR</p>
                        {selected.status!=="closed"&&isSuperAdmin&&(
                          <motion.button whileHover={{scale:1.04}} whileTap={{scale:.96}} onClick={()=>acceptEditRequest(selected)}
                            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 18px",background:`linear-gradient(135deg,${gx(.2)},${gx(.08)})`,border:`1px solid ${gx(.35)}`,borderRadius:10,color:GREEN,cursor:"pointer",...M,fontSize:10,letterSpacing:1.5,boxShadow:`0 4px 20px ${gx(.2)}`}}>
                            ✅ ACCEPTER & PLANIFIER
                          </motion.button>
                        )}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                        {[["NOM",selected.user.full_name||"—"],["EMAIL",selected.user.email||"—"],["FREE FIRE ID",selected.user.free_fire_id||"—"],["RÔLE",selected.user.role||"—"],["NIVEAU",selected.user.level||"—"],["INSCRIT LE",selected.user.created_at?new Date(selected.user.created_at).toLocaleDateString("fr-FR"):"—"]].map(([k,v])=>(
                          <div key={k} style={{background:ax(.06),border:`1px solid ${ax(.12)}`,borderRadius:9,padding:"9px 12px"}}>
                            <p style={{...M,fontSize:8,letterSpacing:2,color:"rgba(255,255,255,.3)",marginBottom:4}}>{k}</p>
                            <p style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.8)",wordBreak:"break-all"}}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </G>
                  </motion.div>
                )}

                {/* Ticket chat */}
                <G style={{display:"flex",flexDirection:"column",flex:1,padding:0,minHeight:400}}>
                  {/* Header */}
                  <div style={{padding:"14px 20px",borderBottom:`1px solid ${cx(.1)}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,flexShrink:0}}>
                    <div>
                      <p style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:5}}>{selected.subject}</p>
                      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                        {[statusCfg[selected.status]||statusCfg.open].map(sc=><span key="s" style={{...M,fontSize:8,letterSpacing:1,color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,padding:"2px 9px",borderRadius:20}}>{sc.label}</span>)}
                        {selected.assigned_to?<span style={{...M,fontSize:9,color:INDIGO}}>→ {selected.assigned_to.full_name}</span>:<span style={{...M,fontSize:9,color:"rgba(255,255,255,.25)"}}>NON ASSIGNÉ</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {!selected.assigned_to&&<button onClick={assignToMe} style={{...M,padding:"6px 14px",background:cx(.1),border:`1px solid ${cx(.25)}`,borderRadius:8,color:CYAN,cursor:"pointer",fontSize:9,letterSpacing:1.5}}>PRENDRE</button>}
                      {selected.status!=="closed"&&<button onClick={closeTicket} style={{...M,padding:"6px 14px",background:rx(.1),border:`1px solid ${rx(.25)}`,borderRadius:8,color:RED,cursor:"pointer",fontSize:9,letterSpacing:1.5}}>FERMER</button>}
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:10,minHeight:220,maxHeight:340}}>
                    {messages.map(msg=>{
                      const mine=msg.sender_id===profile?.id;
                      return(
                        <motion.div key={msg.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
                          <div style={{maxWidth:"75%",padding:"11px 15px",borderRadius:mine?"13px 3px 13px 13px":"3px 13px 13px 13px",background:mine?`linear-gradient(135deg,${cx(.22)},${cx(.1)})`:"rgba(129,140,248,.12)",border:`1px solid ${mine?cx(.28):"rgba(129,140,248,.2)"}`}}>
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                              <span style={{fontSize:11,fontWeight:700,color:mine?CYAN:"rgba(255,255,255,.65)"}}>{mine?"VOUS":(msg.sender?.full_name||"—")}</span>
                              {["admin","super_admin"].includes(msg.sender?.role)&&!mine&&<span style={{...M,fontSize:7,color:INDIGO,background:"rgba(129,140,248,.15)",padding:"1px 6px",borderRadius:20}}>{msg.sender?.role==="super_admin"?"SUPER ADMIN":"ADMIN"}</span>}
                            </div>
                            <p style={{color:"rgba(255,255,255,.78)",fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{msg.message}</p>
                            <p style={{...M,fontSize:8,color:"rgba(255,255,255,.22)",marginTop:5}}>{new Date(msg.created_at).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={bottomRef}/>
                  </div>

                  {/* Reply */}
                  {selected.status!=="closed"&&(
                    <div style={{padding:"12px 20px",borderTop:`1px solid ${cx(.1)}`,display:"flex",gap:10,flexShrink:0}}>
                      <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}}
                        placeholder="Répondre… (Entrée pour envoyer)" rows={2}
                        style={{flex:1,background:cx(.06),border:`1px solid ${cx(.18)}`,borderRadius:10,color:"#fff",padding:"9px 13px",fontSize:12,outline:"none",resize:"none",...S,transition:"border .2s"}}
                        onFocus={e=>e.target.style.borderColor=CYAN} onBlur={e=>e.target.style.borderColor=cx(.18)}/>
                      <motion.button whileHover={{scale:1.05}} whileTap={{scale:.95}} onClick={sendReply} disabled={!newMsg.trim()}
                        style={{padding:"0 18px",background:newMsg.trim()?cx(.12):"transparent",border:`1px solid ${newMsg.trim()?cx(.3):cx(.08)}`,borderRadius:10,color:newMsg.trim()?CYAN:"rgba(255,255,255,.2)",cursor:newMsg.trim()?"pointer":"default",...M,fontSize:9,letterSpacing:2,transition:"all .2s"}}>
                        RÉPONDRE
                      </motion.button>
                    </div>
                  )}
                </G>
              </div>
            ):(
              <G style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:400}}>
                <div style={{textAlign:"center"}}><motion.div animate={{y:[0,-8,0]}} transition={{duration:3,repeat:Infinity}} style={{fontSize:56,marginBottom:14,opacity:.2}}>🎟️</motion.div><p style={{...M,fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>SÉLECTIONNEZ UN TICKET</p></div>
              </G>
            )}
          </div>
        )}

        {/* ═══ TAB PLANNING ═══ */}
        {tab==="schedule"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <G ac={CYAN} style={{padding:"20px 24px"}}>
              <p style={{...M,fontSize:10,letterSpacing:2.5,color:CYAN,marginBottom:16}}>⏰ FENÊTRES DE MODIFICATION PLANIFIÉES</p>
              {schedules.length===0?(
                <div style={{textAlign:"center",padding:"48px 0"}}><motion.div animate={{opacity:[.3,.7,.3]}} transition={{duration:2.5,repeat:Infinity}} style={{fontSize:50,marginBottom:12}}>📅</motion.div><p style={{...M,fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUNE PLANIFICATION</p></div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {schedules.map(s=>{
                    const openAt=new Date(s.open_at);
                    const closeAt=new Date(s.close_at);
                    const now=new Date();
                    const isActive=now>=openAt&&now<=closeAt;
                    const isPast=now>closeAt;
                    const statusColor=isActive?GREEN:isPast?"#94a3b8":CYAN;
                    const statusLabel=isActive?"🟢 EN COURS":isPast?"⚫ TERMINÉ":"🔵 PLANIFIÉ";
                    return(
                      <motion.div key={s.id} whileHover={{x:4}} style={{padding:"16px 20px",borderRadius:12,background:isActive?gx(.07):cx(.04),border:`1px solid ${isActive?gx(.25):cx(.12)}`,display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}>
                        <div style={{flex:1,minWidth:200}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                            <span style={{...M,fontSize:9,letterSpacing:1.5,color:statusColor,background:`${statusColor}18`,border:`1px solid ${statusColor}30`,padding:"2px 10px",borderRadius:20}}>{statusLabel}</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                            {[["📅 OUVERTURE",openAt.toLocaleString("fr-FR",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})],["🔒 FERMETURE",closeAt.toLocaleString("fr-FR",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})],["⏱️ DURÉE",`${s.duration_minutes} min`],["🆔 TICKET",s.ticket_id?s.ticket_id.slice(0,8)+"…":"—"]].map(([k,v])=>(
                              <div key={k} style={{background:"rgba(0,0,0,.2)",borderRadius:8,padding:"8px 12px"}}>
                                <p style={{...M,fontSize:8,letterSpacing:1.5,color:"rgba(255,255,255,.3)",marginBottom:4}}>{k}</p>
                                <p style={{...M,fontSize:11,color:"rgba(255,255,255,.75)"}}>{v}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {!isActive&&!isPast&&(
                          <motion.button whileHover={{scale:1.07}} whileTap={{scale:.93}} onClick={()=>deleteSchedule(s.id)}
                            style={{width:36,height:36,borderRadius:10,background:rx(.1),border:`1px solid ${rx(.25)}`,color:RED,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🗑️</motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </G>
          </div>
        )}
      </div>

      {/* ═══ MODAL PLANIFICATION ═══ */}
      <AnimatePresence>
        {showSchedule&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,background:"rgba(2,8,23,.9)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20}}
            onClick={e=>{if(e.target===e.currentTarget)setShowSchedule(false);}}>
            <motion.div initial={{scale:.88,opacity:0,y:24}} animate={{scale:1,opacity:1,y:0}} exit={{scale:.88,opacity:0,y:24}} transition={{type:"spring",stiffness:280,damping:26}}
              style={{background:"rgba(6,15,35,.98)",border:`1px solid ${cx(.3)}`,borderRadius:20,padding:"32px 36px",maxWidth:500,width:"100%",boxShadow:`0 32px 100px rgba(0,0,0,.8),0 0 0 1px ${cx(.08)},0 0 80px ${cx(.06)}`}}>
              
              {/* Modal header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div>
                  <h2 style={{...BB,fontSize:28,letterSpacing:3,margin:0,color:CYAN}}>PLANIFIER L'OUVERTURE</h2>
                  <p style={{...M,fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginTop:4}}>FENÊTRE DE MODIFICATION POUR L'UTILISATEUR</p>
                </div>
                <button onClick={()=>setShowSchedule(false)} style={{width:34,height:34,borderRadius:9,background:rx(.1),border:`1px solid ${rx(.25)}`,color:RED,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              {/* User info mini */}
              {scheduleTicket?.user&&(
                <div style={{margin:"18px 0",padding:"14px 18px",background:gx(.07),border:`1px solid ${gx(.2)}`,borderRadius:12}}>
                  <p style={{...M,fontSize:9,color:GREEN,letterSpacing:2,marginBottom:10}}>👤 UTILISATEUR CONCERNÉ</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["NOM",scheduleTicket.user.full_name||"—"],["FF ID",scheduleTicket.user.free_fire_id||"—"],["EMAIL",scheduleTicket.user.email||"—"],["RÔLE",scheduleTicket.user.role||"—"]].map(([k,v])=>(
                      <div key={k}><p style={{...M,fontSize:8,color:"rgba(255,255,255,.3)",letterSpacing:1.5,marginBottom:2}}>{k}</p><p style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,.8)"}}>{v}</p></div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:18}}>
                {/* Date */}
                <div>
                  <p style={{...M,fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.3)",marginBottom:8}}>📅 DATE D'OUVERTURE</p>
                  <input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)} className="sp-in"
                    style={{colorScheme:"dark"}} min={new Date().toISOString().split("T")[0]}/>
                </div>

                {/* Time */}
                <div>
                  <p style={{...M,fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.3)",marginBottom:8}}>🕐 HEURE D'OUVERTURE</p>
                  <input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)} className="sp-in" style={{colorScheme:"dark"}}/>
                </div>

                {/* Duration */}
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <p style={{...M,fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.3)"}}>⏱️ DURÉE</p>
                    <p style={{...BB,fontSize:22,color:CYAN,letterSpacing:1}}>{schedDuration} <span style={{fontSize:12}}>MIN</span></p>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {[15,30,60,120].map(d=>(
                      <button key={d} onClick={()=>setSchedDuration(d)}
                        style={{flex:1,padding:"9px 0",borderRadius:9,border:`1px solid ${schedDuration===d?cx(.4):cx(.12)}`,background:schedDuration===d?cx(.14):"transparent",color:schedDuration===d?CYAN:"rgba(255,255,255,.4)",cursor:"pointer",...M,fontSize:10,letterSpacing:1,transition:"all .18s"}}>
                        {d<60?`${d}min`:`${d/60}h`}
                      </button>
                    ))}
                  </div>
                  <input type="range" min={5} max={480} step={5} value={schedDuration} onChange={e=>setSchedDuration(Number(e.target.value))}
                    style={{width:"100%",marginTop:12,accentColor:CYAN,cursor:"pointer"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",...M,fontSize:8,color:"rgba(255,255,255,.2)",marginTop:4}}>
                    <span>5 MIN</span><span>1H</span><span>2H</span><span>4H</span><span>8H</span>
                  </div>
                </div>

                {/* Preview */}
                {schedDate&&schedTime&&(
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{padding:"14px 18px",background:cx(.07),border:`1px solid ${cx(.2)}`,borderRadius:12}}>
                    <p style={{...M,fontSize:9,color:CYAN,letterSpacing:2,marginBottom:8}}>📋 RÉCAPITULATIF</p>
                    {(()=>{
                      const open=new Date(`${schedDate}T${schedTime}:00`);
                      const close=new Date(open.getTime()+schedDuration*60000);
                      return(<>
                        <p style={{fontSize:13,color:"rgba(255,255,255,.75)",marginBottom:4}}>🔓 Ouverture : <strong style={{color:GREEN}}>{open.toLocaleString("fr-FR",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}</strong></p>
                        <p style={{fontSize:13,color:"rgba(255,255,255,.75)"}}>🔒 Fermeture : <strong style={{color:RED}}>{close.toLocaleString("fr-FR",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}</strong></p>
                      </>);
                    })()}
                  </motion.div>
                )}

                {/* Buttons */}
                <div style={{display:"flex",gap:10,paddingTop:4}}>
                  <button onClick={()=>setShowSchedule(false)} style={{flex:1,padding:"12px 0",border:`1px solid ${cx(.15)}`,borderRadius:11,color:"rgba(255,255,255,.4)",background:"transparent",cursor:"pointer",...M,fontSize:10,letterSpacing:1.5}}>ANNULER</button>
                  <motion.button whileHover={{scale:1.02,boxShadow:`0 8px 32px ${gx(.35)}`}} whileTap={{scale:.97}} onClick={saveSchedule} disabled={!schedDate||!schedTime||saving}
                    style={{flex:2,padding:"12px 0",background:schedDate&&schedTime?`linear-gradient(135deg,${gx(.25)},${gx(.1)})`:"rgba(255,255,255,.05)",border:`1px solid ${schedDate&&schedTime?gx(.4):cx(.08)}`,borderRadius:11,color:schedDate&&schedTime?GREEN:"rgba(255,255,255,.2)",cursor:schedDate&&schedTime?"pointer":"default",...M,fontSize:11,letterSpacing:2,transition:"all .2s",boxShadow:schedDate&&schedTime?`0 4px 20px ${gx(.2)}`:"none"}}>
                    {saving?"SAUVEGARDE…":"✅ CONFIRMER & NOTIFIER"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}