import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const { profile: authProfile } = useOutletContext();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");
  const [localProfile, setLocalProfile] = useState(authProfile);
  const [granting, setGranting] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantMessage, setGrantMessage] = useState("");
  
  const {
    profile: dataProfile,
    stats,
    achievements,
    recentMatches,
    transactions,
    balance,
    loading,
    error,
    uploadAvatar,
    refresh
  } = useProfileData(authProfile?.id);

  // دمج البروفايل من الـ context مع البيانات المحملة
  const profile = dataProfile || localProfile;

  // تحديث localProfile عند تغير authProfile
  useEffect(() => {
    setLocalProfile(authProfile);
  }, [authProfile]);

  // ✅ التحقق من حالة verification و role
  const isApproved = profile?.verification_status === "approved";
  const isSuperAdmin = profile?.role === "super_admin";
  const verificationStatus = profile?.verification_status || "pending";
  
  console.log("🔍 Profile verification status:", verificationStatus, "isApproved:", isApproved);
  console.log("👑 User role:", profile?.role);

  const firstName = profile?.full_name?.split(" ")[0] || "Player";

  // حساب مستوى XP
  const xpProgress = (profile?.xp % 100) || 0;
  const currentLevel = profile?.level || 1;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  // ✅ دالة إعطاء العملات (فقط super_admin)
  const handleGrantCoins = async () => {
    if (!isSuperAdmin) return;
    
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount <= 0) {
      setGrantMessage("Please enter a valid amount");
      return;
    }

    setGranting(true);
    setGrantMessage("");

    try {
      const { error } = await supabase.rpc("grant_coins", {
        target_user: profile.id,
        amount: amount
      });

      if (error) throw error;

      setGrantMessage(`✅ Successfully granted ${amount} coins!`);
      setGrantAmount("");
      refresh(); // تحديث البيانات
      
      setTimeout(() => setGrantMessage(""), 3000);
    } catch (err) {
      console.error("Error granting coins:", err);
      setGrantMessage("❌ " + err.message);
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        {/* Header Skeleton */}
        <div className="h-48 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-b border-white/5 skeleton-pulse"></div>

        <div className="max-w-7xl mx-auto px-8 -mt-24">
          {/* Profile Card Skeleton */}
          <div className="bg-[#11151C] border border-white/5 rounded-2xl p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-32 h-32 rounded-2xl bg-white/5 skeleton-pulse"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 w-64 bg-white/5 rounded skeleton-pulse"></div>
                <div className="h-2 w-full bg-white/5 rounded skeleton-pulse"></div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="h-12 bg-white/5 rounded skeleton-pulse"></div>
                  <div className="h-12 bg-white/5 rounded skeleton-pulse"></div>
                </div>
              </div>
              <div className="w-[200px] h-32 bg-white/5 rounded-xl skeleton-pulse"></div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-24 bg-white/5 rounded skeleton-pulse"></div>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-xl skeleton-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      {/* Header Background */}
      <div className="h-48 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-b border-white/5"></div>

      <div className="max-w-7xl mx-auto px-8 -mt-24">
        
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#11151C] border border-white/5 rounded-2xl p-8 mb-8 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* Avatar Section */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  firstName[0]
                )}
              </div>
              
              {isApproved && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <span className="text-white text-sm">
                    {uploading ? "..." : "Change"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Info Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-white">{profile?.full_name}</h1>
                
                {/* Role & Verification Badges */}
                <div className="flex gap-2">
                  {profile?.role === "super_admin" && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs">
                      👑 Super Admin
                    </span>
                  )}
                  {profile?.role === "admin" && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs">
                      🛡️ Admin
                    </span>
                  )}
                  {profile?.role === "founder" && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs">
                      🎮 Founder
                    </span>
                  )}
                  
                  {!isApproved ? (
                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs">
                      ⏳ {verificationStatus === "pending" ? "Pending" : verificationStatus}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs">
                      ✅ Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Level & XP */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400 font-bold">Level {currentLevel}</span>
                  <span className="text-xs text-white/40">{profile?.xp || 0} XP</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                  />
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-white/40 mb-1">Free Fire ID</p>
                  <p className="text-white font-medium font-mono">
                    {profile?.free_fire_id || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/40 mb-1">Member Since</p>
                  <p className="text-white font-medium">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Super Admin Grant Coins Section */}
              {isSuperAdmin && (
                <div className="admin-grant-card">
                  <h3>👑 Super Admin Actions</h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      min="1"
                    />
                    <button
                      onClick={handleGrantCoins}
                      disabled={granting || !grantAmount}
                    >
                      {granting ? "Granting..." : "Grant Coins"}
                    </button>
                  </div>
                  {grantMessage && (
                    <p className="mt-3 text-sm text-purple-400">{grantMessage}</p>
                  )}
                </div>
              )}
            </div>

            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20 rounded-xl p-6 min-w-[200px]">
              <p className="text-sm text-white/40 mb-2">Wallet Balance</p>
              <p className="text-3xl font-bold text-purple-400 mb-4">
                {balance} <span className="text-sm text-white/40">Coins</span>
              </p>
              <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
                Add Coins
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/5 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              activeTab === "stats" 
                ? "text-purple-400 border-b-2 border-purple-400" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              activeTab === "achievements" 
                ? "text-purple-400 border-b-2 border-purple-400" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Achievements
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              activeTab === "history" 
                ? "text-purple-400 border-b-2 border-purple-400" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Match History
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              activeTab === "wallet" 
                ? "text-purple-400 border-b-2 border-purple-400" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Wallet
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* Stats Tab */}
            {activeTab === "stats" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard 
                    label="Total Matches" 
                    value={stats.total_matches || 0}
                    icon="🎮"
                  />
                  <StatCard 
                    label="Wins" 
                    value={stats.wins || 0}
                    icon="🏆"
                  />
                  <StatCard 
                    label="Win Rate" 
                    value={`${stats.win_rate || 0}%`}
                    icon="📊"
                  />
                  <StatCard 
                    label="MVP" 
                    value={stats.mvp_count || 0}
                    icon="👑"
                  />
                  <StatCard 
                    label="Total Kills" 
                    value={stats.total_kills || 0}
                    icon="⚔️"
                  />
                </div>

                <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Performance Overview</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/40">Win Rate</span>
                        <span className="text-purple-400">{stats.win_rate || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                          style={{ width: `${stats.win_rate || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{stats.wins || 0}</p>
                        <p className="text-xs text-white/40">Total Wins</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{stats.total_kills || 0}</p>
                        <p className="text-xs text-white/40">Total Kills</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === "achievements" && (
              <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Earned Achievements</h3>
                
                {achievements.length === 0 ? (
                  <div className="empty-state">
                    <p>No achievements yet</p>
                    <span>Play more tournaments to unlock achievements</span>
                    <div>
                      <a href="/tournaments" className="empty-state-action">
                        Browse Tournaments
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {achievements.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.05 }}
                        className="bg-[#1A1F2B] border border-white/5 rounded-xl p-6 text-center group cursor-pointer"
                      >
                        <div className="text-4xl mb-3 group-hover:scale-110 transition">
                          {item.achievements.icon}
                        </div>
                        <h4 className="font-medium text-white mb-1">
                          {item.achievements.name}
                        </h4>
                        <p className="text-xs text-white/40">
                          {new Date(item.earned_at).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Match History Tab */}
            {activeTab === "history" && (
              <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Recent Matches</h3>
                
                {recentMatches.length === 0 ? (
                  <div className="empty-state">
                    <p>No matches played yet</p>
                    <span>Join your first tournament to start competing</span>
                    <div>
                      <a href="/tournaments" className="empty-state-action">
                        Join Tournament
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentMatches.map((match) => (
                      <div 
                        key={match.id}
                        className="flex items-center justify-between p-4 bg-[#1A1F2B] rounded-lg hover:bg-[#1F2A3A] transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                            match.position === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            match.position === 2 ? 'bg-gray-400/20 text-gray-400' :
                            match.position === 3 ? 'bg-orange-500/20 text-orange-500' :
                            'bg-white/5 text-white/40'
                          }`}>
                            #{match.position}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {match.matches?.tournaments?.name || "Unknown Tournament"}
                            </p>
                            <p className="text-xs text-white/40">
                              {new Date(match.created_at).toLocaleDateString()} • 
                              {match.kills} kills {match.mvp && '• 👑 MVP'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-purple-400 font-bold">+{match.reward}</p>
                          <p className="text-xs text-white/40">coins</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === "wallet" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8">
                  <p className="text-sm text-white/80 mb-2">Current Balance</p>
                  <p className="text-5xl font-bold text-white mb-2">{balance}</p>
                  <p className="text-sm text-white/60">≈ {(balance * 0.1).toFixed(2)} USD</p>
                </div>

                <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Transaction History</h3>
                  
                  {transactions.length === 0 ? (
                    <div className="empty-state">
                      <p>No transactions yet</p>
                      <span>Your transaction history will appear here</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div 
                          key={tx.id}
                          className="flex items-center justify-between p-4 bg-[#1A1F2B] rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-white capitalize">{tx.type}</p>
                            <p className="text-xs text-white/40">
                              {new Date(tx.created_at).toLocaleDateString()} • {tx.description || ''}
                            </p>
                          </div>
                          <span className={`font-bold ${
                            tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <button className="px-6 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition">
                    Deposit Coins
                  </button>
                  <button className="px-6 py-4 border border-white/10 hover:border-white/30 rounded-xl font-medium transition">
                    Withdraw Coins
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="bg-[#11151C] border border-white/5 rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl opacity-50">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/40">{label}</p>
    </motion.div>
  );
}