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
    // جلب المستخدمين مع أرصدتهم
    const { data: profiles } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        free_fire_id,
        avatar_url,
        wallets!left (
          balance
        )
      `)
      .eq("verification_status", "approved")
      .order("full_name", { ascending: true });

    const playersWithCoins = (profiles || [])
      .map(user => ({
        id: user.id,
        name: user.full_name || "Inconnu",
        ffId: user.free_fire_id || "—",
        avatar: user.avatar_url,
        coins: user.wallets?.[0]?.balance || 0
      }))
      .sort((a, b) => b.coins - a.coins)
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));

    setPlayers(playersWithCoins);
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
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
            📊 CLASSEMENT
          </h1>
          <p className="text-white/40">Les meilleurs joueurs de la plateforme</p>
        </div>

        {/* Period Filter */}
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

        {/* Top 3 Players */}
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
              <p className="text-2xl font-bold text-white">{player.coins.toLocaleString()} pièces</p>
            </motion.div>
          ))}
        </div>

        {/* Full Leaderboard */}
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
                  <p className="font-bold text-[#7c3aed]">{player.coins.toLocaleString()}</p>
                  <p className="text-xs text-white/40">pièces</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}