import { supabase } from "../lib/supabase";

class RoomService {
  // جلب جميع اللاعبين المقبولين
  async getApprovedPlayers(tournamentId) {
    const { data, error } = await supabase
      .from("tournament_participants")
      .select(`
        id,
        user_id,
        team_number,
        seat_number,
        is_ready,
        profiles!tournament_participants_user_id_fkey (
          full_name,
          free_fire_id,
          avatar_url,
          verification_status
        )
      `)
      .eq("tournament_id", tournamentId)
      .eq("status", "approved")
      .order("team_number", { ascending: true })
      .order("seat_number", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // التحقق من حالة اللاعب
  async getPlayerStatus(tournamentId, userId) {
    const { data } = await supabase
      .from("tournament_participants")
      .select("status")
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId)
      .maybeSingle();

    return data?.status;
  }

  // تبديل حالة الاستعداد
  async toggleReady(participantId, currentState) {
    const { error } = await supabase
      .from("tournament_participants")
      .update({ is_ready: !currentState })
      .eq("id", participantId);

    if (error) throw error;
    return !currentState;
  }

  // طرد لاعب
  async kickPlayer(tournamentId, userId) {
    const { error } = await supabase
      .from("tournament_participants")
      .update({ status: "rejected" })
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }
}

export const roomService = new RoomService();