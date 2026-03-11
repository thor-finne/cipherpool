import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useProfileData(userId) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    tournaments_played: 0,
    wins: 0,
    losses: 0,
    kills: 0,
    deaths: 0,
    kd_ratio: 0,
    rank: 0
  });
  const [achievements, setAchievements] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [equippedItems, setEquippedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    
    loadProfileData();
    
    const channel = supabase
      .channel('wallet_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadProfileData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const loadProfileData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔄 Loading profile data for user:", userId);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }

      console.log("✅ Profile loaded:", profileData);
      setProfile(profileData);

      try {
        const { data: statsData, error: statsError } = await supabase
          .from("player_stats")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (statsError) {
          console.warn("Stats error:", statsError);
        } else if (statsData) {
          const kdRatio = statsData.deaths > 0 
            ? (statsData.kills / statsData.deaths).toFixed(2) 
            : statsData.kills;
          
          setStats({
            tournaments_played: statsData.tournaments_played || 0,
            total_matches:      statsData.tournaments_played || 0,  // alias for Profile.jsx
            wins:               statsData.wins || 0,
            losses:             statsData.losses || 0,
            kills:              statsData.kills || 0,
            deaths:             statsData.deaths || 0,
            kd_ratio:           kdRatio || 0,
            rank:               statsData.rank || 0,
            top3_finishes:      statsData.top3_finishes || 0,
            total_earnings:     statsData.total_earnings || 0,
            total_points:       statsData.total_points || 0,
            best_position:      statsData.best_position || null,
          });
          console.log("✅ Stats loaded:", statsData);
        }
      } catch (statsErr) {
        console.warn("Stats error:", statsErr);
      }

      try {
        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (!walletError && walletData) {
          setBalance(walletData.balance || 0);
          console.log("✅ Wallet balance loaded:", walletData.balance);
        } else {
          const { data: newWallet, error: createError } = await supabase
            .from("wallets")
            .insert([{ user_id: userId, balance: 0 }])
            .select()
            .single();

          if (!createError && newWallet) {
            setBalance(0);
            console.log("✅ New wallet created");
          }
        }
      } catch (walletErr) {
        console.warn("Wallet error:", walletErr);
      }

      try {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (transactionsError) {
          console.warn("Transactions error:", transactionsError);
        } else {
          setTransactions(transactionsData || []);
          console.log("✅ Transactions loaded:", transactionsData?.length || 0);
        }
      } catch (txErr) {
        console.warn("Transactions error:", txErr);
      }

      try {
        const { data: achievementsData, error: achievementsError } = await supabase
          .from("user_achievements")
          .select(`
            id,
            earned_at,
            achievements (
              id,
              name,
              description,
              icon
            )
          `)
          .eq("user_id", userId)
          .order("earned_at", { ascending: false });

        if (achievementsError) {
          console.warn("Achievements error:", achievementsError);
        } else {
          setAchievements(achievementsData || []);
          console.log("✅ Achievements loaded:", achievementsData?.length || 0);
        }
      } catch (achErr) {
        console.warn("Achievements error:", achErr);
      }

      try {
        const { data: matchesData, error: matchesError } = await supabase
          .from("match_results")
          .select(`
            id,
            position,
            kills,
            mvp,
            reward,
            created_at,
            matches (
              id,
              tournament_id,
              tournaments (
                name
              )
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (matchesError) {
          console.warn("Matches error:", matchesError);
        } else {
          setRecentMatches(matchesData || []);
          console.log("✅ Matches loaded:", matchesData?.length || 0);
        }
      } catch (matchErr) {
        console.warn("Matches error:", matchErr);
      }

      // ── Equipped store items ──────────────────────────────────
      try {
        const { data: equippedData } = await supabase
          .from("user_items")
          .select("item_id, equipped, store_items(id, name, type, rarity, image_url)")
          .eq("user_id", userId)
          .eq("equipped", true);

        if (equippedData) {
          const map = {};
          equippedData.forEach(ui => {
            if (ui.store_items) map[ui.store_items.type] = ui.store_items;
          });
          setEquippedItems(map);
        }
      } catch (_e) {
        // store tables may not exist yet
      }

    } catch (err) {
      console.error("❌ Error loading profile data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log("✅ Profile data loading complete");
    }
  };

  const uploadAvatar = async (file) => {
    if (!file || !userId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(updatedProfile);
      
      return data.publicUrl;
    } catch (err) {
      console.error("Error uploading avatar:", err);
      throw err;
    }
  };

  const updateStats = async (newStats) => {
    try {
      const { error } = await supabase
        .from("player_stats")
        .update(newStats)
        .eq("user_id", userId);

      if (error) throw error;
      setStats(prev => ({ ...prev, ...newStats }));
    } catch (err) {
      console.error("Error updating stats:", err);
    }
  };

  return {
    profile,
    stats,
    achievements,
    recentMatches,
    transactions,
    balance,
    equippedItems,
    loading,
    error,
    uploadAvatar,
    updateStats,
    refresh: loadProfileData
  };
}