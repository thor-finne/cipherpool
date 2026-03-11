import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useRoomEngine } from "../hooks/useRoomEngine";
import TeamLayout from "../components/room/TeamLayout";
import RoomSidebar from "../components/room/RoomSidebar";
import RoomChat from "../components/room/RoomChat";
import PlayerProfilePanel from "../components/room/PlayerProfilePanel";
import { AnimatePresence } from "framer-motion";

export default function TournamentRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  const {
    tournament,
    members,
    teams,
    messages,
    role,
    loading: roomLoading,
    error,
    readyCount,
    countdown,
    changeSeat,
    toggleReady,
    sendMessage,
    lockRoom,
    startMatch,
    kickPlayer
  } = useRoomEngine(id, user, authLoading);

  // التحقق من session أولاً
  useEffect(() => {
    const checkSession = async () => {
      setAuthLoading(true);
      console.log("🔍 Checking session...");
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log("❌ No session, redirecting to login");
        navigate("/login");
        return;
      }
      
      console.log("✅ Session found for user:", session.user.id);
      setUser(session.user);
      
      // التحقق إذا كان المستخدم عضو في الغرفة أو منظم
      if (session.user) {
        const { data: tournamentData } = await supabase
          .from("tournaments")
          .select("created_by")
          .eq("id", id)
          .single();

        const { data: memberData } = await supabase
          .from("room_members")
          .select("id")
          .eq("tournament_id", id)
          .eq("user_id", session.user.id)
          .maybeSingle();

        // إذا ما كانش منظم ولا عضو، نرجّعو لصفحة البطولة
        if (tournamentData?.created_by !== session.user.id && !memberData) {
          console.log("⚠️ User not authorized for this room");
          if (!redirectAttempted) {
            setRedirectAttempted(true);
            navigate(`/tournaments/${id}`);
          }
        }
      }
      
      setAccessChecked(true);
      setAuthLoading(false);
      console.log("✅ Auth loading complete");
    };
    
    checkSession();
  }, [id, navigate, redirectAttempted]);

  // اشتراك في تغييرات auth
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔄 Auth state changed:", event);
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  // البحث عن حالة المستخدم الحالي
  const currentMember = members.find(m => m.user_id === user?.id);
  const currentUserReady = currentMember?.is_ready || false;
  
  // Console logs للتحقق
  console.log("🎮 Room state:", { 
    role, 
    membersCount: members.length, 
    messagesCount: messages.length, 
    userMember: currentMember ? "Yes" : "No",
    tournamentStatus: tournament?.status,
    readyCount
  });

  // إذا كان loading عام
  if (authLoading || roomLoading || !accessChecked) {
    console.log("⏳ Loading state:", { authLoading, roomLoading, accessChecked });
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/40">Chargement de la salle de tournoi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("❌ Room error:", error);
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log("🎮 Rendering room with role:", role);
  return (
    <div className="h-screen bg-[#0B0F19] text-white flex flex-col overflow-hidden">
      
      {/* Header */}
      <div 
        className="border-b border-white/5 py-4 px-6 flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${tournament?.background_color || '#6D28D9'}20, #0B0F19)`,
          borderBottom: `1px solid ${tournament?.background_color || '#6D28D9'}30`
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{tournament?.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm">
              <span className="text-white/40">
                {members.length}/{tournament?.max_players} Players
              </span>
              <span className="text-green-400">
                ✓ {readyCount} Ready
              </span>
              <span className="text-purple-400">
                Role: {role}
              </span>
            </div>
          </div>

          {/* Countdown Display */}
          {countdown > 0 && (
            <div className="text-2xl font-bold text-purple-400 animate-pulse">
              {countdown}s
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Teams + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Teams Area - 70% */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
            {teams.length > 0 ? (
              <TeamLayout 
                teams={teams}
                tournament={tournament}
                role={role}
                currentUserId={user?.id}
                onSelectPlayer={setSelectedPlayer}
                onKickPlayer={kickPlayer}
                onChangeSeat={changeSeat}
              />
            ) : (
              <div className="text-center py-20 bg-[#11151C] border border-white/5 rounded-xl">
                <p className="text-white/40">No teams structure available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - 30% */}
        <div className="w-80 border-l border-white/5 flex-shrink-0">
          <RoomSidebar
            tournament={tournament}
            players={members}
            readyCount={readyCount}
            role={role}
            roomLocked={tournament?.status !== "open"}
            countdown={countdown}
            onLockRoom={lockRoom}
            onStartMatch={startMatch}
            onToggleReady={toggleReady}
            currentUserReady={currentUserReady}
          />
        </div>
      </div>

      {/* Chat Area - Bottom */}
      <div className="h-64 border-t border-white/10 flex-shrink-0">
        <RoomChat
          messages={messages}
          onSendMessage={sendMessage}
          currentUser={user}
          role={role}
          roomLocked={tournament?.status !== "open"}
          onSelectPlayer={setSelectedPlayer}
          accentColor={tournament?.background_color}
        />
      </div>

      {/* Player Profile Panel */}
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfilePanel
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            accentColor={tournament?.background_color}
          />
        )}
      </AnimatePresence>
    </div>
  );
}