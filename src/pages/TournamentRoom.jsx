import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useRoomEngine } from "../hooks/useRoomEngine";
import TeamLayout from "../components/room/TeamLayout";
import RoomSidebar from "../components/room/RoomSidebar";
import RoomChat from "../components/room/RoomChat";
import PlayerProfilePanel from "../components/room/PlayerProfilePanel";
import { AnimatePresence, motion } from "framer-motion";
import SubmitResultPanel from "../components/room/SubmitResultPanel";
import { MatchStartOverlay, SubmitReminder } from "../components/room/MatchInstructions";
import RoomStatusBar from "../components/room/RoomStatusBar";
import StartMatchModal from "../components/room/StartMatchModal";

export default function TournamentRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [prevStatus, setPrevStatus] = useState(null);
  // tournamentState removed — useRoomEngine's tournament is single source of truth
  const [showStartModal, setShowStartModal] = useState(false);

  const {
    tournament,
    setTournament,
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
    kickPlayer,
    swapRequest,
    incomingSwap,
    requestSwap,
    cancelSwapRequest,
    respondToSwap,
  } = useRoomEngine(id, user, authLoading);

  const effectiveTournament = tournament; // always from useRoomEngine

  // Detect match start → show instructions (watch room_status)
  useEffect(() => {
    const st = effectiveTournament?.room_status || effectiveTournament?.status;
    if (st === "live" && prevStatus !== "live" && prevStatus !== null) {
      setShowInstructions(true);
    }
    if (st) setPrevStatus(st);
  }, [effectiveTournament?.room_status, effectiveTournament?.status]);

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
      
      // Check access: organizer / participant / admin / fondateur / super_admin
      if (session.user) {
        const [{ data: tournamentData }, { data: memberData }, { data: profileData }] = await Promise.all([
          supabase.from("tournaments").select("created_by").eq("id", id).single(),
          supabase.from("room_members").select("id").eq("tournament_id", id).eq("user_id", session.user.id).maybeSingle(),
          supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle(),
        ]);

        const isOrganizer  = tournamentData?.created_by === session.user.id;
        const isMember     = !!memberData;
        const isPrivileged = ["admin","fondateur","super_admin","founder"].includes(profileData?.role);

        if (!isOrganizer && !isMember && !isPrivileged) {
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

      {/* Room Status Bar */}
      <div className="flex-shrink-0">
        <RoomStatusBar
          tournament={effectiveTournament}
          role={role}
          onTournamentUpdate={(t) => setTournament(t)}
        />
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
                onSwapRequest={requestSwap}
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
            onStartMatch={() => setShowStartModal(true)}
            onToggleReady={toggleReady}
            currentUserReady={currentUserReady}
          />
        </div>
      </div>

      {/* ── START MATCH MODAL (admin sets duration) ── */}
      <AnimatePresence>
        {showStartModal && (
          <StartMatchModal
            totalPlayers={members.length}
            onCancel={() => setShowStartModal(false)}
            onConfirm={(duration) => {
              setShowStartModal(false);
              startMatch(duration);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── MATCH START INSTRUCTIONS ── */}
      <AnimatePresence>
        {showInstructions && role !== "organizer" && (
          <MatchStartOverlay
            tournament={tournament}
            onDismiss={() => setShowInstructions(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SUBMIT REMINDER when finished ── */}
      {(effectiveTournament?.room_status === "results_open") && role !== "organizer" && !showSubmit && (
        <SubmitReminder onSubmit={() => setShowSubmit(true)} />
      )}

      {/* ── INCOMING SWAP REQUEST MODAL ── */}
      {incomingSwap && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0a1628",borderRadius:20,border:"1px solid rgba(251,191,36,.3)",padding:32,maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 0 60px rgba(251,191,36,.15)"}}>
            <p style={{fontSize:40,marginBottom:12}}>🔄</p>
            <p style={{fontFamily:"Bebas Neue,cursive",fontSize:24,color:"#fff",letterSpacing:2,marginBottom:8}}>
              DEMANDE D'ÉCHANGE
            </p>
            <p style={{fontFamily:"Space Grotesk,sans-serif",fontSize:14,color:"rgba(255,255,255,.5)",marginBottom:8}}>
              <strong style={{color:"#fbbf24"}}>{incomingSwap.fromName}</strong> veut échanger sa place avec toi.
            </p>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(255,255,255,.3)",marginBottom:24,letterSpacing:1}}>
              Leur siège: Équipe {incomingSwap.fromTeam} · Place {incomingSwap.fromSeat}
            </p>
            <div style={{display:"flex",gap:12}}>
              <button onClick={() => respondToSwap(false)}
                style={{flex:1,padding:"12px 0",borderRadius:11,background:"rgba(244,63,94,.1)",border:"1px solid rgba(244,63,94,.3)",color:"#f43f5e",fontFamily:"JetBrains Mono,monospace",fontSize:11,letterSpacing:2,cursor:"pointer",fontWeight:700}}>
                ❌ REFUSER
              </button>
              <button onClick={() => respondToSwap(true)}
                style={{flex:1,padding:"12px 0",borderRadius:11,background:"linear-gradient(135deg,#10b981,#00d4ff)",border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:11,letterSpacing:2,cursor:"pointer",fontWeight:700}}>
                ✅ ACCEPTER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OUTGOING SWAP REQUEST TOAST ── */}
      {swapRequest && (
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:200,background:"#0a1628",border:"1px solid rgba(0,212,255,.3)",borderRadius:14,padding:"14px 20px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 8px 32px rgba(0,212,255,.2)"}}>
          <div style={{fontSize:24,animation:"spin 1s linear infinite"}}>🔄</div>
          <div>
            <p style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"#00d4ff",letterSpacing:1,marginBottom:2}}>EN ATTENTE DE RÉPONSE...</p>
            <p style={{fontFamily:"Space Grotesk,sans-serif",fontSize:12,color:"rgba(255,255,255,.4)"}}>
              Échange demandé avec <strong style={{color:"#fff"}}>{swapRequest.toPlayer?.full_name}</strong>
            </p>
          </div>
          <button onClick={cancelSwapRequest}
            style={{background:"rgba(244,63,94,.15)",border:"1px solid rgba(244,63,94,.3)",borderRadius:8,padding:"6px 12px",color:"#f43f5e",fontFamily:"JetBrains Mono,monospace",fontSize:9,cursor:"pointer",letterSpacing:1}}>
            ANNULER
          </button>
        </div>
      )}

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

      {/* END MATCH button (organizer only) - shows only when countdown reached 0 */}
      {role === "organizer" && tournament?.status === "live" && 
       (countdown === 0 || (countdown === null && tournament?.end_time && new Date(tournament.end_time) <= new Date())) && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
          style={{position:"fixed",bottom:24,right:24,zIndex:50,display:"flex",gap:10}}>
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:.96}}
            onClick={async () => {
              if(!window.confirm("Terminer le match et ouvrir la soumission des résultats ?")) return;
              const { error } = await supabase.from("tournaments")
                .update({ 
                  status: "finished", 
                  room_status: "results_open",
                  match_end_time: new Date().toISOString()
                })
                .eq("id", id);
              if (error) alert("Erreur: " + error.message);
            }}
            style={{padding:"14px 24px",borderRadius:14,background:"linear-gradient(135deg,#f43f5e,#7c3aed)",border:"none",color:"#fff",fontFamily:"JetBrains Mono,monospace",fontSize:11,letterSpacing:2,fontWeight:700,cursor:"pointer",boxShadow:"0 8px 32px rgba(244,63,94,.4)"}}>
            🏁 TERMINER LE MATCH
          </motion.button>
        </motion.div>
      )}

      {/* SUBMIT RESULT button (players) - shows when finished */}
      {role !== "organizer" && (
        ["results_open","results_closed","finished"].includes(effectiveTournament?.room_status) ||
        effectiveTournament?.status === "finished"
      ) && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
          style={{position:"fixed",bottom:24,right:24,zIndex:50}}>
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:.96}}
            onClick={() => setShowSubmit(true)}
            style={{padding:"14px 28px",borderRadius:14,background:"linear-gradient(135deg,#00d4ff,#818cf8)",border:"none",color:"#000",fontFamily:"JetBrains Mono,monospace",fontSize:12,letterSpacing:2,fontWeight:700,cursor:"pointer",boxShadow:"0 8px 32px rgba(0,212,255,.4)"}}>
            📊 SOUMETTRE MON RÉSULTAT
          </motion.button>
        </motion.div>
      )}

      {/* Submit Result Panel */}
      <AnimatePresence>
        {showSubmit && (
          <SubmitResultPanel
            tournamentId={id}
            userId={user?.id}
            onClose={() => setShowSubmit(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}