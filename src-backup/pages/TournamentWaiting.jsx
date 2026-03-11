import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function TournamentWaiting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // اشتراك في التحديثات المباشرة
    const subscription = supabase
      .channel('tournament-waiting')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${id}`
        },
        (payload) => {
          console.log("Update received:", payload);
          if (payload.new.user_id === userRequest?.user_id) {
            setUserRequest(payload.new);
            if (payload.new.status === "approved") {
              alert("✅ Your request has been approved! Redirecting to tournament room...");
              navigate(`/tournaments/${id}/room`);
            }
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    // جلب البطولة
    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    setTournament(tournamentData);

    // جلب طلب المستخدم
    const { data: requestData } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", id)
      .eq("user_id", user.id)
      .single();

    if (!requestData) {
      navigate(`/tournaments/${id}`);
      return;
    }

    setUserRequest(requestData);
    setLoading(false);

    // إذا كان مقبولاً، نوجه للروم
    if (requestData.status === "approved") {
      navigate(`/tournaments/${id}/room`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      <div className="max-w-3xl mx-auto px-8 py-12 text-center">
        
        {/* Status Icon */}
        <div className="text-8xl mb-8 animate-pulse">
          {userRequest?.status === "pending" ? "⏳" : 
           userRequest?.status === "approved" ? "✅" : "❌"}
        </div>

        <h1 className="text-4xl font-bold mb-4">
          {userRequest?.status === "pending" && "Request Pending"}
          {userRequest?.status === "approved" && "Approved!"}
          {userRequest?.status === "rejected" && "Request Rejected"}
        </h1>

        <p className="text-xl text-white/60 mb-8">
          {userRequest?.status === "pending" && 
            "Your request has been sent to the tournament organizer. You'll be notified once approved."}
          {userRequest?.status === "approved" && 
            "Redirecting to tournament room..."}
          {userRequest?.status === "rejected" && 
            "Your request was declined by the organizer."}
        </p>

        {userRequest?.status === "pending" && (
          <div className="space-y-4">
            <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">{tournament?.name}</h3>
              <p className="text-white/40">Waiting for organizer approval</p>
            </div>
            
            <Link
              to={`/tournaments/${id}`}
              className="inline-block px-6 py-3 border border-white/10 hover:border-white/30 rounded-lg transition"
            >
              ← Back to Tournament
            </Link>
          </div>
        )}

        {userRequest?.status === "rejected" && (
          <Link
            to="/tournaments"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          >
            Browse Other Tournaments
          </Link>
        )}
      </div>
    </div>
  );
}