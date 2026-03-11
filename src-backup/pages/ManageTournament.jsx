import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ManageTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedPlayers, setApprovedPlayers] = useState([]);
  const [rejectedPlayers, setRejectedPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showRejected, setShowRejected] = useState(false);
  const [tournamentStats, setTournamentStats] = useState({
    totalRequests: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    availableSpots: 0
  });

  useEffect(() => {
    checkAccess();
  }, [id]);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tournamentError || !tournamentData) {
      navigate("/dashboard");
      return;
    }

    const { data: userData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (tournamentData.created_by !== user.id && userData?.role !== "super_admin") {
      navigate("/dashboard");
      return;
    }

    setTournament(tournamentData);
    await fetchAllData();
  };

  const fetchAllData = async () => {
    const { data: allRequests } = await supabase
      .from("tournament_participants")
      .select(`
        id,
        user_id,
        status,
        requested_at,
        reviewed_at,
        profiles!inner (
          full_name,
          email,
          free_fire_id,
          avatar_url,
          coins,
          verification_status
        )
      `)
      .eq("tournament_id", id)
      .order("requested_at", { ascending: true });

    if (!allRequests) {
      setLoading(false);
      return;
    }

    const pending = allRequests.filter(r => r.status === "pending");
    const approved = allRequests.filter(r => r.status === "approved");
    const rejected = allRequests.filter(r => r.status === "rejected");

    setPendingRequests(pending);
    setApprovedPlayers(approved);
    setRejectedPlayers(rejected);

    setTournamentStats({
      totalRequests: allRequests.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      availableSpots: (tournament?.max_players || 0) - (tournament?.current_players || 0)
    });

    setLoading(false);
  };

  const handleRequest = async (userId, status) => {
    if (status === "approved" && tournament.current_players >= tournament.max_players) {
      alert("❌ Tournament is already full! Cannot approve more players.");
      return;
    }

    setProcessingId(userId);
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("tournament_participants")
      .update({ 
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("tournament_id", id)
      .eq("user_id", userId);

    if (updateError) {
      alert("Error updating request: " + updateError.message);
      setProcessingId(null);
      return;
    }

    if (status === "approved") {
      const newPlayerCount = tournament.current_players + 1;
      
      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({ 
          current_players: newPlayerCount 
        })
        .eq("id", id);

      if (tournamentError) {
        alert("Error updating player count: " + tournamentError.message);
      } else {
        setTournament({
          ...tournament,
          current_players: newPlayerCount
        });
      }
    }

    setProcessingId(null);
    await fetchAllData();
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "pending":
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Pending</span>;
      case "approved":
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Approved</span>;
      case "rejected":
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white/40">Loading tournament data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      <div className="border-b border-white/5 bg-[#11151C]/50">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Manage Tournament</h1>
              <p className="text-white/40">{tournament?.name}</p>
            </div>
            <Link
              to={`/tournaments/${id}`}
              className="px-4 py-2 border border-white/10 hover:border-white/30 rounded-lg text-sm transition"
            >
              ← Back to Tournament
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Total Requests</p>
              <p className="text-3xl font-bold text-white">{tournamentStats.totalRequests}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Approved</p>
              <p className="text-3xl font-bold text-green-400">{tournamentStats.approvedCount}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">{tournamentStats.pendingCount}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Rejected</p>
              <p className="text-3xl font-bold text-red-400">{tournamentStats.rejectedCount}</p>
            </div>
            <div className="bg-[#1A1F2B] rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">Available Spots</p>
              <p className={`text-3xl font-bold ${tournamentStats.availableSpots > 0 ? 'text-purple-400' : 'text-red-400'}`}>
                {tournamentStats.availableSpots}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12 space-y-8">

        <div className="bg-[#11151C] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-yellow-400 rounded-full"></span>
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-white/40">No pending requests</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-6 hover:bg-white/5 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                        {req.profiles.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-white">{req.profiles.full_name}</h3>
                          {getStatusBadge(req.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-white/40 mb-1">Email</p>
                            <p className="text-white">{req.profiles.email}</p>
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Free Fire ID</p>
                            <p className="text-white font-mono">{req.profiles.free_fire_id || "—"}</p>
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Requested</p>
                            <p className="text-white">{new Date(req.requested_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Status</p>
                            <p className="text-white">{req.profiles.verification_status}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleRequest(req.user_id, "approved")}
                        disabled={processingId === req.user_id || tournament.current_players >= tournament.max_players}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition min-w-[80px] ${
                          tournament.current_players >= tournament.max_players
                            ? "bg-gray-600/20 text-gray-400 cursor-not-allowed"
                            : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                        }`}
                        title={tournament.current_players >= tournament.max_players ? "Tournament is full" : "Approve player"}
                      >
                        {processingId === req.user_id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleRequest(req.user_id, "rejected")}
                        disabled={processingId === req.user_id}
                        className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition disabled:opacity-50 min-w-[80px]"
                      >
                        {processingId === req.user_id ? "..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {approvedPlayers.length > 0 && (
          <div className="bg-[#11151C] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-green-400 rounded-full"></span>
                Approved Players ({approvedPlayers.length})
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {approvedPlayers.map((player) => (
                <div key={player.id} className="p-4 hover:bg-white/5 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center text-green-400 font-bold">
                      {player.profiles.full_name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-white">{player.profiles.full_name}</p>
                        <span className="text-xs text-green-400">✓ Approved</span>
                      </div>
                      <p className="text-sm text-white/40">FF: {player.profiles.free_fire_id || "—"}</p>
                    </div>
                    <div className="text-sm text-white/40">
                      {new Date(player.reviewed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rejectedPlayers.length > 0 && (
          <div className="bg-[#11151C] border border-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRejected(!showRejected)}
              className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition"
            >
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-red-400 rounded-full"></span>
                Rejected Players ({rejectedPlayers.length})
              </h2>
              <span className="text-white/40 text-2xl">{showRejected ? '−' : '+'}</span>
            </button>
            
            {showRejected && (
              <div className="divide-y divide-white/5 border-t border-white/5">
                {rejectedPlayers.map((player) => (
                  <div key={player.id} className="p-4 hover:bg-white/5 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center text-red-400 font-bold">
                        {player.profiles.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{player.profiles.full_name}</p>
                        <p className="text-sm text-white/40">FF: {player.profiles.free_fire_id || "—"}</p>
                      </div>
                      <div className="text-sm text-white/40">
                        {new Date(player.reviewed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Tournament Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-white/40 mb-1">Game Type</p>
              <p className="font-medium text-white">
                {tournament?.game_type === "battle_royale" ? "Battle Royale" : "Clash Squad"}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Mode</p>
              <p className="font-medium text-white">{tournament?.mode}</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Prize Pool</p>
              <p className="font-medium text-purple-400">{tournament?.prize_coins} Coins</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Entry Fee</p>
              <p className="font-medium text-white">{tournament?.entry_fee} Coins</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}