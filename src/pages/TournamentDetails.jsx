import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate(); // ✅ مهم جداً
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    console.log("TournamentDetails mounted, id:", id);
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(userData);
    }

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tournamentError || !tournamentData) {
      navigate("/tournaments");
      return;
    }

    setTournament(tournamentData);

    if (user) {
      const { data: requestData } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      setUserRequest(requestData);
      
      // ✅ التحقق إذا كان المستخدم مقبولاً
      setIsApproved(requestData?.status === "approved");
    }

    setLoading(false);
  };

  const requestToJoin = async () => {
    if (!profile) {
      navigate("/login");
      return;
    }

    if (profile.verification_status !== "approved") {
      alert("❌ Your account must be verified to join tournaments.");
      return;
    }

    if (tournament.status !== "open") {
      alert("❌ This tournament is not open for registration.");
      return;
    }

    if (tournament.current_players >= tournament.max_players) {
      alert("❌ This tournament is full.");
      return;
    }

    setRequesting(true);

    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { data, error } = await supabase
        .from("tournament_participants")
        .insert([{
          tournament_id: id,
          user_id: user.id,
          status: "pending"
        }])
        .select();

      if (error) {
        console.error("Join error:", error);
        if (error.code === '23505') {
          alert("You have already requested to join this tournament.");
        } else {
          alert("Error requesting to join: " + error.message);
        }
      } else {
        alert("✅ Join request sent successfully!");
        navigate(`/tournaments/${id}/waiting`);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred.");
    }

    setRequesting(false);
  };

  // ✅ دالة للدخول إلى الغرفة
  const goToRoom = () => {
    console.log("🔄 Navigating to room...", `/tournaments/${id}/room`);
    navigate(`/tournaments/${id}/room`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white/40">Loading tournament...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      {/* Hero Section with Banner */}
      <div 
        className="h-96 bg-cover bg-center relative"
        style={{
          backgroundImage: tournament?.banner_url 
            ? `url(${tournament.banner_url})` 
            : `linear-gradient(135deg, ${tournament?.background_color || '#6D28D9'}, #4C1D95)`
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold text-white mb-3">{tournament?.name}</h1>
            <p className="text-xl text-white/80 max-w-3xl">{tournament?.description}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        
        {/* Tournament Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Game Type</p>
            <p className="text-xl font-bold text-white">
              {tournament?.game_type === "battle_royale" ? "Battle Royale" : "Clash Squad"}
            </p>
          </div>
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Mode</p>
            <p className="text-xl font-bold text-white">{tournament?.mode}</p>
          </div>
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Players</p>
            <p className="text-xl font-bold text-white">{tournament?.current_players}/{tournament?.max_players}</p>
          </div>
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Prize Pool</p>
            <p className="text-xl font-bold" style={{ color: tournament?.background_color || '#6D28D9' }}>
              {tournament?.prize_coins} Coins
            </p>
          </div>
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
            <p className="text-sm text-white/40 mb-2">Entry Fee</p>
            <p className="text-xl font-bold text-white">{tournament?.entry_fee} Coins</p>
          </div>
        </div>

        {/* Join Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          
          {/* Join Button / Rejoin Card */}
          <div className="md:col-span-2">
            <div className="bg-[#11151C] border border-white/5 rounded-xl p-8">
              
              {profile ? (
                <>
                  {/* ✅ Organizer / Admin / Fondateur — direct access */}
                  {(tournament?.created_by === profile?.id ||
                    ["admin","fondateur","super_admin","founder"].includes(profile?.role)) ? (
                    <div className="rounded-xl p-8 text-center border-2" style={{ borderColor: "#7c3aed" }}>
                      <div className="text-6xl mb-4">🛡️</div>
                      <h2 className="text-2xl font-bold text-white mb-2">Accès Organisateur</h2>
                      <p className="text-white/40 mb-6">Vous gérez ce tournoi. Accédez directement à la salle.</p>
                      <button onClick={goToRoom}
                        className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-lg transition">
                        ⚡ Gérer la salle
                      </button>
                    </div>
                  ) : isApproved ? (
                    <div 
                      className="rounded-xl p-8 text-center border-2"
                      style={{ borderColor: tournament?.background_color || '#6D28D9' }}
                    >
                      <div className="text-6xl mb-4">🎮</div>
                      <h2 className="text-2xl font-bold text-white mb-2">Votre demande est approuvée !</h2>
                      <p className="text-white/40 mb-6">Votre place est réservée. Rejoignez la salle de tournoi dès maintenant.</p>
                      
                      {/* ✅ زر Rejoin مع onClick مباشر (بدون Link) */}
                      <button
                        onClick={goToRoom}
                        className="inline-block px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-lg transition transform hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: tournament?.background_color }}
                      >
                        🔥 Rejoindre la salle
                      </button>

                      {/* رابط احتياطي للتحقق */}
                      <div className="mt-2 text-xs text-white/40">
                        <Link to={`/tournaments/${id}/room`} className="underline hover:text-white">
                          Lien direct
                        </Link>
                      </div>
                    </div>
                  ) : !userRequest ? (
                    // لم يطلب بعد
                    tournament?.current_players < tournament?.max_players ? (
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Join Tournament</h2>
                        <button
                          onClick={requestToJoin}
                          disabled={requesting || profile.verification_status !== "approved"}
                          className={`px-8 py-4 rounded-lg font-medium text-lg transition ${
                            profile.verification_status !== "approved"
                              ? "bg-gray-600/20 text-gray-400 cursor-not-allowed"
                              : "bg-purple-600 hover:bg-purple-700 text-white"
                          }`}
                        >
                          {requesting ? "Requesting..." : "Request to Join"}
                        </button>
                        
                        {profile.verification_status !== "approved" && (
                          <p className="mt-4 text-yellow-400 text-sm">
                            ⚠️ Your account must be verified to join tournaments.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-400">❌ This tournament is full.</p>
                      </div>
                    )
                  ) : (
                    // حالة الطلب (pending/rejected)
                    <div className={`p-6 rounded-lg ${
                      userRequest.status === "pending" ? "bg-yellow-500/10 border border-yellow-500/30" :
                      userRequest.status === "approved" ? "bg-green-500/10 border border-green-500/30" :
                      "bg-red-500/10 border border-red-500/30"
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl ${
                          userRequest.status === "pending" ? "text-yellow-400" :
                          userRequest.status === "approved" ? "text-green-400" :
                          "text-red-400"
                        }`}>
                          {userRequest.status === "pending" ? "⏳" :
                           userRequest.status === "approved" ? "✅" : "❌"}
                        </div>
                        <div>
                          <h3 className={`text-xl font-bold mb-2 ${
                            userRequest.status === "pending" ? "text-yellow-400" :
                            userRequest.status === "approved" ? "text-green-400" :
                            "text-red-400"
                          }`}>
                            {userRequest.status === "pending" && "Request Pending"}
                            {userRequest.status === "approved" && "Approved!"}
                            {userRequest.status === "rejected" && "Request Rejected"}
                          </h3>
                          <p className="text-white/60">
                            {userRequest.status === "pending" && "Your request has been sent to the tournament organizer."}
                            {userRequest.status === "approved" && "You can now participate in this tournament."}
                            {userRequest.status === "rejected" && "Your request was declined by the organizer."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <p className="text-white/60 mb-4">Please login to join this tournament</p>
                  <Link
                    to="/login"
                    className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">Informations sur le tournoi</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/40">Créé par</p>
                <p className="text-white font-medium">Organisateur</p>
              </div>
              {tournament?.start_date && (
                <div>
                  <p className="text-sm text-white/40">Date de début</p>
                  <p className="text-white font-medium">
                    {new Date(tournament.start_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div className="pt-4 border-t border-white/5">
                <p className="text-sm text-white/40 mb-2">État d'avancement de l'inscription</p>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${(tournament?.current_players / tournament?.max_players) * 100}%`,
                      backgroundColor: tournament?.background_color || '#6D28D9'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-white/40 mt-2 text-right">
                  {tournament?.current_players}/{tournament?.max_players} places occupées
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-[#11151C] border border-white/5 rounded-xl p-8">
          <h3 className="text-xl font-bold text-white mb-4">Tournament Rules</h3>
          <ul className="space-y-3 text-white/60">
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>All players must have verified accounts</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Fair play is mandatory - any cheating results in permanent ban</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Players must be ready 15 minutes before start time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}