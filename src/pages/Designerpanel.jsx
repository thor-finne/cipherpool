import { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ITEM_TYPES = [
  { value: "avatar",     label: "Avatar",       icon: "🎭", desc: "Photo de profil personnalisée" },
  { value: "banner",     label: "Bannière",     icon: "🖼️", desc: "Arrière-plan du profil" },
  { value: "badge",      label: "Badge",        icon: "🏅", desc: "Insigne de vérification" },
  { value: "name_color", label: "Nom Coloré",   icon: "✨", desc: "Couleur du nom en jeu" },
  { value: "frame",      label: "Cadre",        icon: "💠", desc: "Cadre autour de l'avatar" },
  { value: "emote",      label: "Emote",        icon: "😎", desc: "Emote utilisable en chat" },
];

const RARITIES = [
  { value: "common",    label: "Commun",    color: "#9ca3af", price: 300  },
  { value: "rare",      label: "Rare",      color: "#3b82f6", price: 600  },
  { value: "epic",      label: "Épique",    color: "#a855f7", price: 1000 },
  { value: "legendary", label: "Légendaire",color: "#f59e0b", price: 2000 },
];

const SOURCES = [
  { value: "store",        label: "Boutique (achat)" },
  { value: "achievement",  label: "Réalisation" },
  { value: "event",        label: "Événement" },
  { value: "season_pass",  label: "Season Pass" },
  { value: "admin_grant",  label: "Don Admin" },
];

const RARITY_CONFIG = {
  common:    { color: "#9ca3af", bg: "#9ca3af15", label: "COMMUN" },
  rare:      { color: "#3b82f6", bg: "#3b82f615", label: "RARE" },
  epic:      { color: "#a855f7", bg: "#a855f715", label: "ÉPIQUE" },
  legendary: { color: "#f59e0b", bg: "#f59e0b15", label: "LÉGEND." },
};

const EMPTY_FORM = {
  name: "", description: "", type: "avatar", rarity: "common",
  price: 300, color_value: "#7c3aed", limited: false, limited_until: "",
  daily_rotation: false, source: "store", sort_order: 0,
};

// ─── ITEM PREVIEW ────────────────────────────────────────────────────────────
function ItemPreview({ form, imageUrl }) {
  const rc = RARITY_CONFIG[form.rarity] || RARITY_CONFIG.common;
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      border: `1px solid ${rc.color}40`,
      background: "#08031a",
      boxShadow: `0 0 30px ${rc.color}20`,
      maxWidth: 220,
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${rc.color}, transparent)` }} />
      <div style={{
        height: 150, display: "flex", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(circle, ${rc.color}25, transparent 70%)`,
        position: "relative",
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt="preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 56, filter: `drop-shadow(0 0 12px ${rc.color})` }}>
            {ITEM_TYPES.find(t => t.value === form.type)?.icon || "🎮"}
          </div>
        )}
        {form.type === "name_color" && form.color_value && (
          <div style={{
            position: "absolute", bottom: 8,
            fontFamily: "Orbitron, sans-serif", fontSize: 13, fontWeight: 700,
            color: form.color_value, textShadow: `0 0 12px ${form.color_value}`,
          }}>
            VOTRE NOM
          </div>
        )}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: rc.color,
            background: rc.bg, padding: "2px 6px", borderRadius: 4 }}>
            {rc.label}
          </span>
          {form.limited && (
            <span style={{ fontSize: 9, background: "#ef444420", color: "#ef4444",
              padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>LIMITÉ</span>
          )}
        </div>
        <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 14, fontWeight: 700,
          color: "#fff", marginBottom: 4 }}>
          {form.name || "Nom de l'item"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
          {form.description || "Description..."}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontFamily: "Orbitron, sans-serif", fontWeight: 700, color: "#f59e0b" }}>
            💰 {(form.price || 0).toLocaleString()}
          </span>
          {form.source !== "store" && (
            <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>GRATUIT</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DESIGNER PANEL ─────────────────────────────────────────────────────
export default function DesignerPanel() {
  const { profile }  = useOutletContext();
  const navigate     = useNavigate();
  const fileRef      = useRef(null);

  const [tab, setTab]             = useState("create");
  const [form, setForm]           = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [items, setItems]         = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editItem, setEditItem]   = useState(null);

  // Access check
  useEffect(() => {
    if (!["designer","admin","super_admin"].includes(profile?.role)) {
      navigate("/dashboard");
    }
  }, [profile]);

  useEffect(() => {
    if (tab === "manage") fetchItems();
  }, [tab]);

  const fetchItems = async () => {
    setLoadingItems(true);
    const { data } = await supabase
      .from("store_items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoadingItems(false);
  };

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    const ext  = imageFile.name.split(".").pop();
    const path = `items/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("store-items")
      .upload(path, imageFile, { upsert: true });
    if (error) throw new Error("Upload image: " + error.message);
    const { data } = supabase.storage.from("store-items").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { notify("Nom obligatoire", "error"); return; }
    if (form.source === "store" && form.price < 0) { notify("Prix invalide", "error"); return; }
    setSaving(true);

    try {
      let url = imageUrl;

      // Upload image if new file selected
      if (imageFile) {
        setUploading(true);
        url = await uploadImage();
        setUploading(false);
      }

      const payload = {
        ...form,
        image_url:   url || null,
        price:       form.source !== "store" ? 0 : parseInt(form.price) || 0,
        created_by:  profile.id,
        // super_admin & admin: auto-approve. designer: needs approval
        approved:    ["super_admin","admin"].includes(profile.role),
        approved_by: ["super_admin","admin"].includes(profile.role) ? profile.id : null,
        limited_until: form.limited && form.limited_until ? form.limited_until : null,
      };

      if (editItem) {
        const { error } = await supabase
          .from("store_items")
          .update(payload)
          .eq("id", editItem.id);
        if (error) throw error;
        notify("✅ Item mis à jour !");
        setEditItem(null);
      } else {
        const { error } = await supabase
          .from("store_items")
          .insert([payload]);
        if (error) throw error;
        notify(
          ["super_admin","admin"].includes(profile.role)
            ? "✅ Item créé et publié !"
            : "✅ Item créé — en attente d'approbation"
        );
      }

      setForm(EMPTY_FORM);
      setImageFile(null);
      setImageUrl("");
      if (fileRef.current) fileRef.current.value = "";

    } catch (err) {
      notify(err.message || "Erreur", "error");
    }
    setSaving(false);
  };

  const toggleActive = async (item) => {
    await supabase.from("store_items")
      .update({ active: !item.active })
      .eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
    notify(item.active ? "🔴 Item désactivé" : "✅ Item activé");
  };

  const deleteItem = async (id) => {
    if (!confirm("Supprimer cet item ?")) return;
    await supabase.from("store_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    notify("🗑️ Item supprimé");
  };

  const startEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, description: item.description || "",
      type: item.type, rarity: item.rarity,
      price: item.price, color_value: item.color_value || "#7c3aed",
      limited: item.limited, limited_until: item.limited_until || "",
      daily_rotation: item.daily_rotation, source: item.source,
      sort_order: item.sort_order || 0,
    });
    setImageUrl(item.image_url || "");
    setImageFile(null);
    setTab("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const upd = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 99px; }
        input, textarea, select {
          font-family: 'Rajdhani', sans-serif;
        }
        .field-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 6px;
          display: block;
          font-family: 'Rajdhani', sans-serif;
        }
        .field-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          font-family: 'Rajdhani', sans-serif;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .field-input:focus { border-color: rgba(124,58,237,0.6); }
        .field-input option { background: #0d0e1f; }
      `}</style>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -30, x: "-50%" }}
            style={{
              position: "fixed", top: 20, left: "50%", zIndex: 9999,
              padding: "12px 24px", borderRadius: 10,
              background: notification.type === "error" ? "#1a0505" : "#050d1a",
              border: `1px solid ${notification.type === "error" ? "#ef4444" : "#7c3aed"}`,
              color: notification.type === "error" ? "#ef4444" : "#fff",
              fontSize: 14, fontWeight: 600,
              boxShadow: `0 8px 30px rgba(0,0,0,0.5)`,
            }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ minHeight: "100vh", background: "#030014", color: "#fff", fontFamily: "Rajdhani, sans-serif" }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: "28px 32px 24px",
          background: "linear-gradient(180deg, rgba(124,58,237,0.1), transparent)",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: "linear-gradient(135deg, #a855f7, #ec4899)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, boxShadow: "0 8px 25px rgba(168,85,247,0.4)",
              }}>
                🎨
              </div>
              <div>
                <h1 style={{ fontFamily: "Orbitron", fontSize: 20, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: 2 }}>
                  DESIGNER <span style={{ color: "#a855f7" }}>PANEL</span>
                </h1>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 2, margin: 0 }}>
                  GESTION DES ITEMS DU STORE
                </p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 10,
                background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
                <span style={{ fontSize: 12 }}>🎨</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", letterSpacing: 1.5 }}>
                  {profile?.role?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(3,0,20,0.97)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 0 }}>
            {[
              { key: "create",  label: editItem ? "MODIFIER L'ITEM" : "CRÉER UN ITEM", icon: "➕" },
              { key: "manage",  label: "GÉRER LES ITEMS",    icon: "⚙️" },
              { key: "pending", label: "EN ATTENTE",          icon: "⏳" },
            ].map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "manage" || t.key === "pending") fetchItems(); }}
                style={{
                  padding: "14px 20px", background: "transparent", border: "none",
                  borderBottom: `2px solid ${tab === t.key ? "#a855f7" : "transparent"}`,
                  color: tab === t.key ? "#fff" : "rgba(255,255,255,0.3)",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                  cursor: "pointer", transition: "all 0.2s",
                  fontFamily: "Rajdhani, sans-serif",
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>

          {/* ════════════ TAB: CREATE / EDIT ════════════ */}
          {tab === "create" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 28, alignItems: "start" }}>

              {/* Left: Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {editItem && (
                  <div style={{
                    padding: "12px 16px", borderRadius: 10,
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600 }}>
                      ✏️ Mode édition — {editItem.name}
                    </span>
                    <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setImageUrl(""); setImageFile(null); }}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>
                      ✕
                    </button>
                  </div>
                )}

                {/* Nom + Type */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="field-label">NOM DE L'ITEM *</label>
                    <input
                      className="field-input"
                      placeholder="Ex: Dragon Avatar..."
                      value={form.name}
                      onChange={e => upd("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">TYPE *</label>
                    <select className="field-input" value={form.type} onChange={e => upd("type", e.target.value)}>
                      {ITEM_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="field-label">DESCRIPTION</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    placeholder="Description de l'item..."
                    value={form.description}
                    onChange={e => upd("description", e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </div>

                {/* Rarity + Price */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="field-label">RARETÉ *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {RARITIES.map(r => (
                        <button
                          key={r.value}
                          onClick={() => { upd("rarity", r.value); upd("price", r.price); }}
                          style={{
                            padding: "10px", borderRadius: 8, cursor: "pointer",
                            border: `1px solid ${form.rarity === r.value ? r.color : "rgba(255,255,255,0.1)"}`,
                            background: form.rarity === r.value ? `${r.color}20` : "rgba(255,255,255,0.03)",
                            color: form.rarity === r.value ? r.color : "rgba(255,255,255,0.4)",
                            fontSize: 11, fontWeight: 700, letterSpacing: 1,
                            fontFamily: "Rajdhani, sans-serif",
                            transition: "all 0.2s",
                          }}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="field-label">SOURCE</label>
                    <select className="field-input" value={form.source} onChange={e => upd("source", e.target.value)}>
                      {SOURCES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price (only for store source) */}
                {form.source === "store" && (
                  <div>
                    <label className="field-label">PRIX (COINS)</label>
                    <input
                      className="field-input"
                      type="number" min={0} step={50}
                      value={form.price}
                      onChange={e => upd("price", parseInt(e.target.value) || 0)}
                    />
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      {[300, 500, 700, 1000, 1500, 2000].map(p => (
                        <button key={p} onClick={() => upd("price", p)}
                          style={{
                            padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11,
                            border: `1px solid ${form.price === p ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                            background: form.price === p ? "rgba(124,58,237,0.2)" : "transparent",
                            color: form.price === p ? "#a855f7" : "rgba(255,255,255,0.35)",
                            fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
                          }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color value for name_color type */}
                {form.type === "name_color" && (
                  <div>
                    <label className="field-label">COULEUR DU NOM</label>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input
                        type="color" value={form.color_value}
                        onChange={e => upd("color_value", e.target.value)}
                        style={{ width: 50, height: 40, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                          background: "none", cursor: "pointer", padding: 2 }}
                      />
                      <input
                        className="field-input"
                        style={{ flex: 1 }}
                        placeholder="#ff0000"
                        value={form.color_value}
                        onChange={e => upd("color_value", e.target.value)}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        {["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7","#ec4899","#ffffff"].map(c => (
                          <div key={c} onClick={() => upd("color_value", c)}
                            style={{ width: 24, height: 24, borderRadius: "50%", background: c,
                              border: form.color_value === c ? "2px solid #fff" : "2px solid transparent",
                              cursor: "pointer" }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontFamily: "Orbitron", fontSize: 14, fontWeight: 700,
                      color: form.color_value, textShadow: `0 0 10px ${form.color_value}` }}>
                      Aperçu: Votre Nom
                    </div>
                  </div>
                )}

                {/* Image upload */}
                <div>
                  <label className="field-label">IMAGE DE L'ITEM</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: "2px dashed rgba(124,58,237,0.3)", borderRadius: 12,
                      padding: "24px", textAlign: "center", cursor: "pointer",
                      background: "rgba(124,58,237,0.04)", transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"}
                  >
                    {imageUrl ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
                        <img src={imageUrl} alt="preview"
                          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10 }} />
                        <div>
                          <p style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>✅ Image sélectionnée</p>
                          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Cliquer pour changer</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Cliquer pour choisir une image</p>
                        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 4 }}>PNG, JPG, GIF, WEBP • Max 5MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={handleImageSelect} />
                </div>

                {/* Options */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="field-label">OPTIONS</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { key: "limited", label: "Item Limité ⏳" },
                        { key: "daily_rotation", label: "Rotation Quotidienne 🔄" },
                      ].map(opt => (
                        <label key={opt.key} style={{
                          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                          padding: "10px 12px", borderRadius: 8,
                          background: form[opt.key] ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${form[opt.key] ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)"}`,
                          transition: "all 0.2s",
                        }}>
                          <input type="checkbox" checked={form[opt.key]}
                            onChange={e => upd(opt.key, e.target.checked)}
                            style={{ accentColor: "#7c3aed", width: 16, height: 16 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="field-label">ORDRE D'AFFICHAGE</label>
                    <input className="field-input" type="number" min={0}
                      value={form.sort_order}
                      onChange={e => upd("sort_order", parseInt(e.target.value) || 0)} />
                    {form.limited && (
                      <div style={{ marginTop: 12 }}>
                        <label className="field-label">DATE DE FIN</label>
                        <input className="field-input" type="datetime-local"
                          value={form.limited_until}
                          onChange={e => upd("limited_until", e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  style={{
                    padding: "16px", borderRadius: 12,
                    background: saving ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                    border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                    letterSpacing: 2, cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "Orbitron, sans-serif",
                    boxShadow: "0 8px 25px rgba(124,58,237,0.35)",
                    transition: "all 0.2s",
                  }}
                >
                  {uploading ? "⏫ UPLOAD EN COURS..." : saving ? "💾 SAUVEGARDE..." :
                   editItem ? "✏️ METTRE À JOUR" :
                   ["super_admin","admin"].includes(profile?.role) ? "🚀 CRÉER ET PUBLIER" : "📤 SOUMETTRE POUR APPROBATION"}
                </button>

                {!["super_admin","admin"].includes(profile?.role) && (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center", letterSpacing: 1 }}>
                    ⚠️ Les items des designers nécessitent une approbation admin avant publication
                  </p>
                )}
              </div>

              {/* Right: Preview */}
              <div style={{ position: "sticky", top: 80 }}>
                <label className="field-label" style={{ marginBottom: 12 }}>APERÇU ITEM</label>
                <ItemPreview form={form} imageUrl={imageUrl} />

                {/* Type info */}
                <div style={{
                  marginTop: 16, padding: "14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginBottom: 8 }}>
                    INFO TYPE
                  </div>
                  {ITEM_TYPES.filter(t => t.value === form.type).map(t => (
                    <div key={t.value} style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rarity colors reference */}
                <div style={{
                  marginTop: 12, padding: "14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginBottom: 10 }}>
                    GUIDE PRIX RARETÉ
                  </div>
                  {RARITIES.map(r => (
                    <div key={r.value} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: r.color, fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>~{r.price} coins</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════ TAB: MANAGE ════════════ */}
          {(tab === "manage" || tab === "pending") && (
            <div>
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  {tab === "pending" ? "Items en attente d'approbation" : `${items.length} items au total`}
                </div>
                <button onClick={fetchItems}
                  style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)",
                    cursor: "pointer", fontSize: 11, fontFamily: "Rajdhani, sans-serif" }}>
                  🔄 Rafraîchir
                </button>
              </div>

              {loadingItems ? (
                <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Chargement...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {items
                    .filter(item => tab === "pending" ? !item.approved : true)
                    .map(item => {
                      const rc = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            display: "flex", alignItems: "center", gap: 16,
                            padding: "14px 18px", borderRadius: 12,
                            background: "#08031a",
                            border: `1px solid ${item.active && item.approved ? "rgba(255,255,255,0.07)" : "rgba(239,68,68,0.2)"}`,
                            opacity: item.active ? 1 : 0.6,
                          }}
                        >
                          {/* Image */}
                          <div style={{
                            width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                            background: `radial-gradient(circle, ${rc.color}30, transparent)`,
                            border: `1px solid ${rc.color}30`,
                            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                          }}>
                            {item.image_url
                              ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <span style={{ fontSize: 24 }}>{ITEM_TYPES.find(t => t.value === item.type)?.icon}</span>
                            }
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{item.name}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, color: rc.color,
                                background: rc.bg, padding: "2px 6px", borderRadius: 4 }}>
                                {rc.label}
                              </span>
                              {!item.approved && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b",
                                  background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                                  EN ATTENTE
                                </span>
                              )}
                              {item.limited && (
                                <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700 }}>⏳ LIMITÉ</span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 14 }}>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                                {ITEM_TYPES.find(t => t.value === item.type)?.icon} {item.type}
                              </span>
                              <span style={{ fontSize: 11, color: "#f59e0b" }}>💰 {item.price}</span>
                              <span style={{ fontSize: 11, color: item.active ? "#10b981" : "#ef4444" }}>
                                {item.active ? "● Actif" : "● Inactif"}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            {/* Approve (admin/super_admin only for pending) */}
                            {!item.approved && ["admin","super_admin"].includes(profile?.role) && (
                              <button
                                onClick={async () => {
                                  await supabase.from("store_items")
                                    .update({ approved: true, approved_by: profile.id })
                                    .eq("id", item.id);
                                  fetchItems();
                                  notify("✅ Item approuvé !");
                                }}
                                style={{
                                  padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                                  background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
                                  color: "#10b981", fontSize: 11, fontWeight: 700,
                                  fontFamily: "Rajdhani, sans-serif",
                                }}
                              >
                                ✅ APPROUVER
                              </button>
                            )}

                            <button onClick={() => toggleActive(item)}
                              style={{
                                padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                                background: item.active ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                border: `1px solid ${item.active ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                                color: item.active ? "#ef4444" : "#10b981",
                                fontSize: 11, fontWeight: 700, fontFamily: "Rajdhani, sans-serif",
                              }}>
                              {item.active ? "🔴 DÉSACTIVER" : "✅ ACTIVER"}
                            </button>

                            <button onClick={() => startEdit(item)}
                              style={{
                                padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                                background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
                                color: "#a855f7", fontSize: 11, fontWeight: 700,
                                fontFamily: "Rajdhani, sans-serif",
                              }}>
                              ✏️ MODIFIER
                            </button>

                            {["admin","super_admin"].includes(profile?.role) && (
                              <button onClick={() => deleteItem(item.id)}
                                style={{
                                  padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                                  color: "#ef4444", fontSize: 14, fontFamily: "Rajdhani, sans-serif",
                                }}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                  {items.filter(i => tab === "pending" ? !i.approved : true).length === 0 && (
                    <div style={{ textAlign: "center", padding: 60 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>
                        {tab === "pending" ? "✅" : "📦"}
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
                        {tab === "pending" ? "Aucun item en attente" : "Aucun item créé"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}