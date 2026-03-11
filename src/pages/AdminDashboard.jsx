import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { usePermissions } from "../utils/permissions";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalTickets: 0,
    urgentTickets: 0,
    totalTournaments: 0,
    openTournaments: 0,
    totalReports: 0
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isSuperAdmin } = usePermissions(profile);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
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

    if (error || !data || (data.role !== "admin" && data.role !== "super_admin")) {
      navigate("/dashboard");
    } else {
      setProfile(data);
      fetchStats();
      fetchRecentData();
    }
  };

  const fetchStats = async () => {
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: pendingUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending");

    const { count: totalTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true });

    const { count: urgentTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .in("priority", ["urgent", "critique"])
      .eq("status", "open");

    const { count: totalTournaments } = await supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true });

    const { count: openTournaments } = await supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    const { count: totalReports } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    setStats({
      totalUsers: totalUsers || 0,
      pendingUsers: pendingUsers || 0,
      totalTickets: totalTickets || 0,
      urgentTickets: urgentTickets || 0,
      totalTournaments: totalTournaments || 0,
      openTournaments: openTournaments || 0,
      totalReports: totalReports || 0
    });
  };

  const fetchRecentData = async () => {
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey (
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentTickets(tickets || []);

    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name, verification_status, created_at, role")
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentUsers(users || []);

    const { data: reports } = await supabase
      .from("reports")
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey (full_name),
        reported:profiles!reports_reported_id_fkey (full_name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentReports(reports || []);
    setLoading(false);
  };

  const verifyUser = async (userId) => {
    try {
      const { error } = await supabase.rpc('verify_user', {
        target_user: userId,
        verifier_id: profile.id
      });

      if (error) throw error;

      await supabase
        .from("admin_logs")
        .insert([{
          user_id: profile.id,
          action: "verify_user",
          details: { target_user: userId }
        }]);

      fetchRecentData();
      fetchStats();
    } catch (err) {
      console.error("Error verifying user:", err);
      alert("Erreur lors de la vérification");
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'text-orange-400';
      case 'critique': return 'text-red-400';
      default: return 'text-white/60';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white cyber-grid p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
            👑 PANEL ADMINISTRATEUR
          </h1>
          <p className="text-white/40">
            Bienvenue, {profile?.full_name} - {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6"
          >
            <p className="text-sm text-white/40 mb-2">UTILISATEURS</p>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6"
          >
            <p className="text-sm text-white/40 mb-2">EN ATTENTE</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.pendingUsers}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6"
          >
            <p className="text-sm text-white/40 mb-2">TICKETS</p>
            <p className="text-3xl font-bold text-white">{stats.totalTickets}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6"
          >
            <p className="text-sm text-white/40 mb-2">URGENTS</p>
            <p className="text-3xl font-bold text-orange-400">{stats.urgentTickets}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6"
          >
            <p className="text-sm text-white/40 mb-2">TOURNOIS</p>
            <p className="text-3xl font-bold text-white">{stats.totalTournaments}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6"
          >
            <p className="text-sm text-white/40 mb-2">OUVERTS</p>
            <p className="text-3xl font-bold text-green-400">{stats.openTournaments}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6"
          >
            <p className="text-sm text-white/40 mb-2">RAPPORTS</p>
            <p className="text-3xl font-bold text-red-400">{stats.totalReports}</p>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link
            to="/admin/support"
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6 hover:border-[#7c3aed] transition group"
          >
            <span className="text-3xl mb-3 block">🎟️</span>
            <h3 className="font-bold text-white mb-2">GÉRER LES TICKETS</h3>
            <p className="text-sm text-white/40">
              {stats.urgentTickets} tickets urgents
            </p>
          </Link>
          {isSuperAdmin && (
            <Link
              to="/super-admin/grant"
              className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6 hover:border-[#7c3aed] transition group"
            >
              <span className="text-3xl mb-3 block">💰</span>
              <h3 className="font-bold text-white mb-2">GESTION COINS</h3>
              <p className="text-sm text-white/40">
                Accorder des pièces
              </p>
            </Link>
          )}
          <Link
            to="/tournaments"
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6 hover:border-[#7c3aed] transition group"
          >
            <span className="text-3xl mb-3 block">🏆</span>
            <h3 className="font-bold text-white mb-2">TOURNOIS</h3>
            <p className="text-sm text-white/40">
              {stats.openTournaments} tournois ouverts
            </p>
          </Link>
          <Link
            to="/super-admin"
            className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6 hover:border-[#7c3aed] transition group"
          >
            <span className="text-3xl mb-3 block">⚡</span>
            <h3 className="font-bold text-white mb-2">SUPER ADMIN</h3>
            <p className="text-sm text-white/40">
              {isSuperAdmin ? 'Accès total' : 'Réservé Super Admin'}
            </p>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Pending Verifications */}
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
              VÉRIFICATIONS EN ATTENTE
            </h2>
            {recentUsers.filter(u => u.verification_status === "pending").length === 0 ? (
              <p className="text-white/40">Aucune vérification en attente</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.filter(u => u.verification_status === "pending").map(user => (
                  <div key={user.id} className="bg-[#11152b] rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">{user.full_name}</p>
                        <p className="text-xs text-white/40">
                          Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <button
                        onClick={() => verifyUser(user.id)}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30 transition"
                      >
                        Vérifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Reports */}
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
              RAPPORTS RÉCENTS
            </h2>
            {recentReports.length === 0 ? (
              <p className="text-white/40">Aucun rapport récent</p>
            ) : (
              <div className="space-y-3">
                {recentReports.map(report => (
                  <div key={report.id} className="bg-[#11152b] rounded-xl p-4">
                    <p className="text-sm text-white">
                      {report.reporter?.full_name} a signalé {report.reported?.full_name}
                    </p>
                    <p className="text-xs text-white/40 mt-1">{report.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
            TICKETS RÉCENTS
          </h2>
          {recentTickets.length === 0 ? (
            <p className="text-white/40">Aucun ticket récent</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map(ticket => (
                <Link
                  key={ticket.id}
                  to="/admin/support"
                  className="block bg-[#11152b] rounded-xl p-4 hover:scale-[1.02] transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-white">{ticket.subject}</p>
                    <span className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority === 'urgent' ? 'URGENT' : 
                       ticket.priority === 'critique' ? 'CRITIQUE' : 'NORMAL'}
                    </span>
                  </div>
                  <p className="text-sm text-white/60">
                    {ticket.user?.full_name} • {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}