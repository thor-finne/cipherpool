import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function CreateTournament() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    game_type: "battle_royale",
    mode: "solo",
    cs_format: "2v2",   // Clash Squad format
    max_players: 50,
    entry_fee: 0,
    prize_coins: 500,
    start_date: "",
    banner_url: "",
    background_color: "#6D28D9"
  });

  // Auto-calculate max_players for Clash Squad
  const CS_FORMATS = {
    "1v1": { players: 2,  teams: 2, per_team: 1, label: "1 vs 1" },
    "2v2": { players: 4,  teams: 2, per_team: 2, label: "2 vs 2" },
    "4v4": { players: 8,  teams: 2, per_team: 4, label: "4 vs 4" },
  };

  const handleGameTypeChange = (game_type) => {
    if (game_type === "cs") {
      const fmt = CS_FORMATS[formData.cs_format];
      setFormData(p => ({ ...p, game_type, mode: "squad", max_players: fmt.players }));
    } else {
      setFormData(p => ({ ...p, game_type, mode: "solo", max_players: 50 }));
    }
  };

  const handleCsFormatChange = (cs_format) => {
    const fmt = CS_FORMATS[cs_format];
    setFormData(p => ({ ...p, cs_format, max_players: fmt.players, mode: cs_format }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    // التحقق من حجم الملف (أقل من 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("❌ Image size must be less than 5MB");
      return;
    }

    // التحقق من نوع الملف
    if (!file.type.startsWith("image/")) {
      alert("❌ Please upload an image file");
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    // محاكاة progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `tournament-banners/${fileName}`;

    console.log("Uploading to:", filePath);
    console.log("File size:", file.size, "bytes");

    try {
      const { error: uploadError } = await supabase.storage
        .from("tournament-banners")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      clearInterval(progressInterval);
      
      if (uploadError) {
        console.error("Upload error details:", uploadError);
        
        if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
          alert("❌ Permission denied. Please check storage policies in Supabase.");
        } else if (uploadError.message.includes("duplicate")) {
          alert("❌ A file with this name already exists. Try again.");
        } else if (uploadError.message.includes("Bucket not found")) {
          alert("❌ Storage bucket 'tournament-banners' not found. Please create it in Supabase Dashboard.");
        } else {
          alert("Error uploading image: " + uploadError.message);
        }
        
        setUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);

      const { data } = supabase.storage
        .from("tournament-banners")
        .getPublicUrl(filePath);

      console.log("Upload successful, public URL:", data.publicUrl);
      
      setFormData({...formData, banner_url: data.publicUrl});
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        alert("✅ Image uploaded successfully!");
      }, 500);
      
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred during upload.");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // التحقق من الحقول المطلوبة
    if (!formData.name) {
      alert("❌ Tournament name is required");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("❌ You must be logged in");
      navigate("/login");
      return;
    }

    // ✅ معالجة آمنة للتاريخ
    let startDate = null;
    if (formData.start_date) {
      try {
        const date = new Date(formData.start_date);
        // التحقق من صحة التاريخ
        if (!isNaN(date.getTime())) {
          startDate = date.toISOString();
        } else {
          console.warn("Invalid date format, ignoring");
        }
      } catch (err) {
        console.warn("Error parsing date:", err);
      }
    }

    // تحويل القيم الرقمية
    const tournamentData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      game_type: formData.game_type,
      mode: formData.game_type === "cs" ? formData.cs_format : formData.mode,
      cs_format: formData.game_type === "cs" ? formData.cs_format : null,
      team_size: formData.game_type === "cs" ? CS_FORMATS[formData.cs_format]?.per_team : null,
      max_players: formData.game_type === "cs" 
        ? CS_FORMATS[formData.cs_format]?.players 
        : parseInt(formData.max_players) || 50,
      entry_fee: parseInt(formData.entry_fee) || 0,
      prize_coins: parseInt(formData.prize_coins) || 500,
      start_date: startDate, // ✅ التاريخ الآمن
      banner_url: formData.banner_url || null,
      background_color: formData.background_color || "#6D28D9",
      created_by: user.id,
      status: "open",
      room_status: "registration",
      current_players: 0
    };

    console.log("Submitting tournament:", tournamentData);

    try {
      const { error } = await supabase
        .from("tournaments")
        .insert([tournamentData]);

      if (error) {
        console.error("Error creating tournament:", error);
        
        if (error.message.includes("duplicate key")) {
          alert("❌ A tournament with this name already exists");
        } else if (error.message.includes("foreign key")) {
          alert("❌ Invalid user reference");
        } else {
          alert("Error creating tournament: " + error.message);
        }
      } else {
        alert("✅ Tournament created successfully!");
        navigate("/tournaments");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      <div className="max-w-3xl mx-auto px-8 py-12">
        
        <h1 className="text-4xl font-bold mb-2">Create Tournament</h1>
        <p className="text-white/40 mb-8">Fill in the details to create a new tournament</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Tournament Name */}
          <div>
            <label className="block text-sm text-white/40 mb-2">
              Tournament Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-[#11151C] border border-white/10 rounded-lg text-white focus:border-purple-500/50 transition"
              placeholder="Enter tournament name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/40 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-[#11151C] border border-white/10 rounded-lg text-white h-24 focus:border-purple-500/50 transition"
              placeholder="Describe your tournament (rules, prizes, etc.)"
            />
          </div>

          {/* Banner Image and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/40 mb-2">Banner Image</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files[0])}
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 disabled:opacity-50"
                />
                
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-purple-400">Uploading... {uploadProgress}%</p>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {formData.banner_url && !uploading && (
                  <div className="relative">
                    <img 
                      src={formData.banner_url} 
                      alt="Banner preview" 
                      className="w-full h-32 object-cover rounded-lg border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, banner_url: ""})}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/40 mb-2">Accent Color</label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({...formData, background_color: e.target.value})}
                    className="w-12 h-12 bg-[#1A1F2B] border border-white/10 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => setFormData({...formData, background_color: e.target.value})}
                    className="flex-1 px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white focus:border-purple-500/50 transition"
                    placeholder="#6D28D9"
                  />
                </div>
                <div className="flex gap-2">
                  {["#6D28D9", "#059669", "#B91C1C", "#D97706", "#7C3AED"].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({...formData, background_color: color})}
                      className="w-8 h-8 rounded-full border-2 border-white/10 hover:scale-110 transition"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Game Type and Mode */}
          {/* Game Type Selector */}
          <div>
            <label className="block text-sm text-white/40 mb-3">Type de jeu *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val:"battle_royale", label:"⚔️ Battle Royale", desc:"Tous contre tous" },
                { val:"cs",            label:"🛡️ Clash Squad",   desc:"Équipe vs Équipe" },
              ].map(gt => (
                <button key={gt.val} type="button"
                  onClick={() => handleGameTypeChange(gt.val)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.game_type === gt.val
                      ? "border-purple-500 bg-purple-500/15"
                      : "border-white/10 bg-[#11151C] hover:border-white/25"
                  }`}>
                  <p className="text-white font-bold text-sm">{gt.label}</p>
                  <p className="text-white/40 text-xs mt-1">{gt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Clash Squad Format — auto shown when CS selected */}
          {formData.game_type === "cs" && (
            <div>
              <label className="block text-sm text-white/40 mb-3">Format Clash Squad *</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(CS_FORMATS).map(([fmt, info]) => (
                  <button key={fmt} type="button"
                    onClick={() => handleCsFormatChange(fmt)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      formData.cs_format === fmt
                        ? "border-cyan-500 bg-cyan-500/15"
                        : "border-white/10 bg-[#11151C] hover:border-white/25"
                    }`}>
                    <p className={`font-black text-2xl ${formData.cs_format===fmt?"text-cyan-400":"text-white/50"}`}>
                      {info.label}
                    </p>
                    <p className="text-white/35 text-xs mt-1">
                      {info.teams} équipes · {info.per_team} joueur{info.per_team>1?"s":""}/équipe
                    </p>
                    <p className={`text-xs font-bold mt-2 ${formData.cs_format===fmt?"text-cyan-400":"text-white/30"}`}>
                      {info.players} joueurs total
                    </p>
                  </button>
                ))}
              </div>
              {/* Auto-info box */}
              <div className="mt-3 p-3 rounded-lg bg-cyan-500/8 border border-cyan-500/20 flex items-center gap-3">
                <span className="text-xl">ℹ️</span>
                <p className="text-cyan-300/70 text-xs">
                  Format <strong className="text-cyan-400">{formData.cs_format}</strong> sélectionné — 
                  La room aura automatiquement <strong className="text-white">{CS_FORMATS[formData.cs_format]?.teams} équipes</strong> de{" "}
                  <strong className="text-white">{CS_FORMATS[formData.cs_format]?.per_team} joueur{CS_FORMATS[formData.cs_format]?.per_team>1?"s":""}</strong> chacune.
                </p>
              </div>
            </div>
          )}

          {/* Battle Royale Mode */}
          {formData.game_type === "battle_royale" && (
            <div>
              <label className="block text-sm text-white/40 mb-2">Mode Battle Royale *</label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({...formData, mode: e.target.value})}
                className="w-full px-4 py-3 bg-[#11151C] border border-white/10 rounded-lg text-white focus:border-purple-500/50 transition"
              >
                <option value="solo">Solo</option>
                <option value="duo">Duo</option>
                <option value="squad">Squad (4)</option>
              </select>
            </div>
          )}

          {/* Numbers Grid */}
          <div className="grid grid-cols-3 gap-4">
            {formData.game_type !== "cs" ? (
              <div>
                <label className="block text-sm text-white/40 mb-2">Max Players *</label>
                <input
                  type="number"
                  value={formData.max_players}
                  onChange={(e) => setFormData({...formData, max_players: e.target.value})}
                  className="w-full px-4 py-3 bg-[#11151C] border border-white/10 rounded-lg text-white focus:border-purple-500/50 transition"
                  required
                  min="2"
                  max="100"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-white/40 mb-2">Max Players</label>
                <div className="w-full px-4 py-3 bg-cyan-500/8 border border-cyan-500/25 rounded-lg text-cyan-400 font-bold text-center">
                  {formData.max_players} joueurs (auto)
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-white/40 mb-2">Entry Fee</label>
              <input
                type="number"
                value={formData.entry_fee}
                onChange={(e) => setFormData({...formData, entry_fee: e.target.value})}
                className="w-full px-4 py-3 bg-[#11151C] border border-white/10 rounded-lg text-white focus:border-purple-500/50 transition"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm text-white/40 mb-2">Prize *</label>
              <input
                type="number"
                value={formData.prize_coins}
                onChange={(e) => setFormData({...formData, prize_coins: e.target.value})}
                className="w-full px-4 py-3 bg-[#11151C] border border-white/10 rounded-lg text-white focus:border-purple-500/50 transition"
                required
                min="1"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm text-white/40 mb-2">Start Date (optional)</label>
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              className="w-full px-4 py-3 bg-[#11151C] border border-white/10 rounded-lg text-white focus:border-purple-500/50 transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : uploading ? "Uploading Image..." : "Create Tournament"}
          </button>

        </form>
      </div>
    </div>
  );
}