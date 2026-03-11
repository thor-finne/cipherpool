import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CYAN="#00d4ff", VIOLET="#a78bfa", AMBER="#fbbf24", RED="#f43f5e", GREEN="#10b981", INDIGO="#818cf8";
const BG="#020817", CARD="#0a1628";

const CATEGORIES = [
  { value:"general",    label:"Général",      color:INDIGO },
  { value:"tournament", label:"Tournois",     color:AMBER  },
  { value:"update",     label:"Mise à jour",  color:CYAN   },
  { value:"player",     label:"Joueur",       color:GREEN  },
  { value:"team",       label:"Équipe",       color:VIOLET },
];

const inp = {
  padding:"10px 14px", borderRadius:10,
  background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
  color:"#fff", fontFamily:"Space Grotesk,sans-serif", fontSize:14,
  outline:"none", width:"100%", boxSizing:"border-box",
};

export default function AdminNews() {
  const [articles, setArticles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");
  const [deleting, setDeleting]   = useState(null);

  const emptyForm = { title:"", excerpt:"", content:"", category:"general", cover_url:"", featured:false, tags:"" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchArticles(); }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const { data } = await supabase.from("news")
      .select("*").order("published_at", { ascending: false });
    setArticles(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setMsg("");
  };

  const openEdit = (article) => {
    setEditing(article);
    setForm({
      title:     article.title || "",
      excerpt:   article.excerpt || "",
      content:   article.content || "",
      category:  article.category || "general",
      cover_url: article.cover_url || "",
      featured:  article.featured || false,
      tags:      (article.tags || []).join(", "),
    });
    setShowForm(true);
    setMsg("");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.excerpt.trim()) {
      setMsg("❌ Titre et résumé obligatoires"); return;
    }
    setSaving(true);
    const payload = {
      title:        form.title.trim(),
      excerpt:      form.excerpt.trim(),
      content:      form.content.trim() || null,
      category:     form.category,
      cover_url:    form.cover_url.trim() || null,
      featured:     form.featured,
      tags:         form.tags ? form.tags.split(",").map(t=>t.trim()).filter(Boolean) : [],
      published_at: editing?.published_at || new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("news").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("news").insert([payload]));
    }

    setSaving(false);
    if (error) { setMsg("❌ Erreur: " + error.message); return; }
    setMsg(editing ? "✅ Article modifié !" : "✅ Article publié !");
    setShowForm(false);
    fetchArticles();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet article ?")) return;
    setDeleting(id);
    await supabase.from("news").delete().eq("id", id);
    setDeleting(null);
    fetchArticles();
  };

  const toggleFeatured = async (article) => {
    await supabase.from("news").update({ featured: !article.featured }).eq("id", article.id);
    fetchArticles();
  };

  const getCat = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[0];

  return (
    <div style={{ minHeight:"100vh", background:BG, color:"#fff", padding:"32px 28px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
        <div>
          <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:3, color:"rgba(255,255,255,.3)", marginBottom:6 }}>
            ADMIN · GESTION
          </p>
          <h1 style={{ fontFamily:"Bebas Neue,cursive", fontSize:38, letterSpacing:3, background:`linear-gradient(135deg,${CYAN},${VIOLET})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
            📰 ACTUALITÉS
          </h1>
          <p style={{ fontFamily:"Space Grotesk,sans-serif", fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>
            {articles.length} article{articles.length !== 1 ? "s" : ""} publiés
          </p>
        </div>
        <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:.96 }}
          onClick={openCreate}
          style={{ padding:"12px 24px", borderRadius:12, background:`linear-gradient(135deg,${CYAN},${VIOLET})`, border:"none", color:"#000", fontFamily:"JetBrains Mono,monospace", fontSize:11, letterSpacing:2, fontWeight:700, cursor:"pointer" }}>
          ✍️ NOUVEL ARTICLE
        </motion.button>
      </div>

      {/* Success msg */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ padding:"12px 20px", borderRadius:10, background: msg.startsWith("✅") ? "rgba(16,185,129,.15)" : "rgba(244,63,94,.15)",
              border:`1px solid ${msg.startsWith("✅") ? GREEN : RED}44`, marginBottom:24,
              fontFamily:"Space Grotesk,sans-serif", fontSize:13, color: msg.startsWith("✅") ? GREEN : RED }}>
            {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Article Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
            <motion.div initial={{ scale:.95, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:.95, y:20 }}
              style={{ background:CARD, borderRadius:20, border:"1px solid rgba(255,255,255,.08)", padding:32, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto" }}>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <h2 style={{ fontFamily:"Bebas Neue,cursive", fontSize:24, letterSpacing:2, color:CYAN, margin:0 }}>
                  {editing ? "✏️ MODIFIER L'ARTICLE" : "✍️ NOUVEL ARTICLE"}
                </h2>
                <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.4)", fontSize:20, cursor:"pointer" }}>✕</button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Title */}
                <div>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", marginBottom:6 }}>TITRE *</p>
                  <input value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))}
                    placeholder="Titre de l'article..." style={inp} />
                </div>

                {/* Excerpt */}
                <div>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", marginBottom:6 }}>RÉSUMÉ * (affiché dans la liste)</p>
                  <textarea value={form.excerpt} onChange={e => setForm(f=>({...f, excerpt:e.target.value}))}
                    placeholder="Courte description..." rows={3}
                    style={{ ...inp, resize:"vertical" }} />
                </div>

                {/* Content */}
                <div>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", marginBottom:6 }}>CONTENU COMPLET</p>
                  <textarea value={form.content} onChange={e => setForm(f=>({...f, content:e.target.value}))}
                    placeholder="Contenu détaillé de l'article..." rows={6}
                    style={{ ...inp, resize:"vertical" }} />
                </div>

                {/* Category + Featured */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, alignItems:"end" }}>
                  <div>
                    <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", marginBottom:6 }}>CATÉGORIE</p>
                    <select value={form.category} onChange={e => setForm(f=>({...f, category:e.target.value}))}
                      style={{ ...inp, colorScheme:"dark" }}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:2 }}>
                    <input type="checkbox" id="featured" checked={form.featured}
                      onChange={e => setForm(f=>({...f, featured:e.target.checked}))}
                      style={{ width:16, height:16, accentColor:AMBER }} />
                    <label htmlFor="featured" style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:AMBER, cursor:"pointer" }}>
                      ⭐ À LA UNE
                    </label>
                  </div>
                </div>

                {/* Cover URL */}
                <div>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", marginBottom:6 }}>IMAGE DE COUVERTURE (URL)</p>
                  <input value={form.cover_url} onChange={e => setForm(f=>({...f, cover_url:e.target.value}))}
                    placeholder="https://..." style={inp} />
                </div>

                {/* Tags */}
                <div>
                  <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", marginBottom:6 }}>TAGS (séparés par virgule)</p>
                  <input value={form.tags} onChange={e => setForm(f=>({...f, tags:e.target.value}))}
                    placeholder="tournament, saison3, update..." style={inp} />
                </div>

                {msg && <p style={{ color: msg.startsWith("❌") ? RED : GREEN, fontFamily:"Space Grotesk,sans-serif", fontSize:13 }}>{msg}</p>}

                {/* Actions */}
                <div style={{ display:"flex", gap:10, marginTop:8 }}>
                  <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}
                    onClick={handleSave} disabled={saving}
                    style={{ flex:1, padding:"13px 0", borderRadius:12, background:`linear-gradient(135deg,${CYAN},${VIOLET})`, border:"none", color:"#000", fontFamily:"JetBrains Mono,monospace", fontSize:11, letterSpacing:2, fontWeight:700, cursor:"pointer" }}>
                    {saving ? "ENREGISTREMENT..." : editing ? "💾 MODIFIER" : "🚀 PUBLIER"}
                  </motion.button>
                  <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}
                    onClick={() => setShowForm(false)}
                    style={{ padding:"13px 20px", borderRadius:12, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontFamily:"JetBrains Mono,monospace", fontSize:11, cursor:"pointer" }}>
                    ANNULER
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Articles List */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.3)", fontFamily:"JetBrains Mono,monospace", fontSize:12, letterSpacing:2 }}>
          CHARGEMENT...
        </div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 0" }}>
          <p style={{ fontSize:40, marginBottom:16 }}>📭</p>
          <p style={{ fontFamily:"JetBrains Mono,monospace", fontSize:11, letterSpacing:2, color:"rgba(255,255,255,.3)" }}>AUCUN ARTICLE PUBLIÉ</p>
          <p style={{ fontFamily:"Space Grotesk,sans-serif", fontSize:13, color:"rgba(255,255,255,.2)", marginTop:8 }}>Créez votre premier article ci-dessus</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {articles.map((article, i) => {
            const cat = getCat(article.category);
            return (
              <motion.div key={article.id}
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}
                style={{ background:CARD, borderRadius:14, border:"1px solid rgba(255,255,255,.06)", padding:"20px 24px", display:"flex", gap:20, alignItems:"center" }}>

                {/* Cover thumbnail */}
                {article.cover_url ? (
                  <div style={{ width:80, height:56, borderRadius:8, overflow:"hidden", flexShrink:0 }}>
                    <img src={article.cover_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ) : (
                  <div style={{ width:80, height:56, borderRadius:8, background:"rgba(255,255,255,.04)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                    📰
                  </div>
                )}

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <span style={{ background:cat.color+"22", color:cat.color, padding:"2px 10px", borderRadius:6, fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:1 }}>
                      {cat.label}
                    </span>
                    {article.featured && (
                      <span style={{ background:`${AMBER}22`, color:AMBER, padding:"2px 10px", borderRadius:6, fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:1 }}>
                        ⭐ UNE
                      </span>
                    )}
                    <span style={{ fontFamily:"JetBrains Mono,monospace", fontSize:9, color:"rgba(255,255,255,.25)", marginLeft:"auto" }}>
                      {new Date(article.published_at).toLocaleDateString("fr-FR")} · {article.views || 0} vues
                    </span>
                  </div>
                  <p style={{ fontFamily:"Space Grotesk,sans-serif", fontSize:14, fontWeight:600, color:"#fff", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {article.title}
                  </p>
                  <p style={{ fontFamily:"Space Grotesk,sans-serif", fontSize:12, color:"rgba(255,255,255,.4)", margin:"4px 0 0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {article.excerpt}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:.94 }}
                    onClick={() => toggleFeatured(article)}
                    title={article.featured ? "Retirer de la une" : "Mettre à la une"}
                    style={{ padding:"8px 12px", borderRadius:8, background: article.featured ? `${AMBER}22` : "rgba(255,255,255,.06)", border:`1px solid ${article.featured ? AMBER+"44" : "rgba(255,255,255,.1)"}`, color: article.featured ? AMBER : "rgba(255,255,255,.4)", fontSize:14, cursor:"pointer" }}>
                    ⭐
                  </motion.button>
                  <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:.94 }}
                    onClick={() => openEdit(article)}
                    style={{ padding:"8px 14px", borderRadius:8, background:`${CYAN}18`, border:`1px solid ${CYAN}33`, color:CYAN, fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:1, cursor:"pointer" }}>
                    ✏️ ÉDITER
                  </motion.button>
                  <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:.94 }}
                    onClick={() => handleDelete(article.id)} disabled={deleting === article.id}
                    style={{ padding:"8px 14px", borderRadius:8, background:`${RED}18`, border:`1px solid ${RED}33`, color:RED, fontFamily:"JetBrains Mono,monospace", fontSize:9, letterSpacing:1, cursor:"pointer" }}>
                    {deleting === article.id ? "..." : "🗑️"}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}