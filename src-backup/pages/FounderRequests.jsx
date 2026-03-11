import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function FounderRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    checkFounder();
  }, []);

  const checkFounder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "founder" && profile?.role !== "super_admin") {
      navigate("/dashboard");
      return;
    }

    fetchRequests();
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. جلب كل البطولات التابعة للمؤسس
      const { data: tournaments, error: tournamentsError } = await supabase
        .from("tournaments")
        .select("id, name, mode, max_players")
        .eq("created_by", user.id);

      if (tournamentsError) throw tournamentsError;

      if (!tournaments || tournaments.length === 0) {
        setRequests([]);
        setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
        setLoading(false);
        return;
      }

      const tournamentIds = tournaments.map(t => t.id);
      console.log("Tournament IDs:", tournamentIds);

      // 2. جلب الطلبات المعلقة
      const { data: pendingRequests, error: requestsError } = await supabase
        .from("tournament_participants")
        .select(`
          id,
          status,
          user_id,
          tournament_id,
          requested_at,
          profiles!tournament_participants_user_id_fkey (
            full_name,
            free_fire_id,
            avatar_url,
            verification_status
          )
        `)
        .in("tournament_id", tournamentIds)
        .eq("status", "pending");

      if (requestsError) throw requestsError;

      console.log("Pending requests:", pendingRequests);

      // 3. إنشاء خريطة البطولات
      const tournamentMap = {};
      tournaments.forEach(t => {
        tournamentMap[t.id] = {
          name: t.name,
          mode: t.mode,
          max_players: t.max_players
        };
      });

      const enrichedPendingRequests = (pendingRequests || []).map(req => ({
        ...req,
        tournament_name: tournamentMap[req.tournament_id]?.name || "Unknown",
        tournament_mode: tournamentMap[req.tournament_id]?.mode || "solo",
        tournament_max: tournamentMap[req.tournament_id]?.max_players || 50,
        profiles: req.profiles || { 
          full_name: "Unknown", 
          free_fire_id: "", 
          verification_status: "unknown" 
        }
      }));

      // 4. جلب الطلبات المقبولة والمرفوضة
      const { data: otherRequests } = await supabase
        .from("tournament_participants")
        .select(`
          id,
          status,
          user_id,
          tournament_id,
          requested_at,
          reviewed_at,
          seat_number,
          profiles!tournament_participants_user_id_fkey (
            full_name,
            free_fire_id,
            avatar_url,
            verification_status
          )
        `)
        .in("tournament_id", tournamentIds)
        .in("status", ["approved", "rejected"])
        .order("reviewed_at", { ascending: false })
        .limit(20);

      const enrichedOtherRequests = (otherRequests || []).map(req => ({
        ...req,
        tournament_name: tournamentMap[req.tournament_id]?.name || "Unknown",
        tournament_mode: tournamentMap[req.tournament_id]?.mode || "solo",
        tournament_max: tournamentMap[req.tournament_id]?.max_players || 50,
        profiles: req.profiles || { 
          full_name: "Unknown", 
          free_fire_id: "", 
          verification_status: "unknown" 
        }
      }));

      const allRequests = [...enrichedPendingRequests, ...enrichedOtherRequests];
      
      // حساب الإحصائيات
      const pending = allRequests.filter(r => r.status === "pending") || [];
      const approved = allRequests.filter(r => r.status === "approved") || [];
      const rejected = allRequests.filter(r => r.status === "rejected") || [];

      setRequests(allRequests);
      setStats({
        total: allRequests.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length
      });

    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to load requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId, userId, tournamentId, newStatus) => {
    setProcessingId(requestId);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // إذا تم القبول
      if (newStatus === "approved") {
        // 1. تحديث حالة الطالب في tournament_participants
        const { error: updateError } = await supabase
          .from("tournament_participants")
          .update({ 
            status: newStatus,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq("id", requestId);

        if (updateError) throw updateError;

        // 2. جلب البطولة لتحديد mode
        const { data: tournament, error: tournamentError } = await supabase
          .from("tournaments")
          .select("mode, max_players, current_players")
          .eq("id", tournamentId)
          .single();

        if (tournamentError) throw tournamentError;

        // 3. التحقق من أن البطولة مش فاضية
        if (tournament.current_players >= tournament.max_players) {
          throw new Error("Tournament is already full");
        }

        // 4. حساب توزيع المقاعد حسب mode
        const teamSize = tournament.mode === "squad" ? 4 : tournament.mode === "duo" ? 2 : 1;
        
        // 5. جلب الأعضاء الحاليين في الغرفة
        const { data: currentMembers, error: membersError } = await supabase
          .from("room_members")
          .select("team_number, seat_number")
          .eq("tournament_id", tournamentId);

        if (membersError) throw membersError;

        // 6. البحث عن أول فريق فيه مقعد فارغ
        let assignedTeam = 1;
        let assignedSeat = 1;
        let found = false;

        while (!found) {
          const occupiedSeats = currentMembers?.filter(m => m.team_number === assignedTeam) || [];
          if (occupiedSeats.length < teamSize) {
            // البحث عن أول مقعد فارغ في هذا الفريق
            for (let seat = 1; seat <= teamSize; seat++) {
              const isOccupied = occupiedSeats.some(m => m.seat_number === seat);
              if (!isOccupied) {
                assignedSeat = seat;
                found = true;
                break;
              }
            }
          }
          if (!found) assignedTeam++;
        }

        console.log(`Assigning user to Team ${assignedTeam}, Seat ${assignedSeat}`);

        // 7. إضافة اللاعب إلى room_members
        const { error: roomError } = await supabase
          .from("room_members")
          .insert([{
            tournament_id: tournamentId,
            user_id: userId,
            team_number: assignedTeam,
            seat_number: assignedSeat,
            is_ready: false
          }]);

        if (roomError) throw roomError;

        // 8. تحديث عدد اللاعبين في البطولة
        const { error: updateTournamentError } = await supabase
          .from("tournaments")
          .update({ 
            current_players: tournament.current_players + 1 
          })
          .eq("id", tournamentId);

        if (updateTournamentError) throw updateTournamentError;

      } else {
        // إذا كان رفض فقط
        const { error: updateError } = await supabase
          .from("tournament_participants")
          .update({ 
            status: newStatus,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq("id", requestId);

        if (updateError) throw updateError;
      }

      // تحديث القائمة
      await fetchRequests();

    } catch (err) {
      console.error("Error updating request:", err);
      setError("Failed to update request: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "pending":
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">⏳ Pending</span>;
      case "approved":
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">✅ Approved</span>;
      case "rejected":
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">❌ Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white/40">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      <div className="max-w-7xl mx-auto px-8 py-12">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Join Requests</h1>
          <p className="text-white/40">Manage player requests for your tournaments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Total Requests</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Pending</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Approved</p>
            <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Rejected</p>
            <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Pending Requests Section */}
        {requests.filter(r => r.status === "pending").length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Pending Requests</h2>
            <div className="space-y-4">
              {requests.filter(r => r.status === "pending").map((req) => (
                <div 
                  key={req.id} 
                  className="bg-[#11151C] border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/50 transition"
                >
                  <div className="flex items-start justify-between">
                    
                    {/* Player Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                        {req.profiles?.full_name?.charAt(0) || "U"}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">{req.profiles?.full_name || "Unknown"}</h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-white/40 mb-1">Free Fire ID</p>
                            <p className="text-white font-mono">{req.profiles?.free_fire_id || "—"}</p>
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Tournament</p>
                            <p className="text-white">{req.tournament_name}</p>
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Mode</p>
                            <p className="text-white">{req.tournament_mode}</p>
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Requested</p>
                            <p className="text-white">{new Date(req.requested_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleRequest(req.id, req.user_id, req.tournament_id, "approved")}
                        disabled={processingId === req.id}
                        className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-600/30 transition disabled:opacity-50 min-w-[80px]"
                      >
                        {processingId === req.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleRequest(req.id, req.user_id, req.tournament_id, "rejected")}
                        disabled={processingId === req.id}
                        className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition disabled:opacity-50 min-w-[80px]"
                      >
                        {processingId === req.id ? "..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Section */}
        {requests.filter(r => r.status !== "pending").length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">History</h2>
            <div className="space-y-3">
              {requests.filter(r => r.status !== "pending").map((req) => (
                <div 
                  key={req.id} 
                  className="bg-[#11151C] border border-white/5 rounded-xl p-4 opacity-70 hover:opacity-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                        {req.profiles?.full_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-white">{req.profiles?.full_name}</p>
                        <p className="text-xs text-white/40">{req.tournament_name}</p>
                        {req.seat_number && (
                          <p className="text-xs text-purple-400">Seat #{req.seat_number}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Requests */}
        {requests.length === 0 && (
          <div className="text-center py-20 bg-[#11151C] border border-white/5 rounded-xl">
            <p className="text-white/40 mb-4">No requests found</p>
            <Link
              to="/tournaments"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              Browse Tournaments →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}