import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [period, setPeriod] = useState("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch only players who have actually played (tournaments_played > 0)
      const { data: statsData } = await supabase
        .from("player_stats")
        .select("user_id, total_points, kills, tournaments_played, wins, best_position")
        .gt("tournaments_played", 0)
        .order("total_points", { ascending: false });

      if (!statsData?.length) { setPlayers([]); setLoading(false); return; }
      const ids = statsData.map(s => s.user_id);

      // Fetch profiles + wallets for active players only
      const [{ data: profiles }, { data: wallets }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, free_fire_id, avatar_url").in("id", ids).not("role", "eq", "banni"),
        supabase.from("wallets").select("user_id, balance").in("user_id", ids),
      ]);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const walletMap  = Object.fromEntries((wallets  || []).map(w => [w.user_id, w.balance || 0]));
      const statsMap   = Object.fromEntries(statsData.map(s => [s.user_id, s]));

      const playersWithCoins = ids
        .filter(id => profileMap[id])   // skip banned / deleted accounts
        .map(id => ({
          id,
          name:    profileMap[id]?.full_name || "Joueur",
          ffId:    profileMap[id]?.free_fire_id || "—",
          avatar:  profileMap[id]?.avatar_url,
          coins:   walletMap[id] || 0,
          points:  statsMap[id]?.total_points || 0,
          kills:   statsMap[id]?.kills || 0,
          matches: statsMap[id]?.tournaments_played || 0,
          wins:    statsMap[id]?.wins || 0,
          best:    statsMap[id]?.best_position || null,
        }))
        .sort((a, b) => b.points !== a.points ? b.points - a.points : b.coins - a.coins)
        .map((player, index) => ({ ...player, rank: index + 1 }));

      setPlayers(playersWithCoins);
    } catch(e) { console.error("leaderboard error:", e); }
    setLoading(false);
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white cyber-grid p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
            📊 CLASSEMENT
          </h1>
          <p className="text-white/40">Les meilleurs joueurs de la plateforme</p>
        </div>

        <div className="flex gap-4 mb-8 border-b border-[rgba(124,58,237,0.2)] pb-4">
          <button
            onClick={() => setPeriod("weekly")}
            className={`px-4 py-2 text-sm font-medium transition ${
              period === "weekly" 
                ? "text-[#7c3aed] border-b-2 border-[#7c3aed]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            CETTE SEMAINE
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-2 text-sm font-medium transition ${
              period === "monthly" 
                ? "text-[#7c3aed] border-b-2 border-[#7c3aed]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            CE MOIS
          </button>
          <button
            onClick={() => setPeriod("alltime")}
            className={`px-4 py-2 text-sm font-medium transition ${
              period === "alltime" 
                ? "text-[#7c3aed] border-b-2 border-[#7c3aed]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            TOUT LE TEMPS
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {players.slice(0, 3).map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-[#0a0a1a] border rounded-2xl p-6 text-center ${
                player.rank === 1 ? 'border-yellow-500/30' :
                player.rank === 2 ? 'border-gray-400/30' :
                'border-orange-700/30'
              }`}
            >
              <div className="text-5xl mb-3">{getRankBadge(player.rank)}</div>
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-2xl font-bold">
                {player.avatar ? (
                  <img src={player.avatar} alt={player.name} className="w-full h-full rounded-full" />
                ) : (
                  player.name.charAt(0)
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{player.name}</h3>
              <p className="text-sm text-[#7c3aed] mb-2">FF: {player.ffId}</p>
              <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:4}}>
                <div style={{textAlign:"center"}}>
                  <p className="text-2xl font-bold text-white">{player.points.toLocaleString()}</p>
                  <p style={{fontSize:11,color:"#6b7280"}}>POINTS</p>
                </div>
                <div style={{textAlign:"center"}}>
                  <p className="text-lg font-bold" style={{color:"#00d4ff"}}>{player.coins.toLocaleString()}</p>
                  <p style={{fontSize:11,color:"#6b7280"}}>PIÈCES</p>
                </div>
                <div style={{textAlign:"center"}}>
                  <p className="text-lg font-bold" style={{color:"#ef4444"}}>{player.kills}</p>
                  <p style={{fontSize:11,color:"#6b7280"}}>KILLS</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[rgba(124,58,237,0.2)]">
            <h2 className="text-lg font-bold text-white">CLASSEMENT COMPLET</h2>
          </div>
          <div className="divide-y divide-[rgba(124,58,237,0.1)]">
            {players.map((player) => (
              <div key={player.id} className="flex items-center justify-between p-4 hover:bg-[#11152b] transition">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    player.rank <= 3 
                      ? 'bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white' 
                      : 'bg-[#1a1f35] text-white/60'
                  }`}>
                    {player.rank <= 3 ? getRankBadge(player.rank) : `#${player.rank}`}
                  </div>
                  <div>
                    <p className="font-medium text-white">{player.name}</p>
                    <p className="text-xs text-white/40">FF: {player.ffId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{display:"flex",gap:20,alignItems:"center"}}>
                    <div style={{textAlign:"center"}}>
                      <p className="font-bold text-[#a78bfa]">{player.points}</p>
                      <p className="text-xs text-white/40">pts</p>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <p className="font-bold" style={{color:"#00d4ff"}}>{player.coins.toLocaleString()}</p>
                      <p className="text-xs text-white/40">pièces</p>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <p className="font-bold" style={{color:"#ef4444"}}>{player.kills}</p>
                      <p className="text-xs text-white/40">kills</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}