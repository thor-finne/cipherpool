import { useState, useEffect } from "react";
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

  // تحميل بيانات الغرفة
  useEffect(() => {
    if (authLoading || !id || !user) {
      return;
    }

    const loadRoomData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("🔄 Loading room data for user:", user.id);

        // 1. جلب البطولة
        const { data: tournamentData, error: tournamentError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", id)
          .single();

        if (tournamentError) throw tournamentError;
        setTournament(tournamentData);
        console.log("✅ Tournament loaded:", tournamentData.name);

        // 2. جلب أعضاء الغرفة
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

        // 3. جلب إحصائيات اللاعب - بدون maybeSingle
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

        // 4. تحديد دور المستخدم
        if (user?.id) {
          // هل هو منظم؟
          if (tournamentData.created_by === user.id) {
            setRole("organizer");
            console.log("👑 User is organizer");
          } else {
            // هل هو عضو في الغرفة؟
            const isMember = membersData?.some(m => m.user_id === user.id);
            if (isMember) {
              setRole("participant");
              console.log("🎮 User is participant");
            } else {
              setRole("spectator");
              console.log("👀 User is spectator");
            }
          }
        } else {
          setRole("spectator");
          console.log("👀 No user, spectator mode");
        }

        // 5. التحقق من أن المستخدم عضو في الغرفة (للتأكيد)
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

  // جلب الرسائل
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

  // اشتراك في تحديثات الأعضاء
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`room-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `tournament_id=eq.${id}`
        },
        async () => {
          console.log("🔄 Members changed, refreshing...");
          const { data: membersData } = await supabase
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

          setMembers(membersData || []);
          setReadyCount(membersData?.filter(m => m.is_ready).length || 0);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  // اشتراك في الرسائل الجديدة (Realtime)
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

          // جلب معلومات المرسل
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, free_fire_id, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          // التحقق من أن الرسالة مش موجودة (منع التكرار مع optimistic)
          setMessages(prev => {
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, { ...payload.new, profiles: profile }];
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      console.log("❌ Removing realtime channel");
      supabase.removeChannel(channel);
    };
  }, [id, role]);

  // توليد هيكل الفرق
  const generateTeamStructure = () => {
    if (!tournament) return [];

    const { mode, max_players } = tournament;
    const teamSize = mode === "squad" ? 4 : mode === "duo" ? 2 : 1;
    const numTeams = Math.ceil(max_players / teamSize);

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

  // تغيير المقعد (مع optimistic update)
  const changeSeat = async (teamNumber, seatNumber) => {
    if (role !== "participant") {
      alert("Only participants can change seats");
      return;
    }

    if (tournament?.status !== "open") {
      alert("Tournament is not open for seat changes");
      return;
    }

    // التحقق من أن المقعد خالي
    const existingMember = members.find(
      m => m.team_number === teamNumber && m.seat_number === seatNumber
    );

    if (existingMember) {
      alert("This seat is already taken");
      return;
    }

    const currentMember = members.find(m => m.user_id === user.id);
    if (!currentMember) return;

    // Optimistic update - التحديث الفوري
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
        // التراجع عن التحديث
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

  // تبديل حالة الاستعداد (مع optimistic update)
  const toggleReady = async () => {
    if (role !== "participant") return;

    const currentMember = members.find(m => m.user_id === user.id);
    if (!currentMember) return;

    const newReadyState = !currentMember.is_ready;

    // Optimistic update
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
        // التراجع عن التحديث
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

  // ✅ إرسال رسالة مع optimistic update
  const sendMessage = async (message) => {
    if (role === "spectator") {
      alert("Spectators cannot send messages");
      return;
    }

    if (!message.trim()) return;

    // رسالة مؤقتة للتحديث الفوري
    const tempMessage = {
      id: Date.now(), // ID مؤقت
      message: message.trim(),
      created_at: new Date().toISOString(),
      user_id: user.id,
      profiles: {
        full_name: user.user_metadata?.full_name || "You",
        free_fire_id: "",
        avatar_url: null
      }
    };

    // ✅ Optimistic update - تظهر فوراً
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
        // إذا فشل، نمسح الرسالة المؤقتة
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    }
  };

  // قفل الغرفة (للمنظم)
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

  // بدء المباراة (للمنظم)
  const startMatch = async () => {
    if (role !== "organizer") return;

    if (readyCount < members.length) {
      alert("Not all players are ready");
      return;
    }

    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          supabase
            .from("tournaments")
            .update({ status: "live" })
            .eq("id", id)
            .then(() => setTournament(prev => ({ ...prev, status: "live" })));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // طرد لاعب (للمنظم)
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
    toggleReady,
    sendMessage,
    lockRoom,
    startMatch,
    kickPlayer
  };
}