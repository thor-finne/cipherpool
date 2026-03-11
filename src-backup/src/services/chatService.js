import { supabase } from "../lib/supabase";

class ChatService {
  // جلب الرسائل
  async getMessages(tournamentId) {
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
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  // إرسال رسالة
  async sendMessage(tournamentId, userId, message) {
    const { error } = await supabase
      .from("room_messages")
      .insert([{
        tournament_id: tournamentId,
        user_id: userId,
        message: message.trim()
      }]);

    if (error) throw error;
    return true;
  }

  // حذف رسالة (للمنظم فقط)
  async deleteMessage(messageId) {
    const { error } = await supabase
      .from("room_messages")
      .delete()
      .eq("id", messageId);

    if (error) throw error;
    return true;
  }

  // جلب معلومات المرسل للرسالة الجديدة
  async enrichMessage(newMsg) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, free_fire_id, avatar_url")
      .eq("id", newMsg.user_id)
      .single();

    return { ...newMsg, profiles: profile };
  }
}

export const chatService = new ChatService();