// src/services/tournamentService.js

import { supabase } from '../lib/supabase';

class TournamentService {
  /**
   * إنشاء بطولة جديدة
   */
  async createTournament(data, creatorId) {
    const { error } = await supabase
      .from('tournaments')
      .insert([{
        ...data,
        created_by: creatorId,
        status: 'open',
        current_players: 0
      }]);

    if (error) throw error;
    return true;
  }

  /**
   * جلب بطولة محددة مع التحقق
   */
  async getTournament(tournamentId) {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        creator:profiles!tournaments_created_by_fkey (
          id,
          full_name,
          role
        ),
        participants:tournament_participants(
          id,
          user_id,
          status,
          team_number,
          seat_number,
          is_ready,
          profiles:user_id(
            full_name,
            free_fire_id,
            avatar_url
          )
        )
      `)
      .eq('id', tournamentId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * طلب الانضمام إلى بطولة
   */
  async requestToJoin(tournamentId, userId) {
    // التحقق من عدم وجود طلب سابق
    const { data: existing } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      throw new Error('You have already requested to join this tournament');
    }

    const { error } = await supabase
      .from('tournament_participants')
      .insert([{
        tournament_id: tournamentId,
        user_id: userId,
        status: 'pending'
      }]);

    if (error) throw error;
    return true;
  }

  /**
   * قبول طلب انضمام (للمؤسس)
   */
  async approveRequest(requestId, tournamentId, userId, reviewerId) {
    // بدء معاملة
    const { error } = await supabase.rpc('approve_tournament_request', {
      p_request_id: requestId,
      p_tournament_id: tournamentId,
      p_user_id: userId,
      p_reviewer_id: reviewerId
    });

    if (error) throw error;
    return true;
  }

  /**
   * رفض طلب انضمام
   */
  async rejectRequest(requestId, reviewerId) {
    const { error } = await supabase
      .from('tournament_participants')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  }

  /**
   * بدء البطولة (إنشاء مباراة)
   */
  async startTournament(tournamentId) {
    const { data, error } = await supabase
      .rpc('start_match', {
        tournament_id: tournamentId
      });

    if (error) throw error;
    return data; // match_id
  }

  /**
   * تغيير مقعد لاعب
   */
  async changeSeat(tournamentId, userId, teamNumber, seatNumber) {
    const { error } = await supabase
      .from('tournament_participants')
      .update({
        team_number: teamNumber,
        seat_number: seatNumber
      })
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (error) throw error;
    return true;
  }

  /**
   * تبديل حالة الاستعداد
   */
  async toggleReady(tournamentId, userId) {
    const { data: current } = await supabase
      .from('tournament_participants')
      .select('is_ready')
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId)
      .single();

    const { error } = await supabase
      .from('tournament_participants')
      .update({ is_ready: !current.is_ready })
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId);

    if (error) throw error;
    return !current.is_ready;
  }
}

export const tournamentService = new TournamentService();