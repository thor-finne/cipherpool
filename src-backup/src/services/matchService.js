// src/services/matchService.js

import { supabase } from '../lib/supabase';

class MatchService {
  /**
   * إنشاء غرفة مباراة جديدة بعد بدء البطولة
   */
  async createMatchRoom(tournamentId) {
    // 1. جلب جميع المشاركين المقبولين
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select(`
        user_id,
        profiles:user_id (
          full_name,
          free_fire_id
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'approved');

    if (participantsError) throw participantsError;

    // 2. إنشاء سجل المباراة
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert([{
        tournament_id: tournamentId,
        status: 'live',
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (matchError) throw matchError;

    // 3. إضافة المشاركين إلى جدول match_participants
    if (participants && participants.length > 0) {
      const matchParticipants = participants.map(p => ({
        match_id: match.id,
        user_id: p.user_id,
        status: 'playing'
      }));

      const { error: insertError } = await supabase
        .from('match_participants')
        .insert(matchParticipants);

      if (insertError) throw insertError;
    }

    return match;
  }

  /**
   * إرسال نتيجة المباراة (يقوم بها الكابتن)
   */
  async submitMatchResult(matchId, userId, resultData) {
    // resultData: { position, kills, screenshot_url? }
    const { error } = await supabase
      .from('match_results')
      .insert([{
        match_id: matchId,
        user_id: userId,
        ...resultData,
        status: 'pending' // تنتظر تأكيد الأدمن
      }]);

    if (error) throw error;
    return true;
  }

  /**
   * تأكيد نتيجة المباراة (يقوم بها الأدمن)
   */
  async confirmMatchResult(resultId, adminId) {
    const { error } = await supabase
      .from('match_results')
      .update({
        status: 'confirmed',
        confirmed_by: adminId,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', resultId);

    if (error) throw error;
    return true;
  }

  /**
   * إنهاء المباراة وتوزيع الجوائز
   */
  async endMatch(matchId) {
    // جلب جميع النتائج المؤكدة
    const { data: results, error: resultsError } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'confirmed');

    if (resultsError) throw resultsError;

    // تحديث إحصائيات اللاعبين
    for (const result of results) {
      await supabase.rpc('update_player_stats', {
        p_user_id: result.user_id,
        p_position: result.position,
        p_kills: result.kills
      });

      // إضافة الجوائز إلى المحفظة
      if (result.reward > 0) {
        await supabase.rpc('grant_coins', {
          target_user: result.user_id,
          amount: result.reward
        });
      }
    }

    // تحديث حالة المباراة
    await supabase
      .from('matches')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', matchId);

    return true;
  }
}

export const matchService = new MatchService();