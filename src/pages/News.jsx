import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CYAN="#00d4ff",INDIGO="#818cf8",VIOLET="#a78bfa",GREEN="#10b981",RED="#f43f5e",AMBER="#fbbf24",BG="#020817",CARD="#0a1628";
const cx=a=>`rgba(0,212,255,${a})`;

const CAT={
  general:   {label:"GÉNÉRAL",   color:INDIGO,  bg:`rgba(129,140,248,.1)`},
  tournament:{label:"TOURNOIS",  color:AMBER,   bg:`rgba(251,191,36,.1)`},
  update:    {label:"MISE À JOUR",color:CYAN,   bg:`rgba(0,212,255,.1)`},
  player:    {label:"JOUEUR",    color:GREEN,   bg:`rgba(16,185,129,.1)`},
  team:      {label:"ÉQUIPE",    color:VIOLET,  bg:`rgba(167,139,250,.1)`},
};

const DUMMY=[
  {id:"1",title:"Saison 3 : Nouvelles récompenses et tournois inédits",excerpt:"La saison 3 de CipherPool arrive avec des lots exceptionnels, de nouveaux formats de tournois et des classements révisés.",category:"tournament",featured:true,views:1240,published_at:new Date(Date.now()-3600000*2).toISOString(),cover_url:null,tags:["saison3","tournois"]},
  {id:"2",title:"Mise à jour v2.4 : Système de teams amélioré",excerpt:"Le système d'équipes reçoit une refonte complète avec invitations, gestion des rôles et statistiques par équipe.",category:"update",featured:false,views:876,published_at:new Date(Date.now()-3600000*18).toISOString(),cover_url:null,tags:["teams","update"]},
  {id:"3",title:"Spotlight joueur : XxShadowKillxX domine le classement",excerpt:"Découvrez l'histoire et le parcours du meilleur joueur de la saison avec une interview exclusive.",category:"player",featured:false,views:654,published_at:new Date(Date.now()-3600000*36).toISOString(),cover_url:null,tags:["player","interview"]},
  {id:"4",title:"Les Achievements arrivent sur CipherPool",excerpt:"Gagnez des badges, débloquez des succès rares et réclamez des récompenses en coins et XP.",category:"update",featured:false,views:432,published_at:new Date(Date.now()-86400000*2).toISOString(),cover_url:null,tags:["achievements","rewards"]},
  {id:"5",title:"Résultats Tournoi Septembre : Palmarès complet",excerpt:"Retrouvez tous les résultats, kills, classements et lots du grand tournoi mensuel de septembre.",category:"tournament",featured:false,views:1089,published_at:new Date(Date.now()-86400000*3).toISOString(),cover_url:null,tags:["results","tournament"]},
  {id:"6",title:"CipherPool s'associe avec de nouveaux partenaires",excerpt:"De nouvelles collaborations pour enrichir l'expérience de jeu et multiplier les lots en coins.",category:"general",featured:false,views:321,published_at:new Date(Date.now()-86400000*5).toISOString(),cover_url:null,tags:["partner","news"]},
];

function timeAgo(dateStr){
  const diff=(Date.now()-new Date(dateStr))/1000;
  if(diff<3600)return`${Math.floor(diff/60)}min`;
  if(diff<86400)return`${Math.floor(diff/3600)}h`;
  return`${Math.floor(diff/86400)}j`;
}

