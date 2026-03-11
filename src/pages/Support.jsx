import { useState, useEffect, useRef } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   CIPHERPOOL — SUPPORT
   Gaming Dark · Cyan palette
   ═══════════════════════════════════════════════════════ */
const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`,rx=a=>`rgba(244,63,94,${a})`,gx=a=>`rgba(16,185,129,${a})`;

function G({children,style,ac}){const[h,setH]=useState(false);return(<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{position:"relative",overflow:"hidden",background:CARD,border:`1px solid ${h&&ac?ac+"35":cx(.1)}`,borderRadius:14,boxShadow:`0 4px 20px rgba(0,0,0,.4)`,transition:"border .22s",...style}}><div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${ac||cx(.3)},transparent)`,opacity:h?1:.3,transition:"opacity .22s",pointerEvents:"none"}}/>{children}</div>);}

export default function Support(){
  const{profile}=useOutletContext();
  const[searchParams]=useSearchParams();
  const[tickets,setTickets]=useState([]);
  const[adminMessages,setAdminMessages]=useState([]);
  const[selectedTicket,setSelectedTicket]=useState(null);
  const[messages,setMessages]=useState([]);
  const[newMessage,setNewMessage]=useState("");
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("tickets");
  const[ticketFilter,setTicketFilter]=useState("all");
  // New ticket form
  const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({subject:"",category:"autre",priority:"normal",body:""});
  const[sending,setSending]=useState(false);
  const bottomRef=useRef(null);

  const isAdmin=["admin","super_admin"].includes(profile?.role);

  // Auto-fill from profile edit request
  useEffect(()=>{
    // Fallback: read directly from URL in case searchParams not ready
    const rawParams=new URLSearchParams(window.location.search);
    const type=searchParams.get("type")||rawParams.get("type");
    if(type==="profile_edit"){
      const g=(k,d="")=>searchParams.get(k)||rawParams.get(k)||d;
      const name=g("name");
      const email=g("email");
      const ffId=g("ffId","—");
      const rol=g("role");
      const level=g("level","1");
      const joinDate=g("joinDate");
      const userId=g("userId");
      const body=`═══════════════════════════\n📋 DEMANDE DE MODIFICATION DE PROFIL\n═══════════════════════════\n\n👤 Nom actuel : ${name}\n📧 Email : ${email}\n🎮 Free Fire ID : ${ffId}\n🏷️ Rôle : ${rol}\n⚡ Niveau : ${level}\n📅 Inscrit le : ${joinDate}\n🔑 User ID : ${userId}\n\n═══════════════════════════\n✏️ CE QUE JE SOUHAITE MODIFIER :\n\n[Décrivez ici ce que vous souhaitez changer : Nom, Email, Âge, Ville, etc.]\n\n═══════════════════════════`;
      setForm({subject:"Demande de modification de profil",category:"compte",priority:"normal",body});
      setShowForm(true);
      setTab("tickets");
    }
  },[searchParams,window.location.search]);

  useEffect(()=>{
    fetchTickets();fetchAdminMessages();
    const ch=supabase.channel("support_ch_"+profile?.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"support_tickets"},p=>{
        if(isAdmin||p.new.user_id===profile?.id)setTickets(prev=>[p.new,...prev]);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"support_tickets"},p=>{
        setTickets(prev=>prev.map(t=>t.id===p.new.id?p.new:t));
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages"},p=>{
        if(selectedTicket&&p.new.ticket_id===selectedTicket.id)fetchMessages(selectedTicket.id);
      })
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[profile?.id,isAdmin]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const fetchTickets=async()=>{
    let q=supabase.from("support_tickets").select(`*,user:profiles!support_tickets_user_id_fkey(id,full_name,free_fire_id,role),assigned_to:profiles!support_tickets_assigned_to_fkey(id,full_name,role)`).order("created_at",{ascending:false});
    if(!isAdmin)q=q.eq("user_id",profile?.id);
    const{data}=await q;setTickets(data||[]);setLoading(false);
  };
  const fetchAdminMessages=async()=>{
    const{data}=await supabase.from("admin_messages").select("*").or(`user_id.eq.${profile?.id},is_global.eq.true`).order("created_at",{ascending:false});
    setAdminMessages(data||[]);
  };
  const fetchMessages=async(id)=>{
    const{data}=await supabase.from("support_messages").select(`*,sender:profiles!support_messages_sender_id_fkey(id,full_name,role)`).eq("ticket_id",id).order("created_at",{ascending:true});
    setMessages(data||[]);
  };
  const markAsRead=async(id)=>{await supabase.from("admin_messages").update({read:true}).eq("id",id);fetchAdminMessages();};
  const markAllRead=async()=>{const ids=adminMessages.filter(m=>!m.read).map(m=>m.id);if(!ids.length)return;await supabase.from("admin_messages").update({read:true}).in("id",ids);fetchAdminMessages();};

  const createTicket=async()=>{
    if(!form.subject.trim())return;
    setSending(true);
    try{
      const{data,error}=await supabase.from("support_tickets").insert([{user_id:profile?.id,subject:form.subject,category:form.category,priority:form.priority,status:"open"}]).select().single();
      if(error||!data)throw error;
      // First message = body
      if(form.body.trim()){
        await supabase.from("support_messages").insert([{ticket_id:data.id,sender_id:profile?.id,message:form.body.trim()}]);
      }else{
        await supabase.from("support_messages").insert([{ticket_id:data.id,sender_id:profile?.id,message:form.subject}]);
      }
      setTickets(prev=>[data,...prev]);setSelectedTicket(data);fetchMessages(data.id);
      setShowForm(false);setForm({subject:"",category:"autre",priority:"normal",body:""});setTab("tickets");
    }catch(e){console.error(e);}
    finally{setSending(false);}
  };

  const sendMessage=async()=>{
    if(!newMessage.trim()||!selectedTicket)return;
    const{error}=await supabase.from("support_messages").insert([{ticket_id:selectedTicket.id,sender_id:profile?.id,message:newMessage.trim()}]);
    if(!error){setNewMessage("");fetchMessages(selectedTicket.id);}
  };

  const assignToMe=async()=>{
    if(!selectedTicket||!isAdmin)return;
    await supabase.from("support_tickets").update({assigned_to:profile?.id,status:"pending"}).eq("id",selectedTicket.id);
    fetchTickets();setSelectedTicket({...selectedTicket,assigned_to:profile,status:"pending"});
  };

  const closeTicket=async()=>{
    if(!selectedTicket)return;
    await supabase.from("support_tickets").update({status:"closed"}).eq("id",selectedTicket.id);
    fetchTickets();setSelectedTicket(null);
  };

  const statusCfg={open:{label:"OUVERT",color:GREEN,bg:gx(.1),border:gx(.25)},pending:{label:"EN COURS",color:AMBER,bg:"rgba(251,191,36,.1)",border:"rgba(251,191,36,.25)"},answered:{label:"RÉPONDU",color:CYAN,bg:cx(.1),border:cx(.25)},closed:{label:"FERMÉ",color:"#94a3b8",bg:"rgba(148,163,184,.1)",border:"rgba(148,163,184,.2)"}};
  const priorCfg={normal:{label:"NORMAL",color:"#94a3b8"},urgent:{label:"URGENT",color:AMBER},critique:{label:"CRITIQUE",color:RED}};
  const catIcon={tournoi:"🎮",coins:"💰",compte:"👤",paiement:"💳",classement:"📊",autre:"❓"};

  const filtered=tickets.filter(t=>{
    if(ticketFilter==="all")return true;
    if(ticketFilter==="open")return t.status==="open";
    if(ticketFilter==="urgent")return["urgent","critique"].includes(t.priority);
    if(ticketFilter==="mine")return t.assigned_to?.id===profile?.id;
    if(ticketFilter==="closed")return t.status==="closed";
    return true;
  });

  const unread=adminMessages.filter(m=>!m.read).length;

  if(loading)return(<div style={{minHeight:"80vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/></div>);

  const S={fontFamily:"'Space Grotesk',sans-serif"};
  const M={fontFamily:"'JetBrains Mono',monospace"};
  const BB={fontFamily:"'Bebas Neue',cursive"};

  return(
    <div style={{minHeight:"100vh",background:BG,...S,color:"rgba(255,255,255,.88)",padding:"32px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .sp-in{background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.18);border-radius:9px;color:#fff;padding:10px 14px;font-family:Space Grotesk,sans-serif;font-size:13px;outline:none;transition:border .2s;width:100%}
      .sp-in:focus{border-color:${CYAN};box-shadow:0 0 12px rgba(0,212,255,0.15)}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,212,255,.22);border-radius:99px}`}</style>

      <div style={{maxWidth:1100,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32,flexWrap:"wrap",gap:14}}>
          <div>
            <h1 style={{...BB,fontSize:36,letterSpacing:3,margin:0,lineHeight:1,color:"#fff"}}>CENTRE DE <span style={{color:CYAN,textShadow:`0 0 28px rgba(0,212,255,.5)`}}>SUPPORT</span></h1>
            <p style={{...M,fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:2,marginTop:6}}>{isAdmin?"GESTION DES TICKETS":"BESOIN D'AIDE ? CRÉEZ UN TICKET"}</p>
          </div>
          {!isAdmin&&(
            <motion.button whileHover={{scale:1.04,y:-2}} whileTap={{scale:.97}} onClick={()=>setShowForm(true)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"11px 22px",background:`linear-gradient(135deg,${cx(.15)},${cx(.06)})`,border:`1px solid ${cx(.3)}`,borderRadius:12,color:CYAN,cursor:"pointer",...M,fontSize:11,letterSpacing:2,boxShadow:`0 4px 24px ${cx(.15)}`}}>
              <span style={{fontSize:16}}>+</span> NOUVEAU TICKET
            </motion.button>
          )}
        </div>

        {/* Admin stats */}
        {isAdmin&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
            {[[CYAN,tickets.length,"TOTAL"],[GREEN,tickets.filter(t=>t.status==="open").length,"OUVERTS"],[AMBER,tickets.filter(t=>["urgent","critique"].includes(t.priority)).length,"URGENTS"],[INDIGO,tickets.filter(t=>t.assigned_to?.id===profile?.id).length,"MES TICKETS"]].map(([ac,val,lb])=>(
              <G key={lb} ac={ac} style={{padding:"18px 20px"}}>
                <p style={{...M,fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.25)",marginBottom:8}}>{lb}</p>
                <p style={{...BB,fontSize:36,color:ac,letterSpacing:1,lineHeight:1,textShadow:`0 0 24px ${ac}50`}}>{val}</p>
              </G>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:2,marginBottom:24,borderBottom:`1px solid ${cx(.1)}`,paddingBottom:-1}}>
          {[["tickets",isAdmin?"GESTION TICKETS":"MES TICKETS","🎟️"],["announcements","ANNONCES","📢"]].map(([k,lb,ic])=>(
            <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",cursor:"pointer",...M,fontSize:10,letterSpacing:2,fontWeight:600,padding:"12px 18px",color:tab===k?"#fff":"rgba(255,255,255,.3)",borderBottom:`2px solid ${tab===k?CYAN:"transparent"}`,transition:"all .2s",position:"relative"}}>
              {ic} {lb}
              {k==="announcements"&&unread>0&&<span style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:RED,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>{unread}</span>}
            </button>
          ))}
        </div>

        {/* TICKETS TAB */}
        {tab==="tickets"&&(
          <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16,minHeight:500}}>

            {/* Left list */}
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {isAdmin&&(
                <div style={{marginBottom:12}}>
                  <select value={ticketFilter} onChange={e=>setTicketFilter(e.target.value)} className="sp-in" style={{width:"100%",cursor:"pointer"}}>
                    <option value="all">TOUS LES TICKETS</option>
                    <option value="open">OUVERTS</option>
                    <option value="urgent">URGENTS</option>
                    <option value="mine">MES TICKETS</option>
                    <option value="closed">FERMÉS</option>
                  </select>
                </div>
              )}
              <G style={{flex:1,overflow:"hidden",padding:0}}>
                <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${cx(.08)}`}}>
                  <p style={{...M,fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.25)"}}>{filtered.length} TICKET{filtered.length!==1?"S":""}</p>
                </div>
                {filtered.length===0?(
                  <div style={{textAlign:"center",padding:"48px 20px"}}><span style={{fontSize:40,opacity:.3}}>🎟️</span><p style={{...M,fontSize:9,letterSpacing:3,color:"rgba(255,255,255,.2)",marginTop:12}}>AUCUN TICKET</p></div>
                ):(
                  <div style={{maxHeight:520,overflowY:"auto",padding:"6px"}}>
                    {filtered.map(t=>{
                      const sc=statusCfg[t.status]||statusCfg.open;
                      const active=selectedTicket?.id===t.id;
                      return(
                        <div key={t.id} onClick={()=>{setSelectedTicket(t);fetchMessages(t.id);}}
                          style={{padding:"12px 14px",borderRadius:11,cursor:"pointer",marginBottom:4,transition:"all .18s",background:active?cx(.1):"transparent",border:`1px solid ${active?cx(.28):"transparent"}`}}
                          onMouseEnter={e=>{if(!active)e.currentTarget.style.background=cx(.05);}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <p style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.8)",flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.subject}</p>
                            <span style={{...M,fontSize:8,letterSpacing:1,color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,padding:"2px 8px",borderRadius:20,flexShrink:0}}>{sc.label}</span>
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontSize:10,opacity:.5}}>{catIcon[t.category]||"❓"}</span>
                            {isAdmin&&t.user&&<span style={{...M,fontSize:9,color:"rgba(255,255,255,.35)"}}>{t.user.full_name}</span>}
                            {t.priority!=="normal"&&<span style={{...M,fontSize:8,color:priorCfg[t.priority]?.color||AMBER,background:`${priorCfg[t.priority]?.color}18`,padding:"1px 7px",borderRadius:20}}>{priorCfg[t.priority]?.label}</span>}
                          </div>
                          <p style={{...M,fontSize:9,color:"rgba(255,255,255,.2)",marginTop:6}}>{new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </G>
            </div>

            {/* Right chat */}
            {selectedTicket?(
              <G style={{display:"flex",flexDirection:"column",height:580,padding:0}}>
                {/* Header */}
                <div style={{padding:"16px 22px",borderBottom:`1px solid ${cx(.1)}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,flexWrap:"wrap",gap:10}}>
                  <div>
                    <p style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:6}}>{selectedTicket.subject}</p>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      {[statusCfg[selectedTicket.status]||statusCfg.open].map(sc=><span key="s" style={{...M,fontSize:8,letterSpacing:1,color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,padding:"3px 10px",borderRadius:20}}>{sc.label}</span>)}
                      {selectedTicket.priority!=="normal"&&<span style={{...M,fontSize:8,color:priorCfg[selectedTicket.priority]?.color,background:`${priorCfg[selectedTicket.priority]?.color}15`,padding:"3px 10px",borderRadius:20}}>{priorCfg[selectedTicket.priority]?.label}</span>}
                      {isAdmin&&selectedTicket.user&&<span style={{...M,fontSize:9,color:"rgba(255,255,255,.4)"}}>👤 {selectedTicket.user.full_name}</span>}
                      {selectedTicket.assigned_to&&<span style={{...M,fontSize:9,color:INDIGO}}>→ {selectedTicket.assigned_to.full_name}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {isAdmin&&!selectedTicket.assigned_to&&<button onClick={assignToMe} style={{padding:"7px 16px",background:cx(.1),border:`1px solid ${cx(.25)}`,borderRadius:9,color:CYAN,cursor:"pointer",...M,fontSize:9,letterSpacing:1.5}}>PRENDRE</button>}
                    {selectedTicket.status!=="closed"&&<button onClick={closeTicket} style={{padding:"7px 16px",background:rx(.1),border:`1px solid ${rx(.25)}`,borderRadius:9,color:RED,cursor:"pointer",...M,fontSize:9,letterSpacing:1.5}}>FERMER</button>}
                  </div>
                </div>

                {/* Messages */}
                <div style={{flex:1,overflowY:"auto",padding:"20px 22px",display:"flex",flexDirection:"column",gap:12}}>
                  {messages.map(msg=>{
                    const mine=msg.sender_id===profile?.id;
                    const isAdminMsg=["admin","super_admin"].includes(msg.sender?.role);
                    return(
                      <motion.div key={msg.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
                        <div style={{maxWidth:"72%",padding:"12px 16px",borderRadius:mine?"14px 4px 14px 14px":"4px 14px 14px 14px",background:mine?`linear-gradient(135deg,${cx(.25)},${cx(.12)})`:`linear-gradient(135deg,rgba(129,140,248,.15),rgba(129,140,248,.07))`,border:`1px solid ${mine?cx(.3):"rgba(129,140,248,.2)"}`,boxShadow:`0 4px 16px rgba(0,0,0,.3)`}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                            <span style={{fontSize:12,fontWeight:700,color:mine?CYAN:isAdminMsg?"#818cf8":"rgba(255,255,255,.7)"}}>{mine?"VOUS":(msg.sender?.full_name||"—")}</span>
                            {isAdminMsg&&!mine&&<span style={{...M,fontSize:8,color:INDIGO,background:"rgba(129,140,248,.15)",padding:"1px 7px",borderRadius:20}}>{msg.sender?.role==="super_admin"?"SUPER ADMIN":"ADMIN"}</span>}
                          </div>
                          <p style={{color:"rgba(255,255,255,.8)",fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{msg.message}</p>
                          <p style={{...M,fontSize:9,color:"rgba(255,255,255,.25)",marginTop:6}}>{new Date(msg.created_at).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef}/>
                </div>

                {/* Input */}
                {selectedTicket.status!=="closed"&&(
                  <div style={{padding:"14px 22px",borderTop:`1px solid ${cx(.1)}`,display:"flex",gap:10,flexShrink:0}}>
                    <textarea value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                      placeholder="Votre message… (Entrée pour envoyer)" rows={2}
                      style={{flex:1,background:cx(.06),border:`1px solid ${cx(.18)}`,borderRadius:11,color:"#fff",padding:"10px 14px",fontSize:13,outline:"none",resize:"none",fontFamily:"'Space Grotesk',sans-serif",transition:"border .2s"}}
                      onFocus={e=>e.target.style.borderColor=CYAN} onBlur={e=>e.target.style.borderColor=cx(.18)}/>
                    <motion.button whileHover={{scale:1.05}} whileTap={{scale:.95}} onClick={sendMessage} disabled={!newMessage.trim()}
                      style={{padding:"0 22px",background:newMessage.trim()?`linear-gradient(135deg,${cx(.25)},${cx(.12)})`:"rgba(255,255,255,.04)",border:`1px solid ${newMessage.trim()?cx(.35):cx(.1)}`,borderRadius:11,color:newMessage.trim()?CYAN:"rgba(255,255,255,.25)",cursor:newMessage.trim()?"pointer":"default",...M,fontSize:10,letterSpacing:2,transition:"all .2s"}}>
                      ENVOYER
                    </motion.button>
                  </div>
                )}
              </G>
            ):(
              <G style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:400}}>
                <div style={{textAlign:"center"}}>
                  <motion.div animate={{y:[0,-10,0]}} transition={{duration:3,repeat:Infinity}} style={{fontSize:60,marginBottom:16,opacity:.25}}>🎟️</motion.div>
                  <p style={{...M,fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>SÉLECTIONNEZ UN TICKET</p>
                  {!isAdmin&&<p style={{...M,fontSize:9,color:"rgba(255,255,255,.15)",marginTop:8,letterSpacing:1}}>OU CRÉEZ-EN UN NOUVEAU</p>}
                </div>
              </G>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab==="announcements"&&(
          <G style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"16px 24px",borderBottom:`1px solid ${cx(.1)}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{...M,fontSize:9,letterSpacing:2.5,color:"rgba(255,255,255,.25)"}}>📢 ANNONCES OFFICIELLES</p>
              {unread>0&&<button onClick={markAllRead} style={{...M,fontSize:9,letterSpacing:1.5,color:CYAN,background:cx(.08),border:`1px solid ${cx(.2)}`,borderRadius:8,padding:"5px 14px",cursor:"pointer"}}>TOUT MARQUER LU</button>}
            </div>
            {adminMessages.length===0?(
              <div style={{textAlign:"center",padding:"80px 0"}}><motion.div animate={{opacity:[.3,.7,.3]}} transition={{duration:2.5,repeat:Infinity}} style={{fontSize:56,marginBottom:14}}>📭</motion.div><p style={{...M,fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUNE ANNONCE</p></div>
            ):(
              <div style={{padding:"12px"}}>
                {adminMessages.map(msg=>(
                  <motion.div key={msg.id} whileHover={{x:3}} onClick={()=>!msg.read&&markAsRead(msg.id)}
                    style={{padding:"18px 22px",borderRadius:12,marginBottom:8,cursor:"pointer",background:msg.read?cx(.03):cx(.07),border:`1px solid ${msg.read?cx(.08):cx(.2)}`,borderLeft:`3px solid ${msg.read?"rgba(0,212,255,.2)":CYAN}`,transition:"all .2s",position:"relative"}}>
                    {!msg.read&&<motion.div animate={{opacity:[1,.3,1]}} transition={{duration:1.5,repeat:Infinity}} style={{position:"absolute",top:14,right:14,width:7,height:7,borderRadius:"50%",background:CYAN,boxShadow:`0 0 8px ${CYAN}`}}/>}
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:20}}>{msg.type==="warning"?"⚠️":msg.type==="update"?"🔄":"📢"}</span>
                      <p style={{fontSize:15,fontWeight:700,color:"#fff"}}>{msg.title}</p>
                      <span style={{...M,fontSize:8,color:"rgba(255,255,255,.25)",marginLeft:"auto"}}>{msg.is_global?"📢 GÉNÉRAL":"📩 PERSONNEL"}</span>
                    </div>
                    <p style={{color:"rgba(255,255,255,.55)",fontSize:13,lineHeight:1.7}}>{msg.content}</p>
                    <p style={{...M,fontSize:9,color:"rgba(255,255,255,.2)",marginTop:10}}>{new Date(msg.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </G>
        )}
      </div>

      {/* MODAL nouveau ticket */}
      <AnimatePresence>
        {showForm&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,background:"rgba(2,8,23,.85)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}
            onClick={e=>{if(e.target===e.currentTarget)setShowForm(false);}}>
            <motion.div initial={{scale:.9,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:.9,opacity:0,y:20}} transition={{type:"spring",stiffness:260,damping:24}}
              style={{background:"rgba(6,15,35,.97)",border:`1px solid ${cx(.25)}`,borderRadius:18,padding:"30px 32px",maxWidth:560,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:`0 24px 80px rgba(0,0,0,.7),0 0 0 1px ${cx(.08)}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                <h2 style={{...M,fontSize:14,letterSpacing:3,color:CYAN}}>🎟️ NOUVEAU TICKET</h2>
                <button onClick={()=>setShowForm(false)} style={{width:32,height:32,borderRadius:9,background:rx(.1),border:`1px solid ${rx(.25)}`,color:RED,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {/* Subject */}
                <div>
                  <p style={{...M,fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.3)",marginBottom:7}}>SUJET *</p>
                  <input className="sp-in" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Décrivez votre problème en une ligne…" style={{width:"100%"}}/>
                </div>

                {/* Category + Priority */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <p style={{...M,fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.3)",marginBottom:7}}>CATÉGORIE</p>
                    <select className="sp-in" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{width:"100%",cursor:"pointer"}}>
                      <option value="compte">👤 Compte / Profil</option>
                      <option value="tournoi">🎮 Tournoi</option>
                      <option value="coins">💰 Pièces / Wallet</option>
                      <option value="paiement">💳 Paiement</option>
                      <option value="classement">📊 Classement</option>
                      <option value="autre">❓ Autre</option>
                    </select>
                  </div>
                  <div>
                    <p style={{...M,fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.3)",marginBottom:7}}>PRIORITÉ</p>
                    <div style={{display:"flex",gap:6}}>
                      {[["normal","NORMAL","#94a3b8"],["urgent","URGENT",AMBER],["critique","CRITIQUE",RED]].map(([v,lb,c])=>(
                        <button key={v} onClick={()=>setForm({...form,priority:v})} style={{flex:1,padding:"9px 0",borderRadius:9,border:`1px solid ${form.priority===v?c+"55":cx(.12)}`,background:form.priority===v?`${c}18`:"transparent",color:form.priority===v?c:"rgba(255,255,255,.35)",cursor:"pointer",...M,fontSize:8,letterSpacing:1,transition:"all .18s"}}>{lb}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div>
                  <p style={{...M,fontSize:9,letterSpacing:2,color:"rgba(255,255,255,.3)",marginBottom:7}}>MESSAGE / DÉTAILS</p>
                  <textarea className="sp-in" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={8} placeholder="Décrivez votre demande en détail…" style={{resize:"vertical",minHeight:140}}/>
                </div>

                {/* Actions */}
                <div style={{display:"flex",gap:10,paddingTop:4}}>
                  <button onClick={()=>setShowForm(false)} style={{flex:1,padding:"11px 0",border:`1px solid ${cx(.18)}`,borderRadius:11,color:"rgba(255,255,255,.5)",background:"transparent",cursor:"pointer",...M,fontSize:10,letterSpacing:1.5,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=cx(.35)} onMouseLeave={e=>e.currentTarget.style.borderColor=cx(.18)}>ANNULER</button>
                  <motion.button whileHover={{scale:1.02}} whileTap={{scale:.97}} onClick={createTicket} disabled={!form.subject.trim()||sending}
                    style={{flex:2,padding:"11px 0",background:form.subject.trim()?`linear-gradient(135deg,${cx(.22)},${cx(.1)})`:"rgba(255,255,255,.05)",border:`1px solid ${form.subject.trim()?cx(.35):cx(.08)}`,borderRadius:11,color:form.subject.trim()?CYAN:"rgba(255,255,255,.25)",cursor:form.subject.trim()?"pointer":"default",...M,fontSize:11,letterSpacing:2,transition:"all .2s",boxShadow:form.subject.trim()?`0 4px 20px ${cx(.15)}`:"none"}}>
                    {sending?"ENVOI…":"ENVOYER AU SUPPORT ✓"}
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