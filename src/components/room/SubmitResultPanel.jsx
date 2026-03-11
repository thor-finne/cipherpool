import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const CS_PTS = { 1: 10, 2: 6 };
const BR_PTS = { 1:12, 2:9, 3:8, 4:7, 5:6, 6:5, 7:4, 8:3, 9:2, 10:1, 11:1, 12:0 };

export default function SubmitResultPanel({ tournament, tournamentId, userId, onClose, onSubmitted }) {
  const [tData, setTData]   = useState(tournament || null);
  const [placement, setPlacement] = useState("");
  const [kills, setKills]   = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);

  // Get tournament data from tournamentId prop OR URL
  useEffect(() => {
    if (tData?.id) return;
    // Use tournamentId prop first, then URL fallback
    const tid = tournamentId || (() => {
      const segs = window.location.pathname.split("/");
      const idx  = segs.indexOf("tournaments");
      return idx !== -1 ? segs[idx + 1] : null;
    })();
    if (!tid) return;
    supabase.from("tournaments")
      .select("id,name,game_type,mode,cs_format")
      .eq("id", tid).maybeSingle()
      .then(({ data }) => { if (data) setTData(data); });
  }, [tournamentId]);

  // Check already submitted
  useEffect(() => {
    const tid = tData?.id || tournamentId;
    if (!tid || !userId) return;
    supabase.from("match_results").select("id")
      .eq("tournament_id", tid).eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (data) setDone(true); });
  }, [tData?.id, tournamentId, userId]);

  const tid  = tData?.id || tournamentId;
  const isCS = tData?.game_type === "cs"
            || ["1v1","2v2","4v4"].includes(tData?.mode)
            || ["1v1","2v2","4v4"].includes(tData?.cs_format);
  const maxP = isCS ? 2 : 12;
  const pNum = parseInt(placement) || 0;
  const kNum = parseInt(kills) || 0;
  const pPts = isCS ? (CS_PTS[pNum] || 0) : (BR_PTS[pNum] || 0);
  const total = pPts + kNum;
  const coins = total * 10;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError("Max 5MB"); return; }
    setScreenshot(f); setPreview(URL.createObjectURL(f)); setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!tid)                                  return setError("Tournoi introuvable — rafraîchissez");
    if (!pNum || pNum < 1 || pNum > maxP)      return setError(`Placement invalide (1–${maxP})`);
    if (kills === "" || kNum < 0 || kNum > 30) return setError("Kills invalides (0–30)");
    if (!screenshot)                           return setError("Capture d'écran obligatoire !");

    setLoading(true);
    try {
      const ext  = screenshot.name.split(".").pop();
      const path = `${tid}/${userId}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("screenshots").upload(path, screenshot, { upsert: true });
      if (upErr) throw new Error("Upload: " + upErr.message);

      const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);

      const { error: insErr } = await supabase.from("match_results").upsert({
        tournament_id:   tid,
        user_id:         userId,
        placement:       pNum,
        kills:           kNum,
        points:          total,
        estimated_coins: coins,
        screenshot_url:  urlData?.publicUrl,
        status:          "pending",
        submitted_at:    new Date().toISOString(),
      }, { onConflict: "tournament_id,user_id" });
      if (insErr) throw new Error(insErr.message);

      setDone(true);
      if (onSubmitted) onSubmitted();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={OVL} onClick={onClose}>
      <div style={MOD} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign:"center", padding:"32px 0" }}>
          <div style={{ fontSize:52 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#10b981", marginTop:12 }}>
            Résultat envoyé !
          </div>
          <div style={{ color:"#6b7280", marginTop:8, fontSize:13 }}>
            En attente de vérification par l'organisateur
          </div>
          <button onClick={onClose}
            style={{ ...BTN, marginTop:20, background:"rgba(255,255,255,0.08)" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={OVL} onClick={onClose}>
      <div style={MOD} onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:15, fontWeight:800, color:"#a78bfa", letterSpacing:1 }}>
            📊 SOUMETTRE RÉSULTAT
            {tData?.name && <span style={{ fontSize:11, color:"#6b7280", marginLeft:8 }}>· {tData.name}</span>}
          </span>
          <button onClick={onClose} style={CBTN}>✕</button>
        </div>

        <F label={`🏆 CLASSEMENT (1–${maxP})`}>
          <input type="number" min="1" max={maxP} value={placement}
            onChange={e => setPlacement(e.target.value)}
            placeholder={isCS ? "1 ou 2" : "1 à 12"} style={INP} />
        </F>

        <F label="🔫 KILLS (0–30)">
          <input type="number" min="0" max="30" value={kills}
            onChange={e => setKills(e.target.value)}
            placeholder="Nombre de kills" style={INP} />
        </F>

        {placement && kills !== "" && (
          <div style={{ background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.2)",
            borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#6b7280", marginBottom:8 }}>✦ APERÇU</div>
            <R l={`Classé n°${pNum}`} v={`+${pPts} pts`}  c="#a78bfa" />
            <R l={`Kills (${kNum})`}  v={`+${kNum} pts`}  c="#00d4ff" />
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", marginTop:6, paddingTop:6 }}>
              <R l="TOTAL"           v={`${total} pts`} c="#f59e0b" bold />
              <R l="Pièces estimées" v={`+${coins} 💰`} c="#fbbf24" />
            </div>
          </div>
        )}

        <F label="📸 CAPTURE D'ÉCRAN *OBLIGATOIRE*">
          <div onClick={() => document.getElementById("ss-inp").click()}
            style={{ border:`2px dashed ${preview?"rgba(16,185,129,0.5)":"rgba(139,92,246,0.3)"}`,
              borderRadius:10, padding:12, textAlign:"center",
              background:"rgba(0,0,0,0.2)", cursor:"pointer", minHeight:80 }}>
            {preview ? (
              <>
                <img src={preview} alt="" style={{ maxHeight:130, borderRadius:8, objectFit:"contain" }} />
                <div onClick={e=>{e.stopPropagation();setScreenshot(null);setPreview(null);}}
                  style={{ fontSize:11, color:"#ef4444", marginTop:4, cursor:"pointer" }}>
                  ✕ Supprimer
                </div>
              </>
            ) : (
              <div style={{ color:"#6b7280", fontSize:13, paddingTop:12 }}>
                <div style={{ fontSize:28 }}>📷</div>
                Cliquez pour choisir (max 5MB)
              </div>
            )}
          </div>
          <input id="ss-inp" type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
        </F>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:8, padding:"10px 14px", color:"#fca5a5", fontSize:13, marginBottom:12 }}>
            ✕ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ ...BTN, opacity:loading?0.7:1, cursor:loading?"wait":"pointer" }}>
          {loading ? "Envoi..." : "🚀 SOUMETTRE LE RÉSULTAT"}
        </button>
      </div>
    </div>
  );
}

const F = ({label,children}) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ fontSize:10, color:"#6b7280", fontWeight:700, letterSpacing:1, marginBottom:6 }}>{label}</div>
    {children}
  </div>
);
const R = ({l,v,c,bold}) => (
  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13,
    color:bold?"#e2e8f0":"#9ca3af", fontWeight:bold?700:400, marginBottom:3 }}>
    <span>{l}</span><span style={{color:c}}>{v}</span>
  </div>
);
const OVL = { position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999,
  display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)", padding:16 };
const MOD = { background:"linear-gradient(135deg,#0f0f1a,#1a0a2e)",
  border:"1px solid rgba(139,92,246,0.4)", borderRadius:16, padding:24,
  width:460, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto" };
const INP = { width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(139,92,246,0.3)",
  borderRadius:8, padding:"10px 14px", color:"#e2e8f0", fontSize:16,
  outline:"none", boxSizing:"border-box" };
const BTN = { width:"100%", padding:"14px 0", borderRadius:10, border:"none",
  background:"linear-gradient(135deg,#7c3aed,#4c1d95)", color:"#fff", fontWeight:800, fontSize:15 };
const CBTN = { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
  borderRadius:6, width:28, height:28, color:"#9ca3af", cursor:"pointer", fontSize:13 };