export default function News(){
  const[articles,setArticles]=useState([]);
  const[filter,setFilter]=useState("all");
  const[search,setSearch]=useState("");
  const[selected,setSelected]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{fetchNews();},[]);

  const fetchNews=async()=>{
    setLoading(true);
    try{
      const{data}=await supabase.from("news").select("*,author:profiles(username,avatar_url)").eq("published",true).order("published_at",{ascending:false});
      setArticles(data?.length?data:DUMMY);
    }catch{setArticles(DUMMY);}
    finally{setLoading(false);}
  };

  const incrementView=async(id)=>{
    await supabase.from("news").update({views:supabase.raw?.("views + 1")}).eq("id",id).catch(()=>{});
  };

  const openArticle=(a)=>{setSelected(a);incrementView(a.id);};

  const featured=articles.find(a=>a.featured)||articles[0];
  const filtered=articles.filter(a=>{
    const matchCat=filter==="all"||a.category===filter;
    const matchSearch=!search||a.title.toLowerCase().includes(search.toLowerCase())||a.excerpt?.toLowerCase().includes(search.toLowerCase());
    return matchCat&&matchSearch&&a.id!==featured?.id;
  });

  if(loading)return(
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
        style={{width:36,height:36,border:`2px solid ${cx(.12)}`,borderTopColor:CYAN,borderRadius:"50%"}}/>
    </div>
  );

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
      .news-page{font-family:Space Grotesk,sans-serif;color:rgba(255,255,255,.88);min-height:100vh;background:${BG};padding:32px}
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${cx(.22)};border-radius:99px}
      .news-card:hover .news-title{color:${CYAN};}
    `}</style>

    <div className="news-page">
      {/* HEADER */}
      <div style={{marginBottom:28}}>
        <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:3,color:cx(.5),marginBottom:6}}>📰 ACTUALITÉS</p>
        <h1 style={{fontFamily:"Bebas Neue,cursive",fontSize:46,letterSpacing:3,margin:0,color:"#fff"}}>
          CIPHER<span style={{color:CYAN}}>NEWS</span>
        </h1>
      </div>

      {/* FEATURED */}
      {featured&&(
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} whileHover={{y:-3}}
          onClick={()=>openArticle(featured)}
          style={{cursor:"pointer",marginBottom:28,position:"relative",overflow:"hidden",borderRadius:18,
            background:`linear-gradient(135deg,${CARD},rgba(0,212,255,.06))`,
            border:`1px solid ${cx(.18)}`,boxShadow:`0 0 40px ${cx(.08)},0 24px 60px rgba(0,0,0,.5)`,padding:"36px 36px"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${CYAN},${INDIGO},${VIOLET})`}}/>
          <div style={{position:"absolute",top:16,right:20}}>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"#000",background:`linear-gradient(135deg,${CYAN},${INDIGO})`,padding:"4px 12px",borderRadius:99,fontWeight:700,letterSpacing:1}}>
              ★ À LA UNE
            </span>
          </div>
          <div style={{maxWidth:680}}>
            {CAT[featured.category]&&(
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:CAT[featured.category].color,background:CAT[featured.category].bg,padding:"3px 10px",borderRadius:6,letterSpacing:1,marginBottom:14,display:"inline-block"}}>
                {CAT[featured.category].label}
              </span>
            )}
            <h2 style={{fontFamily:"Bebas Neue,cursive",fontSize:34,letterSpacing:2,color:"#fff",lineHeight:1.15,margin:"10px 0 12px",transition:"color .2s"}}
              className="news-title">{featured.title}</h2>
            <p style={{fontSize:14,color:"rgba(255,255,255,.45)",lineHeight:1.7,marginBottom:20}}>{featured.excerpt}</p>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>🕐 {timeAgo(featured.published_at)}</span>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>👁 {featured.views}</span>
              {featured.tags?.slice(0,3).map(t=>(
                <span key={t} style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:cx(.5),background:cx(.06),border:`1px solid ${cx(.1)}`,padding:"2px 8px",borderRadius:5}}>#{t}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* FILTERS + SEARCH */}
      <div style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:4,background:cx(.04),borderRadius:10,padding:4}}>
          {[["all","TOUS"],["tournament","TOURNOIS"],["update","UPDATES"],["player","JOUEURS"],["team","ÉQUIPES"],["general","GÉNÉRAL"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)}
              style={{padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:8,letterSpacing:1.5,
                background:filter===k?`linear-gradient(135deg,${CYAN},${INDIGO})`:"transparent",
                color:filter===k?"#000":"rgba(255,255,255,.4)",fontWeight:filter===k?700:400,transition:"all .2s"}}>
              {l}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
          style={{flex:1,minWidth:180,padding:"10px 16px",borderRadius:10,background:cx(.05),border:`1px solid ${cx(.1)}`,
            color:"#fff",fontFamily:"Space Grotesk,sans-serif",fontSize:13,outline:"none"}}/>
      </div>

      {/* GRID */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {filtered.map((a,i)=>{
          const cat=CAT[a.category]||CAT.general;
          return(
            <motion.div key={a.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}
              whileHover={{y:-4,transition:{duration:.15}}} onClick={()=>openArticle(a)}
              className="news-card"
              style={{cursor:"pointer",position:"relative",overflow:"hidden",background:CARD,border:`1px solid ${cx(.09)}`,
                borderRadius:14,padding:"22px 22px",boxShadow:`0 4px 20px rgba(0,0,0,.4)`,transition:"border-color .22s"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${cat.color},transparent)`,opacity:.6}}/>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:cat.color,background:cat.bg,padding:"3px 10px",borderRadius:6,letterSpacing:1,marginBottom:12,display:"inline-block"}}>
                {cat.label}
              </span>
              <h3 style={{fontSize:16,fontWeight:700,color:"#fff",lineHeight:1.35,margin:"10px 0 10px",transition:"color .2s"}} className="news-title">
                {a.title}
              </h3>
              <p style={{fontSize:12,color:"rgba(255,255,255,.35)",lineHeight:1.6,marginBottom:14}}>
                {a.excerpt?.slice(0,100)}{a.excerpt?.length>100?"...":""}
              </p>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.2)"}}>🕐 {timeAgo(a.published_at)}</span>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"rgba(255,255,255,.2)"}}>👁 {a.views}</span>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:cat.color,marginLeft:"auto"}}>LIRE →</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length===0&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,.2)"}}>AUCUN ARTICLE TROUVÉ</p>
        </div>
      )}
    </div>

    {/* ARTICLE MODAL */}
    <AnimatePresence>
      {selected&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{position:"fixed",inset:0,background:"rgba(2,8,23,.92)",backdropFilter:"blur(16px)",zIndex:50,overflowY:"auto",padding:"40px 20px"}}
          onClick={()=>setSelected(null)}>
          <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
            onClick={e=>e.stopPropagation()}
            style={{maxWidth:700,margin:"0 auto",background:CARD,border:`1px solid ${cx(.14)}`,borderRadius:20,
              boxShadow:`0 0 60px ${cx(.1)},0 32px 80px rgba(0,0,0,.7)`,overflow:"hidden"}}>
            {/* Top bar */}
            <div style={{height:3,background:`linear-gradient(90deg,${CYAN},${INDIGO},${VIOLET})`}}/>
            <div style={{padding:"28px 32px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                {CAT[selected.category]&&(
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:CAT[selected.category].color,background:CAT[selected.category].bg,padding:"4px 12px",borderRadius:6,letterSpacing:1}}>
                    {CAT[selected.category].label}
                  </span>
                )}
                <button onClick={()=>setSelected(null)}
                  style={{background:"none",border:`1px solid ${cx(.12)}`,color:"rgba(255,255,255,.4)",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:9}}>
                  ✕ FERMER
                </button>
              </div>
              <h2 style={{fontFamily:"Bebas Neue,cursive",fontSize:30,letterSpacing:2,color:"#fff",lineHeight:1.2,marginBottom:12}}>
                {selected.title}
              </h2>
              <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>🕐 {timeAgo(selected.published_at)}</span>
                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(255,255,255,.25)"}}>👁 {selected.views} vues</span>
                {selected.tags?.map(t=>(
                  <span key={t} style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:cx(.5),background:cx(.06),border:`1px solid ${cx(.1)}`,padding:"2px 8px",borderRadius:5}}>#{t}</span>
                ))}
              </div>
              <div style={{height:1,background:cx(.06),marginBottom:24}}/>
              <p style={{fontSize:14,color:"rgba(255,255,255,.6)",lineHeight:1.9}}>
                {selected.content||selected.excerpt}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>);
}