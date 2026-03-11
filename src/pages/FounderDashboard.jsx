import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { usePermissions } from "../utils/permissions";

export default function FounderDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingResults, setPendingResults] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    full: 0,
    ongoing: 0,
    completed: 0,
    totalPlayers: 0
  });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const { isFounder, isSuperAdmin } = usePermissions(profile);
  
  const [newTournament, setNewTournament] = useState({
    name: "",
    description: "",
    game_type: "battle_royale",
    mode: "solo",
    max_players: 50,
    entry_fee: 0,
    prize_coins: 500,
    start_date: "",
    banner_url: "",
    background_color: "#6D28D9"
  });

  useEffect(() => {
    checkFounder();
    // Fetch pending results count
    supabase.from("match_results").select("id", { count: "exact" })
      .eq("status", "pending")
      .then(({ count }) => setPendingResults(count || 0));
  }, []);

  const checkFounder = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(userData);

    if (userData?.role !== "founder" && userData?.role !== "super_admin") {
      navigate("/dashboard");
    } else {
      fetchTournaments(user.id);
      fetchPendingRequestsCount(user.id);
    }
  };

  const fetchTournaments = async (userId) => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    setTournaments(data || []);

    if (data) {
      const totalPlayers = data.reduce((sum, t) => sum + (t.current_players || 0), 0);
      setStats({
        total: data.length,
        open: data.filter(t => t.status === "open").length,
        full: data.filter(t => t.status === "full").length,
        ongoing: data.filter(t => t.status === "ongoing").length,
        completed: data.filter(t => t.status === "completed").length,
        totalPlayers
      });
    }

    setLoading(false);
  };

  const fetchPendingRequestsCount = async (userId) => {
    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("id")
      .eq("created_by", userId);

    if (tournaments && tournaments.length > 0) {
      const tournamentIds = tournaments.map(t => t.id);
      
      const { count } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .in("tournament_id", tournamentIds)
        .eq("status", "pending");

      setPendingRequests(count || 0);
    }
  };

  const createTournament = async (e) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("tournaments")
      .insert([{
        ...newTournament,
        created_by: user.id,
        status: "open",
        current_players: 0
      }]);

    if (error) {
      alert("Error creating tournament: " + error.message);
    } else {
      setShowCreateModal(false);
      setNewTournament({
        name: "",
        description: "",
        game_type: "battle_royale",
        mode: "solo",
        max_players: 50,
        entry_fee: 0,
        prize_coins: 500,
        start_date: "",
        banner_url: "",
        background_color: "#6D28D9"
      });
      fetchTournaments(user.id);
    }
  };

  const deleteTournament = async () => {
    if (!tournamentToDelete) return;

    const tournamentId = tournamentToDelete.id;
    const tournamentName = tournamentToDelete.name;

    try {
      // محاولة 1: استعمل RPC delete_tournament_complete (الأفضل)
      const { error: rpcError } = await supabase.rpc('delete_tournament_complete', {
        tournament_id: tournamentId
      });

      if (rpcError) {
        // محاولة 2: حذف يدوي كامل مع تحقق من كل خطوة
        console.warn("RPC failed, trying manual delete:", rpcError.message);

        const steps = [
          { table: "match_results", column: "tournament_id" },
          { table: "room_messages", column: "tournament_id" },
          { table: "room_members", column: "tournament_id" },
          { table: "tournament_participants", column: "tournament_id" },
        ];

        for (const step of steps) {
          const { error: stepError } = await supabase
            .from(step.table)
            .delete()
            .eq(step.column, tournamentId);
          
          if (stepError) {
            console.warn(`Warning deleting ${step.table}:`, stepError.message);
            // نكملو حتى لو كاين table ما موجودش
          }
        }

        // الحذف النهائي للتورنوا
        const { error: deleteError } = await supabase
          .from("tournaments")
          .delete()
          .eq("id", tournamentId);

        if (deleteError) throw deleteError;
      }

      // تأكد أنو الحذف صرا فعلاً
      const { data: checkData } = await supabase
        .from("tournaments")
        .select("id")
        .eq("id", tournamentId)
        .maybeSingle();

      if (checkData) {
        // لا يزال موجود — خاصك تشوف RLS policies فـ Supabase
        throw new Error("Tournament still exists after delete. Check RLS policies in Supabase.");
      }

      // ✅ نجح الحذف
      setShowDeleteModal(false);
      setTournamentToDelete(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      await fetchTournaments(user.id);
      await fetchPendingRequestsCount(user.id);

      alert(`✅ "${tournamentName}" supprimé avec succès !`);

    } catch (error) {
      console.error("Error deleting tournament:", error);
      setShowDeleteModal(false);
      setTournamentToDelete(null);
      alert(`❌ Échec de la suppression: ${error.message}\n\nSolution: Vérifie les RLS policies dans Supabase Dashboard.`);
    }
  };

  const startMatch = async (tournamentId) => {
    try {
      const { error } = await supabase.rpc('start_match', {
        tournament_id: tournamentId
      });

      if (error) throw error;

      alert("✅ Match démarré avec succès !");
      fetchTournaments(profile.id);
    } catch (err) {
      console.error("Error starting match:", err);
      alert("Erreur lors du démarrage du match");
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      {/* Header Section with Gradient */}
      <div className="border-b border-white/5 bg-gradient-to-r from-[#11151C] to-[#1A1F2B]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {isSuperAdmin ? '👑 SUPER ADMIN / FOUNDER' : '🎮 FOUNDER DASHBOARD'}
              </h1>
              <p className="text-white/40">
                Welcome back, {profile?.full_name} • {profile?.free_fire_id || "No FF ID"}
              </p>
            </div>
            
            <div className="flex gap-4">
              <Link
                to="/founder/requests"
                className="px-6 py-3 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded-lg font-medium transition flex items-center gap-2"
              >
                <span>📋 PENDING REQUESTS</span>
                {pendingRequests > 0 && (
                  <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                    {pendingRequests}
                  </span>
                )}
              </Link>
              <Link
                to="/admin/results"
                className="px-6 py-3 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg font-medium transition flex items-center gap-2"
              >
                <span>📊 RÉSULTATS</span>
                {pendingResults > 0 && (
                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                    {pendingResults}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <span>+</span> CREATE TOURNAMENT
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Total Tournaments</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Open</p>
              <p className="text-3xl font-bold text-green-400">{stats.open}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Full</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.full}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Ongoing</p>
              <p className="text-3xl font-bold text-blue-400">{stats.ongoing}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Total Players</p>
              <p className="text-3xl font-bold text-purple-400">{stats.totalPlayers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        
        {/* Filter Buttons */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              filter === "all" 
                ? "bg-purple-600 text-white" 
                : "bg-[#1A1F2B] text-white/60 hover:bg-[#2A2F3B]"
            }`}
          >
            All Tournaments
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              filter === "open" 
                ? "bg-green-600 text-white" 
                : "bg-[#1A1F2B] text-white/60 hover:bg-[#2A2F3B]"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("full")}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              filter === "full" 
                ? "bg-yellow-600 text-white" 
                : "bg-[#1A1F2B] text-white/60 hover:bg-[#2A2F3B]"
            }`}
          >
            Full
          </button>
          <button
            onClick={() => setFilter("ongoing")}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              filter === "ongoing" 
                ? "bg-blue-600 text-white" 
                : "bg-[#1A1F2B] text-white/60 hover:bg-[#2A2F3B]"
            }`}
          >
            Ongoing
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              filter === "completed" 
                ? "bg-purple-600 text-white" 
                : "bg-[#1A1F2B] text-white/60 hover:bg-[#2A2F3B]"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-20 bg-[#11151C] border border-white/5 rounded-xl">
            <p className="text-white/40 mb-4">No tournaments found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-purple-400 hover:text-purple-300 transition"
            >
              Create your first tournament →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-gradient-to-br from-[#11151C] to-[#1A1F2B] border border-white/5 rounded-xl overflow-hidden hover:border-purple-500/50 transition group"
                style={{
                  borderLeft: `4px solid ${tournament.background_color || '#6D28D9'}`
                }}
              >
                {tournament.banner_url && (
                  <div className="h-32 overflow-hidden">
                    <img 
                      src={tournament.banner_url} 
                      alt={tournament.name}
                      className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition"
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{tournament.name}</h3>
                      <p className="text-sm text-white/40">{tournament.description || "No description"}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      tournament.status === "open" ? "bg-green-500/20 text-green-400" :
                      tournament.status === "full" ? "bg-yellow-500/20 text-yellow-400" :
                      tournament.status === "ongoing" ? "bg-blue-500/20 text-blue-400" :
                      "bg-purple-500/20 text-purple-400"
                    }`}>
                      {tournament.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Game Type</p>
                      <p className="text-sm font-medium text-white">
                        {tournament.game_type === "battle_royale" ? "Battle Royale" : "Clash Squad"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Mode</p>
                      <p className="text-sm font-medium text-white">{tournament.mode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Prize</p>
                      <p className="text-sm font-medium text-purple-400">{tournament.prize_coins} Coins</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Players</p>
                      <p className="text-sm font-medium text-white">{tournament.current_players}/{tournament.max_players}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Link
                        to={`/tournaments/${tournament.id}/manage`}
                        className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition"
                      >
                        Manage
                      </Link>
                      <Link
                        to={`/tournaments/${tournament.id}`}
                        className="px-4 py-2 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10 transition"
                      >
                        View
                      </Link>
                      {tournament.status === "open" && tournament.current_players >= 2 && (
                        <button
                          onClick={() => startMatch(tournament.id)}
                          className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition"
                        >
                          Start Match
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setTournamentToDelete(tournament);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#11151C] border border-white/10 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Tournament</h2>

            <form onSubmit={createTournament} className="space-y-6">
              <div>
                <label className="block text-sm text-white/40 mb-2">Tournament Name</label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({...newTournament, name: e.target.value})}
                  className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/40 mb-2">Description</label>
                <textarea
                  value={newTournament.description}
                  onChange={(e) => setNewTournament({...newTournament, description: e.target.value})}
                  className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/40 mb-2">Banner Image</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white text-sm font-medium transition flex items-center gap-2">
                      <span>📁</span>
                      <span>Choisir une image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const ext = file.name.split(".").pop();
                          const path = `banners/${Date.now()}.${ext}`;
                          const { error: upErr } = await supabase.storage.from("tournament-banners").upload(path, file, { upsert: true });
                          if (upErr) { alert("Upload error: " + upErr.message); return; }
                          const { data } = supabase.storage.from("tournament-banners").getPublicUrl(path);
                          setNewTournament(prev => ({ ...prev, banner_url: data.publicUrl }));
                        }}
                      />
                    </label>
                    {newTournament.banner_url ? (
                      <img src={newTournament.banner_url} alt="banner" className="h-12 w-20 object-cover rounded-lg border border-white/20" />
                    ) : (
                      <span className="text-white/30 text-xs">Aucune image choisie</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/40 mb-2">Accent Color</label>
                  <input
                    type="color"
                    value={newTournament.background_color}
                    onChange={(e) => setNewTournament({...newTournament, background_color: e.target.value})}
                    className="w-full h-12 bg-[#1A1F2B] border border-white/10 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/40 mb-2">Game Type</label>
                  <select
                    value={newTournament.game_type}
                    onChange={(e) => setNewTournament({...newTournament, game_type: e.target.value})}
                    className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white"
                  >
                    <option value="battle_royale">Battle Royale</option>
                    <option value="cs">Clash Squad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/40 mb-2">Mode</label>
                  <select
                    value={newTournament.mode}
                    onChange={(e) => setNewTournament({...newTournament, mode: e.target.value})}
                    className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white"
                  >
                    <option value="solo">Solo</option>
                    <option value="duo">Duo</option>
                    <option value="squad">Squad</option>
                    <option value="4v4">4v4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-white/40 mb-2">Max Players</label>
                  <input
                    type="number"
                    value={newTournament.max_players}
                    onChange={(e) => setNewTournament({...newTournament, max_players: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/40 mb-2">Entry Fee</label>
                  <input
                    type="number"
                    value={newTournament.entry_fee}
                    onChange={(e) => setNewTournament({...newTournament, entry_fee: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/40 mb-2">Prize</label>
                  <input
                    type="number"
                    value={newTournament.prize_coins}
                    onChange={(e) => setNewTournament({...newTournament, prize_coins: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/40 mb-2">Start Date</label>
                <input
                  type="datetime-local"
                  value={newTournament.start_date}
                  onChange={(e) => setNewTournament({...newTournament, start_date: e.target.value})}
                  className="w-full px-4 py-3 bg-[#1A1F2B] border border-white/10 rounded-lg text-white"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-white/10 hover:border-white/30 rounded-lg text-white font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition"
                >
                  Create Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#11151C] border border-white/10 rounded-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Delete Tournament</h3>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{tournamentToDelete?.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 border border-white/10 hover:border-white/30 rounded-lg text-white font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteTournament}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}