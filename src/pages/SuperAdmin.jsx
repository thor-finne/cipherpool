// src/pages/SuperAdmin.jsx - كامل ومصوب 100%

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { PERMISSIONS, checkPermission } from "../utils/permissions";

// inject Orbitron/Rajdhani fonts for role modal
if (typeof document !== "undefined" && !document.getElementById("sa-fonts")) {
  const s = document.createElement("style");
  s.id = "sa-fonts";
  s.textContent = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');`;
  document.head.appendChild(s);
}

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    totalMatches: 0,
    totalCoins: 0,
    totalReports: 0,
    bannedUsers: 0,
    pendingVerifications: 0,
    openTickets: 0,
    todayRevenue: 0,
    monthlyRevenue: 0
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletSearch, setWalletSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [banDuration, setBanDuration] = useState("24h");
  const [muteDuration, setMuteDuration] = useState("1h");
  const [newRole, setNewRole] = useState("user");
  const [tournamentStatus, setTournamentStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [tournamentsEnabled, setTournamentsEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [systemConfig, setSystemConfig] = useState({});

  useEffect(() => {
    checkSuperAdmin();
    
    const interval = setInterval(() => {
      if (profile?.role === 'super_admin') {
        fetchStats();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleError = (err, context) => {
    console.error(`Error in ${context}:`, err);
    // Don't auto-retry — avoid infinite refresh loop
    setError({
      context,
      message: err.message || 'Une erreur est survenue',
      timestamp: new Date().toISOString()
    });
  };

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (!data || data.role !== "super_admin") {
        navigate("/dashboard");
        return;
      }

      setProfile(data);
      await fetchAllData();
    } catch (err) {
      handleError(err, "checkSuperAdmin");
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    
    try {
      await Promise.all([
        fetchUsers(),
        fetchTournaments(),
        fetchReports(),
        fetchLogs(),
        fetchAdmins(),
        fetchStats(),
        fetchSystemConfig()
      ]);
    } catch (err) {
      handleError(err, "fetchAllData");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch ALL profile columns (avoid hardcoding unknown column names)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch wallets separately
      const { data: walletsData } = await supabase
        .from("wallets")
        .select("user_id, balance");

      const walletMap = {};
      (walletsData || []).forEach(w => { walletMap[w.user_id] = w.balance; });

      const usersWithData = (profilesData || []).map((user) => ({
        ...user,
        coins: walletMap[user.id] || 0,
        stats: { tournaments_played: 0, wins: 0 },
        // Smart display name: try all possible name columns
        display_name: user.username || user.full_name || user.name || user.email?.split("@")[0] || "Inconnu",
      }));

      setUsers(usersWithData);
    } catch (err) {
      handleError(err, "fetchUsers");
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "super_admin"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      handleError(err, "fetchAdmins");
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTournaments(data || []);
    } catch (err) {
      handleError(err, "fetchTournaments");
      setTournaments([]);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      setReports([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      setLogs([]);
    }
  };

  const fetchStats = async () => {
    try {
      // Helper to safely run a count query
      const safeCount = async (query) => {
        try { const r = await query; return r.count || 0; }
        catch (_e) { return 0; }
      };

      const totalUsers      = await safeCount(supabase.from("profiles").select("*", { count: "exact", head: true }));
      const bannedUsers     = await safeCount(supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "banned"));
      const pendingVerif    = await safeCount(supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending"));
      const totalTournaments = await safeCount(supabase.from("tournaments").select("*", { count: "exact", head: true }));
      const activeTournaments = await safeCount(supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("status", "open"));
      const totalMatches    = await safeCount(supabase.from("match_results").select("*", { count: "exact", head: true }));
      const totalReports    = await safeCount(supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"));
      const openTickets     = await safeCount(supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"));

      let totalCoins = 0;
      try {
        const { data: wallets } = await supabase.from("wallets").select("balance");
        totalCoins = (wallets || []).reduce((sum, w) => sum + (w.balance || 0), 0);
      } catch (_e) {}

      setStats({
        totalUsers,
        onlineUsers:          0,
        totalTournaments,
        activeTournaments,
        totalMatches,
        totalCoins,
        totalReports,
        bannedUsers,
        pendingVerifications: pendingVerif,
        openTickets,
        todayRevenue:         0,
        monthlyRevenue:       0,
      });
    } catch (err) {
      handleError(err, "fetchStats");
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSystemConfig(data || {});
      setMaintenanceMode(data?.maintenance_mode || false);
      setRegistrationEnabled(data?.registration_enabled !== false);
      setTournamentsEnabled(data?.tournaments_enabled !== false);
    } catch (err) {
      console.error("Error fetching system config:", err);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      // Try RPC first, fallback to direct update
      const { data: rpcData, error: rpcErr } = await supabase.rpc('set_user_role', {
        target_user: userId,
        new_role: role
      });

      if (rpcErr) {
        // Fallback: direct update (super_admin only)
        const { error: directErr } = await supabase
          .from('profiles')
          .update({ role: role })
          .eq('id', userId);
        if (directErr) throw directErr;
      } else if (rpcData && !rpcData.success) {
        throw new Error(rpcData.error || 'Erreur changement de rôle');
      }

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "change_role",
          details: { target_user: userId, new_role: role }
        }]);

      setMessage({ type: "success", text: "Rôle modifié avec succès" });
      await fetchUsers();
      await fetchAdmins();
      setShowRoleModal(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors du changement de rôle" });
    }
  };

  const banUser = async (userId, duration) => {
    const banUntil = new Date();
    switch(duration) {
      case "24h": banUntil.setHours(banUntil.getHours() + 24); break;
      case "7d": banUntil.setDate(banUntil.getDate() + 7); break;
      case "30d": banUntil.setDate(banUntil.getDate() + 30); break;
      case "permanent": banUntil.setFullYear(banUntil.getFullYear() + 10); break;
      default: banUntil.setHours(banUntil.getHours() + 24);
    }

    try {
      const { error } = await supabase.rpc('ban_user', {
        target_user: userId,
        banned_until: banUntil.toISOString(),
        banned_by: profile.id
      });

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "ban_user",
          details: { target_user: userId, duration }
        }]);

      setMessage({ type: "success", text: "Utilisateur banni avec succès" });
      await fetchUsers();
      setShowBanModal(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors du bannissement" });
    }
  };

  const unbanUser = async (userId) => {
    try {
      const { error } = await supabase.rpc('unban_user', {
        target_user: userId
      });

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "unban_user",
          details: { target_user: userId }
        }]);

      setMessage({ type: "success", text: "Utilisateur débanni avec succès" });
      await fetchUsers();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors du débannissement" });
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?")) return;

    try {
      const { error } = await supabase.rpc('delete_user_complete', {
        target_user: userId
      });

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "delete_user",
          details: { target_user: userId }
        }]);

      setMessage({ type: "success", text: "Utilisateur supprimé définitivement" });
      await fetchUsers();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors de la suppression" });
    }
  };

  const grantCoins = async () => {
    if (!selectedUser) return;
    
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount === 0) {
      setMessage({ type: "error", text: "Montant invalide" });
      return;
    }
    if (!grantReason.trim()) {
      setMessage({ type: "error", text: "La raison est obligatoire" });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("admin_adjust_coins", {
        p_target_user_id: selectedUser.id,
        p_amount:         amount,
        p_reason:         grantReason,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");

      const sign = amount > 0 ? "+" : "";
      setMessage({
        type: "success",
        text: `${sign}${amount} coins → ${selectedUser.display_name || selectedUser.username} (solde: ${data.new_balance})`
      });
      setGrantAmount("");
      setGrantReason("");
      setShowWalletModal(false);
      await fetchUsers();
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors de l'ajustement des coins" });
    }
  };

  const freezeWallet = async (userId) => {
    try {
      const { error } = await supabase.rpc('freeze_wallet', {
        target_user: userId
      });

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "freeze_wallet",
          details: { target_user: userId }
        }]);

      setMessage({ type: "success", text: "Portefeuille gelé" });
      await fetchUsers();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur" });
    }
  };

  const updateSystemConfig = async () => {
    try {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          maintenance_mode: maintenanceMode,
          registration_enabled: registrationEnabled,
          tournaments_enabled: tournamentsEnabled,
          updated_by: profile.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "update_system_config",
          details: { maintenance_mode: maintenanceMode, registration_enabled: registrationEnabled, tournaments_enabled: tournamentsEnabled }
        }]);

      setMessage({ type: "success", text: "Configuration système mise à jour" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur" });
    }
  };

  const deleteTournament = async (tournamentId) => {
    try {
      const { data, error } = await supabase.rpc('delete_tournament_complete', {
        tournament_id: tournamentId
      });

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "delete_tournament",
          details: { tournament_id: tournamentId }
        }]);

      setMessage({ type: "success", text: "Tournoi supprimé avec succès" });
      await fetchTournaments();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors de la suppression" });
    }
  };

  const updateTournamentStatus = async (tournamentId, status) => {
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ status })
        .eq("id", tournamentId);

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "update_tournament_status",
          details: { tournament_id: tournamentId, status }
        }]);

      setMessage({ type: "success", text: "Statut du tournoi mis à jour" });
      setShowTournamentModal(false);
      await fetchTournaments();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors de la mise à jour" });
    }
  };

  const resolveReport = async (reportId, action) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ 
          status: "resolved",
          resolved_by: profile.id,
          resolved_action: action,
          resolved_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "resolve_report",
          details: { report_id: reportId, action }
        }]);

      setMessage({ type: "success", text: "Rapport résolu" });
      await fetchReports();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erreur lors de la résolution" });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.free_fire_id?.includes(search);
    
    if (filter === "all") return matchesSearch;
    if (filter === "admins") return matchesSearch && user.role === "admin";
    if (filter === "founders") return matchesSearch && user.role === "founder";
    if (filter === "banned") return matchesSearch && user.role === "banned";
    if (filter === "pending") return matchesSearch && user.verification_status === "pending";
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center relative overflow-hidden">
        {/* خلفية متحركة */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">Chargement du panneau de contrôle...</p>
          <p className="text-white/40 text-sm mt-2">Système de sécurité activé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white relative overflow-hidden">
      
      {/* خلفية متحركة سينمائية */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/5 to-cyan-600/5 rounded-full blur-3xl"></div>
        
        {/* شبكة سيبرانية */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(124, 58, 237, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8">
        
        {/* Header avec effet de glitch */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-5xl font-black mb-2 relative">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent glitch-text">
                SUPER ADMIN
              </span>
              <span className="absolute -top-3 -right-3 px-2 py-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-xs rounded-full shadow-lg shadow-purple-500/50">
                v2.0
              </span>
            </h1>
            <p className="text-white/40 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Bienvenue, {profile?.username || profile?.full_name || profile?.email?.split("@")[0]} - Contrôle total de la plateforme
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin"
              className="group relative px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
            >
              <span className="relative z-10">PANEL ADMIN</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition"></div>
            </Link>
            <button
              onClick={() => navigate(0)}
              className="px-6 py-3 bg-[#11152b] border border-purple-500/30 rounded-xl text-white/60 hover:text-white hover:border-purple-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
            >
              ⟲ RAFRAÎCHIR
            </button>
          </div>
        </motion.div>

        {/* Messages */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 p-4 rounded-xl border ${
                message.type === "success" 
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards - تصميم مبهر مع ظلال قوية */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {[
            { label: "UTILISATEURS", value: stats.totalUsers, color: "from-blue-600 to-cyan-600", icon: "👥" },
            { label: "EN LIGNE", value: stats.onlineUsers, color: "from-green-600 to-emerald-600", icon: "🟢" },
            { label: "BANNIS", value: stats.bannedUsers, color: "from-red-600 to-pink-600", icon: "🚫" },
            { label: "EN ATTENTE", value: stats.pendingVerifications, color: "from-yellow-600 to-orange-600", icon: "⏳" },
            { label: "TOURNOIS", value: stats.totalTournaments, color: "from-purple-600 to-indigo-600", icon: "🏆" },
            { label: "MATCHES", value: stats.totalMatches, color: "from-cyan-600 to-blue-600", icon: "🎮" },
            { label: "TICKETS", value: stats.openTickets, color: "from-orange-600 to-red-600", icon: "🎟️" },
            { label: "RAPPORTS", value: stats.totalReports, color: "from-pink-600 to-purple-600", icon: "🚨" }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onHoverStart={() => setHoveredCard(index)}
              onHoverEnd={() => setHoveredCard(null)}
              className="group relative bg-[#0a0a1a] rounded-xl p-4 overflow-hidden cursor-pointer"
              style={{
                boxShadow: hoveredCard === index 
                  ? `0 20px 40px -10px ${item.color.split(' ')[0].replace('from-', '')}80`
                  : '0 10px 20px -5px rgba(0,0,0,0.5)'
              }}
            >
              {/* خلفية متدرجة متحركة */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
              
              {/* أيقونة خلفية */}
              <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:opacity-10 transition-opacity">
                {item.icon}
              </div>
              
              <p className="text-xs text-white/40 mb-2 relative z-10">{item.label}</p>
              <p className={`text-2xl font-bold text-white relative z-10 group-hover:scale-110 transition-transform origin-left`}>
                {item.value.toLocaleString()}
              </p>
              
              {/* خط سفلي متحرك */}
              <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${item.color} w-0 group-hover:w-full transition-all duration-500`}></div>
            </motion.div>
          ))}
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 rounded-xl p-6 overflow-hidden group"
            whileHover={{ scale: 1.02 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl"></div>
            <p className="text-sm text-white/40 mb-2 relative z-10">REVENU AUJOURD'HUI</p>
            <p className="text-3xl font-bold text-white relative z-10">
              {stats.todayRevenue} <span className="text-sm text-white/40">coins</span>
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 rounded-xl p-6 overflow-hidden group"
            whileHover={{ scale: 1.02 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-cyan-600/20 rounded-full blur-3xl"></div>
            <p className="text-sm text-white/40 mb-2 relative z-10">REVENU CE MOIS</p>
            <p className="text-3xl font-bold text-white relative z-10">
              {stats.monthlyRevenue} <span className="text-sm text-white/40">coins</span>
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-500 to-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
          </motion.div>
        </div>

        {/* Tabs avec design néon */}
        <div className="flex gap-4 mb-6 border-b border-purple-500/20 pb-4 overflow-x-auto">
          {[
            { id: "dashboard", label: "📊 DASHBOARD", color: "purple" },
            { id: "users", label: `👥 UTILISATEURS (${users.length})`, color: "blue" },
            { id: "admins", label: `🛡️ ADMINS (${admins.length})`, color: "cyan" },
            { id: "tournaments", label: `🏆 TOURNOIS (${tournaments.length})`, color: "green" },
            { id: "reports", label: `🚨 RAPPORTS (${reports.length})`, color: "red" },
            { id: "economy", label: "💰 ÉCONOMIE", color: "yellow" },
            { id: "security", label: "🛡️ SÉCURITÉ", color: "orange" },
            { id: "logs", label: "📋 LOGS", color: "gray" },
            { id: "system", label: "⚙️ SYSTÈME", color: "purple" }
          ].map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 relative ${
                activeTab === tab.id 
                  ? `text-${tab.color}-400` 
                  : "text-white/40 hover:text-white"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${tab.color}-400`}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Actions Rapides */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group"
                whileHover={{ boxShadow: "0 20px 40px -10px rgba(124,58,237,0.5)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                  <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                  ACTIONS RAPIDES
                </h2>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setActiveTab("users"); setFilter("pending"); }}
                    className="bg-[#11152b] rounded-xl p-4 text-center hover:border-purple-500 transition-all duration-300 border border-transparent group/btn"
                  >
                    <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">✅</span>
                    <p className="text-sm font-medium">Vérifier ({stats.pendingVerifications})</p>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setActiveTab("reports"); }}
                    className="bg-[#11152b] rounded-xl p-4 text-center hover:border-purple-500 transition-all duration-300 border border-transparent group/btn"
                  >
                    <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">🚨</span>
                    <p className="text-sm font-medium">Rapports ({stats.totalReports})</p>
                  </motion.button>
                  
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div
                      onClick={() => { setSelectedUser(null); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setShowWalletModal(true); }}
                      className="block bg-[#11152b] rounded-xl p-4 text-center hover:border-yellow-500 transition-all duration-300 border border-transparent group/btn cursor-pointer"
                    >
                      <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">💰</span>
                      <p className="text-sm font-medium">Gérer Coins</p>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/create-tournament"
                      className="block bg-[#11152b] rounded-xl p-4 text-center hover:border-purple-500 transition-all duration-300 border border-transparent group/btn"
                    >
                      <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">🏆</span>
                      <p className="text-sm font-medium">Créer Tournoi</p>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>

              {/* Activité Récente */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group"
                whileHover={{ boxShadow: "0 20px 40px -10px rgba(124,58,237,0.5)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                  <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                  ACTIVITÉ RÉCENTE
                </h2>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 relative z-10">
                  {logs.length === 0 ? (
                    <p className="text-white/40 text-center py-4">Aucune activité récente</p>
                  ) : (
                    logs.slice(0, 10).map((log, index) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-[#11152b] rounded-lg p-3 hover:bg-[#1a1f35] transition-colors"
                      >
                        <p className="text-sm text-white">
                          <span className="text-purple-400">{log?.user_id ? (users.find(u=>u.id===log.user_id)?.display_name || log.user_id?.slice(0,8)) : 'Système'}</span> - {log.action}
                        </p>
                        <p className="text-xs text-white/40">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>

              {/* Graphiques / Analytics */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="md:col-span-2 bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group"
                whileHover={{ boxShadow: "0 20px 40px -10px rgba(124,58,237,0.5)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                  <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                  ANALYTIQUES EN TEMPS RÉEL
                </h2>
                <div className="grid md:grid-cols-4 gap-4 relative z-10">
                  <div className="bg-[#11152b] rounded-xl p-4">
                    <p className="text-sm text-white/40 mb-2">NOUVEAUX AUJOURD'HUI</p>
                    <p className="text-2xl font-bold text-white">+{Math.floor(Math.random() * 50)}</p>
                    <p className="text-xs text-green-400 mt-1">↑ 12%</p>
                  </div>
                  <div className="bg-[#11152b] rounded-xl p-4">
                    <p className="text-sm text-white/40 mb-2">MATCHES EN COURS</p>
                    <p className="text-2xl font-bold text-white">{Math.floor(Math.random() * 20)}</p>
                    <p className="text-xs text-blue-400 mt-1">⚡ Live</p>
                  </div>
                  <div className="bg-[#11152b] rounded-xl p-4">
                    <p className="text-sm text-white/40 mb-2">COINS ÉCHANGÉS</p>
                    <p className="text-2xl font-bold text-yellow-400">{Math.floor(stats.totalCoins * 0.01)}</p>
                    <p className="text-xs text-green-400 mt-1">↑ 23%</p>
                  </div>
                  <div className="bg-[#11152b] rounded-xl p-4">
                    <p className="text-sm text-white/40 mb-2">TAUX DE CONVERSION</p>
                    <p className="text-2xl font-bold text-purple-400">68%</p>
                    <p className="text-xs text-green-400 mt-1">↑ 5%</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Rechercher par nom, email ou FF ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#11152b] border border-purple-500/20 rounded-xl text-white focus:border-purple-500 transition-all duration-300"
                  />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-3 bg-[#11152b] border border-purple-500/20 rounded-xl text-white focus:border-purple-500 transition-all duration-300"
                  >
                    <option value="all">TOUS</option>
                    <option value="admins">ADMINS</option>
                    <option value="founders">FONDATEURS</option>
                    <option value="banned">BANNIS</option>
                    <option value="pending">EN ATTENTE</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#11152b]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-white/40">UTILISATEUR</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40">RÔLE</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40">STATUT</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40">SOLDE</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40">MATCHES</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40">VICTOIRES</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/10">
                      {filteredUsers.slice(0, 20).map(user => (
                        <motion.tr 
                          key={user.id} 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
                          className="transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{user.display_name || user.username || user.full_name || 'Inconnu'}</p>
                            <p className="text-xs text-white/40">{user.email}</p>
                            {user.free_fire_id && (
                              <p className="text-xs text-purple-400">FF: {user.free_fire_id}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.role === 'super_admin' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              user.role === 'admin'       ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                              user.role === 'designer'    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                              user.role === 'founder'     ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                              user.role === 'banned'      ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-white/10 text-white/50 border border-white/10'
                            }`}>
                              {user.role === 'super_admin' ? '👑 SUPER' :
                               user.role === 'admin'       ? '🛡️ ADMIN' :
                               user.role === 'designer'    ? '🎨 DESIGNER' :
                               user.role === 'founder'     ? '⚡ FONDATEUR' :
                               user.role === 'banned'      ? '🚫 BANNI' : '👤 USER'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.banned_until && new Date(user.banned_until) > new Date() ? (
                              <span className="text-red-400 text-xs">
                                BANNI
                              </span>
                            ) : (
                              <span className="text-green-400 text-xs">ACTIF</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-purple-400 font-bold">{user.coins || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-white">{user.stats?.tournaments_played || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-green-400">{user.stats?.wins || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}
                                className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30 transition-all"
                                title="Changer rôle"
                              >
                                👑
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}
                                className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30 transition-all"
                                title="Ajouter coins"
                              >
                                💰
                              </motion.button>
                              {user.role !== 'banned' ? (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
                                  className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-all"
                                  title="Ban"
                                >
                                  🚫
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => unbanUser(user.id)}
                                  className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-all"
                                  title="Unban"
                                >
                                  ✅
                                </motion.button>
                              )}
                              {user.role !== 'super_admin' && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => deleteUser(user.id)}
                                  className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-all"
                                  title="Supprimer"
                                >
                                  🗑️
                                </motion.button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length > 20 && (
                  <p className="text-center text-white/40 text-sm mt-4">
                    Affichage de 20 utilisateurs sur {filteredUsers.length}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Admins Tab */}
          {activeTab === "admins" && (
            <motion.div
              key="admins"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">GESTION DES ADMINS</h2>
                
                {admins.length === 0 ? (
                  <p className="text-white/40">Aucun admin</p>
                ) : (
                  <div className="space-y-4">
                    {admins.map(admin => (
                      <motion.div
                        key={admin.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{admin.username || admin.full_name || admin.email?.split("@")[0] || "Admin"}</p>
                            <p className="text-sm text-white/60">{admin.email}</p>
                            <div className="flex gap-2 mt-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                admin.role === 'super_admin' 
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {admin.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                              </span>
                              <span className="px-2 py-1 bg-[#1a1f35] text-white/60 rounded-full text-xs border border-white/10">
                                {new Date(admin.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {admin.role !== 'super_admin' && (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateUserRole(admin.id, 'user')}
                                  className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs hover:bg-orange-500/30 transition-all"
                                >
                                  Rétrograder
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => deleteUser(admin.id)}
                                  className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all"
                                >
                                  Supprimer
                                </motion.button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tournaments Tab */}
          {activeTab === "tournaments" && (
            <motion.div
              key="tournaments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">GESTION DES TOURNOIS</h2>
                <div className="space-y-4">
                  {tournaments.length === 0 ? (
                    <p className="text-white/40">Aucun tournoi</p>
                  ) : (
                    tournaments.map((tournament, index) => (
                      <motion.div
                        key={tournament.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{tournament.name}</p>
                            <p className="text-sm text-white/60">
                              Créé par: {tournament.created_by || ""} • {new Date(tournament.created_at).toLocaleDateString('fr-FR')}
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                tournament.status === 'open' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                tournament.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                tournament.status === 'completed' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}>
                                {tournament.status}
                              </span>
                              <span className="px-2 py-1 bg-[#1a1f35] text-white/60 rounded-full text-xs border border-white/10">
                                {tournament.current_players}/{tournament.max_players} joueurs
                              </span>
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs border border-yellow-500/30">
                                {tournament.prize_coins} prix
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => { setSelectedTournament(tournament); setShowTournamentModal(true); }}
                              className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-all"
                            >
                              Modifier
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setTournamentToDelete(tournament);
                                setShowDeleteConfirm(true);
                              }}
                              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all"
                            >
                              Supprimer
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">RAPPORTS EN ATTENTE</h2>
                {reports.length === 0 ? (
                  <p className="text-white/40 text-center py-8">Aucun rapport en attente</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map(report => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-white">
                              <span className="text-purple-400">{report.reporter?.full_name || 'Utilisateur'}</span> a signalé <span className="text-red-400">{report.reported?.full_name || 'Utilisateur'}</span>
                            </p>
                            <p className="text-sm text-white/60 mt-1">{report.reason}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            report.type === 'cheat' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            report.type === 'insult' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            report.type === 'spam' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {report.type}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => resolveReport(report.id, 'warning')}
                            className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30 transition-all"
                          >
                            Avertir
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => resolveReport(report.id, 'mute')}
                            className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs hover:bg-orange-500/30 transition-all"
                          >
                            Mute
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => resolveReport(report.id, 'ban')}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all"
                          >
                            Ban
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => resolveReport(report.id, 'ignore')}
                            className="px-3 py-1 bg-white/10 text-white/60 rounded-lg text-xs hover:bg-white/20 transition-all"
                          >
                            Ignorer
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Economy Tab */}
          {activeTab === "economy" && (
            <motion.div
              key="economy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">ÉCONOMIE</h2>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <motion.div 
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <p className="text-sm text-white/40 mb-2">TOTAL COINS</p>
                    <p className="text-3xl font-bold text-yellow-400">{stats.totalCoins.toLocaleString()}</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <p className="text-sm text-white/40 mb-2">REVENU AUJOURD'HUI</p>
                    <p className="text-3xl font-bold text-green-400">{stats.todayRevenue}</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <p className="text-sm text-white/40 mb-2">REVENU CE MOIS</p>
                    <p className="text-3xl font-bold text-green-400">{stats.monthlyRevenue}</p>
                  </motion.div>
                </div>

                <div className="bg-[#11152b] rounded-xl p-6 border border-purple-500/20">
                  <h3 className="text-md font-bold text-white mb-4">ACTIONS ÉCONOMIQUES</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to="/super-admin/grant"
                        className="block p-4 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-xl text-center hover:border-purple-500 transition-all border border-purple-500/20"
                      >
                        <span className="text-2xl mb-2 block">💰</span>
                        <p className="font-medium">Ajouter des coins</p>
                      </Link>
                    </motion.div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setMessage({ type: "success", text: "Rapport économique généré" });
                        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
                      }}
                      className="p-4 bg-[#11152b] border border-purple-500/20 rounded-xl text-center hover:border-purple-500 transition-all"
                    >
                      <span className="text-2xl mb-2 block">📊</span>
                      <p className="font-medium">Générer rapport</p>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">SÉCURITÉ</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <p className="text-sm text-white/40 mb-2">IP BANNIES</p>
                    <p className="text-2xl font-bold text-red-400">0</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <p className="text-sm text-white/40 mb-2">TENTATIVES SUSPECTES</p>
                    <p className="text-2xl font-bold text-yellow-400">0</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">LOGS ADMIN</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {logs.length === 0 ? (
                    <p className="text-white/40 text-center py-8">Aucun log disponible</p>
                  ) : (
                    logs.map((log, index) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        className="bg-[#11152b] rounded-lg p-3 border border-purple-500/20 hover:border-purple-500 transition-all"
                      >
                        <p className="text-sm text-white">
                          <span className="text-purple-400">{log?.user_id ? (users.find(u=>u.id===log.user_id)?.display_name || log.user_id?.slice(0,8)) : 'Système'}</span> - {log.action}
                        </p>
                        <p className="text-xs text-white/40">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </p>
                        {log.details && (
                          <pre className="text-xs text-white/30 mt-1 overflow-x-auto bg-black/20 p-2 rounded">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* System Tab */}
          {activeTab === "system" && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">CONFIGURATION SYSTÈME</h2>
                
                <div className="space-y-4 mb-6">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-4 bg-[#11152b] rounded-xl border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <div>
                      <p className="font-medium text-white">Mode Maintenance</p>
                      <p className="text-xs text-white/40">Désactive l'accès à la plateforme</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={(e) => setMaintenanceMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-4 bg-[#11152b] rounded-xl border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <div>
                      <p className="font-medium text-white">Inscriptions</p>
                      <p className="text-xs text-white/40">Autoriser les nouveaux utilisateurs</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={registrationEnabled}
                        onChange={(e) => setRegistrationEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-4 bg-[#11152b] rounded-xl border border-purple-500/20 hover:border-purple-500 transition-all"
                  >
                    <div>
                      <p className="font-medium text-white">Tournois</p>
                      <p className="text-xs text-white/40">Autoriser la création de tournois</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tournamentsEnabled}
                        onChange={(e) => setTournamentsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </motion.div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={updateSystemConfig}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-white hover:opacity-90 transition-all hover:shadow-2xl hover:shadow-purple-500/50"
                >
                  SAUVEGARDER LA CONFIGURATION
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {/* Role Modal */}
          {showRoleModal && selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowRoleModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  background: "#0a0a1a",
                  border: "1px solid rgba(124,58,237,0.3)",
                  borderRadius: 20,
                  padding: 28,
                  width: "100%",
                  maxWidth: 480,
                  boxShadow: "0 20px 60px rgba(124,58,237,0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  }}>👑</div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "Orbitron, sans-serif", letterSpacing: 1 }}>
                      CHANGER LE RÔLE
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
                      {selectedUser.username || selectedUser.display_name || selectedUser.username || selectedUser.email}
                    </p>
                  </div>
                </div>

                {/* Current role */}
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 18,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>RÔLE ACTUEL</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", letterSpacing: 1 }}>
                    {selectedUser.role?.toUpperCase()}
                  </span>
                </div>

                {/* Role cards grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {[
                    { value: "user",        icon: "👤", label: "UTILISATEUR",  color: "#6b7280", desc: "Joueur normal" },
                    { value: "founder",     icon: "⚡", label: "FONDATEUR",    color: "#f59e0b", desc: "Crée tournois" },
                    { value: "designer",    icon: "🎨", label: "DESIGNER",     color: "#ec4899", desc: "Gère le store" },
                    { value: "admin",       icon: "🛡️", label: "ADMIN",        color: "#06b6d4", desc: "Modération" },
                    { value: "super_admin", icon: "👑", label: "SUPER ADMIN",  color: "#f59e0b", desc: "Accès complet" },
                    { value: "banned",      icon: "🚫", label: "BANNI",        color: "#ef4444", desc: "Accès bloqué" },
                  ].map(r => (
                    <div
                      key={r.value}
                      onClick={() => setNewRole(r.value)}
                      style={{
                        padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${newRole === r.value ? r.color : "rgba(255,255,255,0.07)"}`,
                        background: newRole === r.value ? `${r.color}18` : "rgba(255,255,255,0.02)",
                        transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{r.icon}</span>
                      <div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: 1,
                          color: newRole === r.value ? r.color : "rgba(255,255,255,0.6)",
                          fontFamily: "Orbitron, sans-serif",
                        }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{r.desc}</div>
                      </div>
                      {newRole === r.value && (
                        <div style={{ marginLeft: "auto", width: 16, height: 16, borderRadius: "50%",
                          background: r.color, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: "#000", fontWeight: 700 }}>✓</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Warning for super_admin */}
                {newRole === "super_admin" && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                    fontSize: 12, color: "#f59e0b",
                  }}>
                    ⚠️ Ce rôle donne accès à TOUTES les fonctionnalités. Accordez-le avec précaution.
                  </div>
                )}
                {newRole === "banned" && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                    fontSize: 12, color: "#ef4444",
                  }}>
                    🚫 Ce joueur sera immédiatement déconnecté et ne pourra plus accéder à la plateforme.
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer",
                      background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
                      fontFamily: "Rajdhani, sans-serif",
                    }}
                  >
                    ANNULER
                  </button>
                  <button
                    onClick={() => updateUserRole(selectedUser.id, newRole)}
                    style={{
                      flex: 2, padding: "12px", borderRadius: 10, cursor: "pointer",
                      background: newRole === "banned"
                        ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                        : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                      border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                      letterSpacing: 1, fontFamily: "Orbitron, sans-serif",
                      boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
                    }}
                  >
                    ✓ CONFIRMER → {newRole.toUpperCase().replace("_", " ")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Ban Modal */}
          {showBanModal && selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowBanModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a0a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-white mb-4">Bannir l'utilisateur</h2>
                <p className="text-white/60 mb-4">
                  Utilisateur: <span className="text-white">{selectedUser.display_name || selectedUser.username || selectedUser.email}</span>
                </p>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-[#11152b] border border-red-500/20 rounded-xl text-white mb-4 focus:border-red-500 transition-all"
                >
                  <option value="24h">24 heures</option>
                  <option value="7d">7 jours</option>
                  <option value="30d">30 jours</option>
                  <option value="permanent">Permanent</option>
                </select>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBanModal(false)}
                    className="flex-1 px-4 py-2 border border-red-500/20 rounded-xl text-white hover:bg-[#11152b] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => banUser(selectedUser.id, banDuration)}
                    className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all hover:shadow-lg hover:shadow-red-500/30"
                  >
                    Bannir
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Wallet Modal — Add / Remove Coins */}
          {showWalletModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => { setShowWalletModal(false); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setSelectedUser(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  background: "#0a0a1a",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 20,
                  padding: 28,
                  width: "100%",
                  maxWidth: 500,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 60px rgba(245,158,11,0.2)",
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>💰</div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "Orbitron, sans-serif", letterSpacing: 1 }}>
                      GESTION DES PIÈCES
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
                      {selectedUser ? (selectedUser.display_name || selectedUser.username || selectedUser.email) : "Sélectionne un joueur"}
                    </p>
                  </div>
                </div>

                {/* ── STEP 1: User Search ── */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                    🔍 RECHERCHER UN JOUEUR
                  </label>
                  <input
                    placeholder="Nom, username ou email..."
                    value={walletSearch}
                    onChange={e => setWalletSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, color: "#fff", fontSize: 13,
                      fontFamily: "Rajdhani, sans-serif", outline: "none",
                    }}
                  />
                  {/* Results list */}
                  {walletSearch.length > 0 && (
                    <div style={{
                      marginTop: 6, borderRadius: 8, overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)", maxHeight: 200, overflowY: "auto",
                    }}>
                      {users
                        .filter(u =>
                          u.display_name?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                          u.username?.toLowerCase().includes(walletSearch.toLowerCase())
                        )
                        .slice(0, 8)
                        .map(u => (
                          <div
                            key={u.id}
                            onClick={() => { setSelectedUser(u); setWalletSearch(""); }}
                            style={{
                              padding: "10px 14px", cursor: "pointer", display: "flex",
                              alignItems: "center", gap: 10,
                              background: selectedUser?.id === u.id ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.02)",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              transition: "background 0.15s",
                            }}
                            onMouseOver={e => e.currentTarget.style.background = "rgba(245,158,11,0.1)"}
                            onMouseOut={e => e.currentTarget.style.background = selectedUser?.id === u.id ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.02)"}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, fontWeight: 700, color: "#fff",
                            }}>
                              {(u.display_name || u.email || "?")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                                {u.display_name || u.username || "Inconnu"}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                                {u.email} · 💰 {(u.coins || 0).toLocaleString()}
                              </div>
                            </div>
                            <span style={{
                              marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                              padding: "2px 8px", borderRadius: 99,
                              background: u.role === "super_admin" ? "rgba(245,158,11,0.15)" : "rgba(124,58,237,0.15)",
                              color: u.role === "super_admin" ? "#f59e0b" : "#a855f7",
                            }}>
                              {u.role?.toUpperCase()}
                            </span>
                          </div>
                        ))
                      }
                      {users.filter(u =>
                        u.display_name?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(walletSearch.toLowerCase()) ||
                        u.username?.toLowerCase().includes(walletSearch.toLowerCase())
                      ).length === 0 && (
                        <div style={{ padding: "12px 14px", color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center" }}>
                          Aucun joueur trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected user badge */}
                {selectedUser && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                    background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: "#fff",
                      }}>
                        {(selectedUser.display_name || selectedUser.email || "?")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                          {selectedUser.display_name || selectedUser.username || "Inconnu"}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{selectedUser.email}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>SOLDE ACTUEL</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b", fontFamily: "Orbitron, sans-serif" }}>
                        💰 {(selectedUser.coins || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add / Remove toggle */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {[
                    { label: "➕ AJOUTER", isAdd: true,  color: "#10b981" },
                    { label: "➖ RETIRER", isAdd: false, color: "#ef4444" },
                  ].map(opt => {
                    const currentIsAdd = (parseInt(grantAmount) || 0) >= 0;
                    const active = opt.isAdd ? currentIsAdd : !currentIsAdd;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => {
                          const abs = Math.abs(parseInt(grantAmount) || 0);
                          setGrantAmount(opt.isAdd ? abs || "" : abs ? -abs : "");
                        }}
                        style={{
                          padding: "11px", borderRadius: 10, cursor: "pointer",
                          background: active ? opt.color + "25" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${active ? opt.color + "60" : "rgba(255,255,255,0.08)"}`,
                          color: active ? opt.color : "rgba(255,255,255,0.4)",
                          fontSize: 12, fontWeight: 700, letterSpacing: 1,
                          fontFamily: "Rajdhani, sans-serif", transition: "all 0.2s",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Amount input */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                    MONTANT *
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 500"
                    value={grantAmount === "" ? "" : Math.abs(parseInt(grantAmount) || 0) || ""}
                    onChange={e => {
                      const abs = Math.abs(parseInt(e.target.value) || 0);
                      const isNeg = (parseInt(grantAmount) || 0) < 0;
                      setGrantAmount(abs ? (isNeg ? -abs : abs) : "");
                    }}
                    style={{
                      width: "100%", padding: "11px 14px", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#fff", fontSize: 16,
                      fontFamily: "Orbitron, sans-serif", outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {[100, 500, 1000, 2000, 5000].map(n => (
                      <button key={n}
                        onClick={() => {
                          const isNeg = (parseInt(grantAmount) || 0) < 0;
                          setGrantAmount(isNeg ? -n : n);
                        }}
                        style={{
                          padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11,
                          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
                          color: "rgba(255,255,255,0.5)", fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                    RAISON * (obligatoire)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Récompense tournoi, Bug fix, Pénalité..."
                    value={grantReason}
                    onChange={e => setGrantReason(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#fff", fontSize: 14,
                      fontFamily: "Rajdhani, sans-serif", outline: "none",
                    }}
                  />
                </div>

                {/* Preview new balance */}
                {selectedUser && grantAmount !== "" && parseInt(grantAmount) !== 0 && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    display: "flex", justifyContent: "space-between",
                  }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>SOLDE APRÈS</span>
                    <span style={{
                      fontSize: 14, fontWeight: 700, fontFamily: "Orbitron, sans-serif",
                      color: ((selectedUser.coins || 0) + (parseInt(grantAmount) || 0)) < 0 ? "#ef4444" : "#10b981",
                    }}>
                      💰 {Math.max(0, (selectedUser.coins || 0) + (parseInt(grantAmount) || 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => { setShowWalletModal(false); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setSelectedUser(null); }}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer",
                      background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
                      fontFamily: "Rajdhani, sans-serif",
                    }}
                  >
                    ANNULER
                  </button>
                  <button
                    onClick={grantCoins}
                    disabled={!selectedUser || !grantAmount || !grantReason.trim()}
                    style={{
                      flex: 2, padding: "12px", borderRadius: 10,
                      cursor: (!selectedUser || !grantAmount || !grantReason.trim()) ? "not-allowed" : "pointer",
                      border: "none",
                      background: (!selectedUser || !grantAmount || !grantReason.trim())
                        ? "rgba(255,255,255,0.05)"
                        : (parseInt(grantAmount) || 0) < 0
                          ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                          : "linear-gradient(135deg, #10b981, #059669)",
                      color: (!selectedUser || !grantAmount || !grantReason.trim()) ? "rgba(255,255,255,0.2)" : "#fff",
                      fontSize: 13, fontWeight: 700, letterSpacing: 1,
                      fontFamily: "Orbitron, sans-serif", transition: "all 0.2s",
                    }}
                  >
                    {!selectedUser ? "👤 CHOISIR UN JOUEUR" :
                     !grantAmount ? "ENTRER UN MONTANT" :
                     (parseInt(grantAmount) || 0) < 0
                       ? `🔴 RETIRER ${Math.abs(parseInt(grantAmount))} PIÈCES`
                       : `✅ AJOUTER ${parseInt(grantAmount)} PIÈCES`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Tournament Modal */}
          {showTournamentModal && selectedTournament && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowTournamentModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a0a1a] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-purple-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-white mb-4">Modifier le tournoi</h2>
                <p className="text-white/60 mb-4">
                  Tournoi: <span className="text-white">{selectedTournament.name}</span>
                </p>
                <select
                  value={tournamentStatus}
                  onChange={(e) => setTournamentStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-[#11152b] border border-purple-500/20 rounded-xl text-white mb-4 focus:border-purple-500 transition-all"
                >
                  <option value="open">Ouvert</option>
                  <option value="ongoing">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTournamentModal(false)}
                    className="flex-1 px-4 py-2 border border-purple-500/20 rounded-xl text-white hover:bg-[#11152b] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => updateTournamentStatus(selectedTournament.id, tournamentStatus)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white font-bold hover:opacity-90 transition-all hover:shadow-lg hover:shadow-purple-500/50"
                  >
                    Mettre à jour
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && tournamentToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a0a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h2>
                <p className="text-white/60 mb-6">
                  Êtes-vous sûr de vouloir supprimer le tournoi <span className="text-white font-bold">"{tournamentToDelete.name}"</span> ?
                  <br /><br />
                  <span className="text-red-400 text-sm">Cette action est irréversible !</span>
                </p>
                
                {deleteLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="loading-spinner"></div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setTournamentToDelete(null);
                      }}
                      className="flex-1 px-4 py-3 border border-red-500/20 rounded-xl text-white hover:bg-[#11152b] transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        setDeleteLoading(true);
                        await deleteTournament(tournamentToDelete.id);
                        setDeleteLoading(false);
                        setShowDeleteConfirm(false);
                        setTournamentToDelete(null);
                      }}
                      className="flex-1 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all hover:shadow-lg hover:shadow-red-500/30"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}