import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useRoomEngine(id, user, authLoading) {
  const [tournament, setTournament] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [role, setRole] = useState("spectator");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);

  useEffect(() => {
    if (authLoading || !id || !user) {
      return;
    }

    const loadRoomData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("🔄 Loading room data for user:", user.id);

        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", id)
          .single();

        if (tournamentError) throw tournamentError;
        setTournament(tournamentData);
        console.log("✅ Tournament loaded:", tournamentData.name);

        // Restore countdown from DB end_time if match is live
        if (tournamentData.status === "live" && tournamentData.end_time) {
          const remaining = Math.max(0, Math.floor(
            (new Date(tournamentData.end_time) - new Date()) / 1000
          ));
          setCountdown(remaining);
          if (remaining > 0) {
            let secs = remaining;
            const restoreInterval = setInterval(() => {
              secs -= 1;
              setCountdown(secs);
              if (secs <= 0) {
                clearInterval(restoreInterval);
                setCountdown(0);
                // ⏹ Countdown done — organizer must click TERMINER manually
              }
            }, 1000);
          }
        }

        const { data: membersData, error: membersError } = await supabase
          .from("room_members")
          .select(`
            id,
            user_id,
            team_number,
            seat_number,
            is_ready,
            created_at,
            profiles!room_members_user_id_fkey (
              full_name,
              free_fire_id,
              avatar_url
            )
          `)
          .eq("tournament_id", id)
          .order("team_number", { ascending: true })
          .order("seat_number", { ascending: true });

        if (membersError) throw membersError;

        setMembers(membersData || []);
        setReadyCount(membersData?.filter(m => m.is_ready).length || 0);
        console.log("✅ Members loaded:", membersData?.length || 0);

        if (user?.id) {
          const { data: statsData, error: statsError } = await supabase
            .from("player_stats")
            .select("*")
            .eq("user_id", user.id);

          if (statsError) {
            console.warn("⚠️ Error loading player stats:", statsError);
          } else {
            setPlayerStats(statsData?.[0] || null);
            console.log("✅ Player stats loaded:", statsData?.[0] ? "found" : "not found");
          }
        }

        if (user?.id) {
          if (tournamentData.created_by === user.id) {
            setRole("organizer");
            console.log("👑 User is organizer");
          } else {
            // Check if admin/fondateur/super_admin → organizer access
            const { data: profileData } = await supabase
              .from("profiles").select("role").eq("id", user.id).maybeSingle();
            const isPrivileged = ["admin","fondateur","super_admin","founder"]
              .includes(profileData?.role);

            if (isPrivileged) {
              setRole("organizer");
              console.log("🛡️ Privileged user — organizer access");
            } else {
              const isMember = membersData?.some(m => m.user_id === user.id);
              if (isMember) {
                setRole("participant");
                console.log("🎮 User is participant");
              } else {
                setRole("spectator");
                console.log("👀 User is spectator");
              }
            }
          }
        } else {
          setRole("spectator");
          console.log("👀 No user, spectator mode");
        }

        const userMember = membersData?.find(m => m.user_id === user.id);
        console.log("🔍 User in room_members:", userMember ? "Yes" : "No", userMember);

      } catch (err) {
        console.error("❌ Error loading room:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        console.log("✅ Room loading complete, loading:", false);
      }
    };

    loadRoomData();
  }, [id, user, authLoading]);

  useEffect(() => {
    if (loading || !id) return;
    if (role === "spectator") {
      console.log("👀 Spectator mode, messages disabled");
      return;
    }

    console.log("💬 Loading messages for role:", role);

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("room_messages")
          .select(`
            id,
            message,
            created_at,
            user_id,
            profiles!room_messages_user_id_fkey (
              full_name,
              free_fire_id,
              avatar_url
            )
          `)
          .eq("tournament_id", id)
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) throw error;
        setMessages(data || []);
        console.log("✅ Messages loaded:", data?.length || 0);
      } catch (err) {
        console.warn("⚠️ Error loading messages:", err);
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(prev => prev + 1), 3000);
        }
      }
    };

    loadMessages();
  }, [id, role, retryCount, loading]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`room-${id}`)
      // ── room_members changes ──────────────────────────────────
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `tournament_id=eq.${id}` },
        async () => {
          console.log("🔄 Members changed, refreshing...");
          const { data: membersData } = await supabase
            .from("room_members")
            .select(`
              id, user_id, team_number, seat_number, is_ready, created_at,
              profiles!room_members_user_id_fkey ( full_name, free_fire_id, avatar_url )
            `)
            .eq("tournament_id", id)
            .order("team_number", { ascending: true })
            .order("seat_number", { ascending: true });
          setMembers(membersData || []);
          setReadyCount(membersData?.filter(m => m.is_ready).length || 0);
        }
      )
      // ── tournament status changes (live → results_open → finished) ──
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        async (payload) => {
          console.log("🏆 Tournament updated:", payload.new?.room_status, payload.new?.status);
          const { data: tData } = await supabase
            .from("tournaments")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (tData) setTournament(tData);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  useEffect(() => {
    if (!id || (role !== "participant" && role !== "organizer")) return;

    console.log("🔌 Subscribing to realtime messages...");

    const channel = supabase
      .channel(`room-messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `tournament_id=eq.${id}`
        },
        async (payload) => {
          console.log("📩 New message received via realtime");

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, free_fire_id, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          setMessages(prev => {
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, { ...payload.new, profiles: profile }];
          });
        }
      )
      .subscribe();

    return () => {
      console.log("❌ Removing realtime channel");
      supabase.removeChannel(channel);
    };
  }, [id, role]);

  const generateTeamStructure = () => {
    if (!tournament) return [];

    const { mode, max_players, game_type, cs_format } = tournament;

    let teamSize, numTeams;

    if (game_type === "cs") {
      // Clash Squad: ALWAYS 2 teams
      numTeams = 2;
      // team_size from cs_format: "1v1"→1, "2v2"→2, "4v4"→4
      const fmt = cs_format || mode || "4v4";
      teamSize = fmt === "1v1" ? 1 : fmt === "2v2" ? 2 : 4;
    } else {
      // Battle Royale: calculate from mode
      teamSize = mode === "squad" ? 4 : mode === "duo" ? 2 : 1;
      numTeams = Math.ceil(max_players / teamSize);
    }

    const teams = [];

    for (let team = 1; team <= numTeams; team++) {
      const teamSeats = [];
      for (let seat = 1; seat <= teamSize; seat++) {
        const member = members.find(m => m.team_number === team && m.seat_number === seat);
        teamSeats.push({
          seatNumber: seat,
          player: member ? {
            id: member.user_id,
            full_name: member.profiles?.full_name || "Unknown",
            free_fire_id: member.profiles?.free_fire_id || "",
            avatar_url: member.profiles?.avatar_url || null,
            isReady: member.is_ready || false
          } : null
        });
      }
      teams.push({ teamNumber: team, seats: teamSeats });
    }

    return teams;
  };

  // ── Swap request state ──────────────────────────────────────────
  const [swapRequest, setSwapRequest] = useState(null);
  // swapRequest = { toTeam, toSeat, toPlayer } — I want to go there

  const [incomingSwap, setIncomingSwap] = useState(null);
  // incomingSwap = { fromUserId, fromTeam, fromSeat, fromName } — they want my seat

  // Listen for swap requests via realtime (room_members changes or a dedicated channel)
  useEffect(() => {
    if (!id || !user) return;
    const swapChannel = supabase
      .channel(`swap-${id}`)
      .on("broadcast", { event: "swap_request" }, ({ payload }) => {
        // Someone wants to swap with me
        const myMember = members.find(m => m.user_id === user.id);
        if (myMember && 
            payload.toTeam === myMember.team_number && 
            payload.toSeat === myMember.seat_number &&
            payload.fromUserId !== user.id) {
          setIncomingSwap(payload);
        }
      })
      .on("broadcast", { event: "swap_cancelled" }, ({ payload }) => {
        if (incomingSwap?.fromUserId === payload.fromUserId) {
          setIncomingSwap(null);
        }
      })
      .on("broadcast", { event: "swap_response" }, ({ payload }) => {
        // Response to MY request
        if (payload.toUserId === user.id) {
          if (payload.accepted) {
            // Execute the swap
            doSwapExecution(payload.fromTeam, payload.fromSeat, payload.toTeam, payload.toSeat);
          } else {
            setSwapRequest(null);
            alert("❌ Swap refusé.");
          }
        }
      })
      .subscribe();
    return () => supabase.removeChannel(swapChannel);
  }, [id, user, members, incomingSwap]);

  // Send swap request to another player
  const requestSwap = async (toTeam, toSeat, toPlayer) => {
    if (role !== "participant" || tournament?.status !== "open") return;
    const myMember = members.find(m => m.user_id === user.id);
    if (!myMember) return;

    setSwapRequest({ toTeam, toSeat, toPlayer });

    await supabase.channel(`swap-${id}`).send({
      type: "broadcast",
      event: "swap_request",
      payload: {
        fromUserId: user.id,
        fromName: myMember.profiles?.full_name || "Someone",
        fromTeam: myMember.team_number,
        fromSeat: myMember.seat_number,
        toTeam, toSeat,
      }
    });
  };

  // Cancel my outgoing request
  const cancelSwapRequest = async () => {
    if (!swapRequest) return;
    const myMember = members.find(m => m.user_id === user.id);
    await supabase.channel(`swap-${id}`).send({
      type: "broadcast", event: "swap_cancelled",
      payload: { fromUserId: user.id }
    });
    setSwapRequest(null);
  };

  // Respond to incoming swap request
  const respondToSwap = async (accepted) => {
    if (!incomingSwap) return;
    const myMember = members.find(m => m.user_id === user.id);
    if (!myMember) return;

    await supabase.channel(`swap-${id}`).send({
      type: "broadcast", event: "swap_response",
      payload: {
        accepted,
        toUserId: incomingSwap.fromUserId,
        fromTeam: myMember.team_number,
        fromSeat: myMember.seat_number,
        toTeam: incomingSwap.fromTeam,
        toSeat: incomingSwap.fromSeat,
      }
    });

    if (accepted) {
      doSwapExecution(myMember.team_number, myMember.seat_number, incomingSwap.fromTeam, incomingSwap.fromSeat);
    }
    setIncomingSwap(null);
  };

  // Execute the actual seat swap in DB
  const doSwapExecution = async (teamA, seatA, teamB, seatB) => {
    const memberA = members.find(m => m.team_number === teamA && m.seat_number === seatA);
    const memberB = members.find(m => m.team_number === teamB && m.seat_number === seatB);
    if (!memberA || !memberB) return;

    // Temp seat to avoid unique conflict
    await supabase.from("room_members")
      .update({ team_number: teamA, seat_number: 99 })
      .eq("tournament_id", id).eq("user_id", memberA.user_id);
    await supabase.from("room_members")
      .update({ team_number: teamB, seat_number: seatB })
      .eq("tournament_id", id).eq("user_id", memberA.user_id);
    await supabase.from("room_members")
      .update({ team_number: teamA, seat_number: seatA })
      .eq("tournament_id", id).eq("user_id", memberB.user_id);

    setSwapRequest(null);
  };
  // ── End swap logic ───────────────────────────────────────────────

  const changeSeat = async (teamNumber, seatNumber) => {
    if (role !== "participant") {
      alert("Only participants can change seats");
      return;
    }

    if (tournament?.status !== "open") {
      alert("Tournament is not open for seat changes");
      return;
    }

    const existingMember = members.find(
      m => m.team_number === teamNumber && m.seat_number === seatNumber
    );

    if (existingMember) {
      // Seat is taken → request swap instead
      requestSwap(teamNumber, seatNumber, existingMember);
      return;
    }

    const currentMember = members.find(m => m.user_id === user.id);
    if (!currentMember) return;

    setMembers(prev =>
      prev.map(m =>
        m.user_id === user.id
          ? { ...m, team_number: teamNumber, seat_number: seatNumber }
          : m
      )
    );

    try {
      const { error } = await supabase
        .from("room_members")
        .update({
          team_number: teamNumber,
          seat_number: seatNumber
        })
        .eq("tournament_id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error changing seat:", error);
        setMembers(prev =>
          prev.map(m =>
            m.user_id === user.id
              ? { ...currentMember }
              : m
          )
        );
        alert("Failed to change seat: " + error.message);
      }
    } catch (err) {
      console.error("Error changing seat:", err);
      setMembers(prev =>
        prev.map(m =>
          m.user_id === user.id
            ? { ...currentMember }
            : m
        )
      );
      alert("Failed to change seat: " + err.message);
    }
  };

  const toggleReady = async () => {
    if (role !== "participant") return;

    const currentMember = members.find(m => m.user_id === user.id);
    if (!currentMember) return;

    const newReadyState = !currentMember.is_ready;

    setMembers(prev =>
      prev.map(m =>
        m.user_id === user.id
          ? { ...m, is_ready: newReadyState }
          : m
      )
    );
    setReadyCount(prev => newReadyState ? prev + 1 : prev - 1);

    try {
      const { error } = await supabase
        .from("room_members")
        .update({ is_ready: newReadyState })
        .eq("tournament_id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error toggling ready:", error);
        setMembers(prev =>
          prev.map(m =>
            m.user_id === user.id
              ? { ...m, is_ready: currentMember.is_ready }
              : m
          )
        );
        setReadyCount(prev => currentMember.is_ready ? prev + 1 : prev - 1);
      }
    } catch (err) {
      console.error("Error toggling ready:", err);
      setMembers(prev =>
        prev.map(m =>
          m.user_id === user.id
            ? { ...m, is_ready: currentMember.is_ready }
            : m
        )
      );
      setReadyCount(prev => currentMember.is_ready ? prev + 1 : prev - 1);
    }
  };

  const sendMessage = async (message) => {
    if (role === "spectator") {
      alert("Spectators cannot send messages");
      return;
    }

    if (!message.trim()) return;

    const tempMessage = {
      id: Date.now(),
      message: message.trim(),
      created_at: new Date().toISOString(),
      user_id: user.id,
      profiles: {
        full_name: user.user_metadata?.full_name || "You",
        free_fire_id: "",
        avatar_url: null
      }
    };

    setMessages(prev => [...prev, tempMessage]);
    console.log("📤 Optimistic message added:", tempMessage);

    try {
      const { error } = await supabase
        .from("room_messages")
        .insert([{
          tournament_id: id,
          user_id: user.id,
          message: message.trim()
        }]);

      if (error) {
        console.error("Error sending message:", error);
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    }
  };

  const lockRoom = async () => {
    if (role !== "organizer") return;

    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ status: "locked" })
        .eq("id", id);

      if (error) throw error;
      setTournament(prev => ({ ...prev, status: "locked" }));

    } catch (err) {
      console.error("Error locking room:", err);
    }
  };

  const startMatch = async (durationMinutes = 20) => {
    if (role !== "organizer") return;
    // Admin can force start even if not all ready

    const now       = new Date();
    const endTime   = new Date(now.getTime() + durationMinutes * 60000);
    const deadline  = new Date(endTime.getTime() + 10 * 60000); // +10min results window

    // Update DB
    await supabase.from("tournaments").update({
      status:          "live",
      room_status:     "live",
      start_time:      now.toISOString(),
      match_duration:  durationMinutes,
      end_time:        endTime.toISOString(),
      result_deadline: deadline.toISOString(),
    }).eq("id", id);

    setTournament(prev => ({
      ...prev,
      status: "live",
      room_status: "live",
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      result_deadline: deadline.toISOString(),
      match_duration: durationMinutes,
    }));

    // Local countdown (seconds)
    let secs = durationMinutes * 60;
    setCountdown(secs);
    const interval = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(interval);
        setCountdown(0);
        // ⏹ Countdown done — organizer must click TERMINER manually
      }
    }, 1000);
  };

  const kickPlayer = async (userId) => {
    if (role !== "organizer") return;

    try {
      const { error } = await supabase
        .from("room_members")
        .delete()
        .eq("tournament_id", id)
        .eq("user_id", userId);

      if (error) throw error;

    } catch (err) {
      console.error("Error kicking player:", err);
    }
  };

  const teams = generateTeamStructure();

  return {
    tournament,
    members,
    teams,
    messages,
    role,
    loading,
    error,
    readyCount,
    countdown,
    playerStats,
    selectedPlayer,
    setSelectedPlayer,
    changeSeat,
    swapRequest,
    incomingSwap,
    requestSwap,
    cancelSwapRequest,
    respondToSwap,
    toggleReady,
    sendMessage,
    lockRoom,
    startMatch,
    kickPlayer,
    setTournament
  };
}