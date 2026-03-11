// src/pages/superadmin/Dashboard.jsx (ملف جديد)

import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { can, ACTIONS } from '../../utils/permissions';

// استيراد التبويبات (سنقوم بإنشائها لاحقًا)
import UsersTab from './Users';
import AdminsTab from './Admins';
import TournamentsTab from './Tournaments';
import ReportsTab from './Reports';
import EconomyTab from './Economy';
import LogsTab from './Logs';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  // تحديد التبويب النشط من الـ URL
  const activeTab = location.pathname.split('/').pop() || 'dashboard';

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        navigate('/login');
        return;
      }

      // التحقق من الصلاحية باستخدام can
      if (!can(data, ACTIONS.VIEW_ANALYTICS)) {
        navigate('/dashboard');
        return;
      }

      setProfile(data);
      await fetchStats();
    } catch (err) {
      console.error('Error in SuperAdmin check:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // جلب الإحصائيات من قاعدة البيانات
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: onlineUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', fiveMinutesAgo);

    const { count: totalTournaments } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true });

    const { count: openTournaments } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const { count: pendingReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setStats({
      totalUsers: totalUsers || 0,
      onlineUsers: onlineUsers || 0,
      totalTournaments: totalTournaments || 0,
      openTournaments: openTournaments || 0,
      pendingReports: pendingReports || 0,
    });
  };

  // قائمة التبويبات
  const tabs = [
    { path: '/super-admin', name: '📊 DASHBOARD', key: 'dashboard' },
    { path: '/super-admin/users', name: '👥 USERS', key: 'users' },
    { path: '/super-admin/admins', name: '🛡️ ADMINS', key: 'admins' },
    { path: '/super-admin/tournaments', name: '🏆 TOURNAMENTS', key: 'tournaments' },
    { path: '/super-admin/reports', name: '🚨 REPORTS', key: 'reports' },
    { path: '/super-admin/economy', name: '💰 ECONOMY', key: 'economy' },
    { path: '/super-admin/logs', name: '📜 LOGS', key: 'logs' },
  ];

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
              👑 SUPER ADMIN PANEL
            </h1>
            <p className="text-white/40">
              Bienvenue, {profile?.full_name} - Contrôle total de la plateforme
            </p>
          </div>
        </div>

        {/* Stats Cards (تظهر فقط في تبويب Dashboard) */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Utilisateurs" value={stats.totalUsers} color="text-white" />
            <StatCard label="En Ligne" value={stats.onlineUsers} color="text-green-400" />
            <StatCard label="Tournois" value={stats.totalTournaments} color="text-white" />
            <StatCard label="Ouverts" value={stats.openTournaments} color="text-green-400" />
            <StatCard label="Rapports" value={stats.pendingReports} color="text-red-400" />
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex gap-4 mb-6 border-b border-[rgba(124,58,237,0.2)] pb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.path}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'text-[#7c3aed] border-b-2 border-[#7c3aed]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </div>

        {/* Tab Content - Routing داخلي */}
        <AnimatePresence mode="wait">
          <Routes>
            <Route index element={<DashboardTab stats={stats} />} />
            <Route path="users" element={<UsersTab />} />
            <Route path="admins" element={<AdminsTab />} />
            <Route path="tournaments" element={<TournamentsTab />} />
            <Route path="reports" element={<ReportsTab />} />
            <Route path="economy" element={<EconomyTab />} />
            <Route path="logs" element={<LogsTab />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

// مكون Dashboard الرئيسي
function DashboardTab({ stats }) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid md:grid-cols-2 gap-8"
    >
      {/* Quick Actions */}
      <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
          ACTIONS RAPIDES
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <QuickActionLink to="/super-admin/grant" icon="💰" label="Ajouter Coins" />
          <QuickActionLink to="/super-admin/users" icon="👥" label="Gérer Users" />
          <QuickActionLink to="/super-admin/reports" icon="🚨" label="Rapports" />
          <QuickActionLink to="/admin" icon="🛡️" label="Panel Admin" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
          STATISTIQUES
        </h2>
        <div className="space-y-3">
          <p>👥 Total Utilisateurs: <span className="text-[#7c3aed] font-bold">{stats.totalUsers}</span></p>
          <p>🟢 En Ligne: <span className="text-green-400 font-bold">{stats.onlineUsers}</span></p>
          <p>🏆 Tournois Total: <span className="text-white font-bold">{stats.totalTournaments}</span></p>
          <p>✅ Tournois Ouverts: <span className="text-green-400 font-bold">{stats.openTournaments}</span></p>
          <p>🚨 Rapports en Attente: <span className="text-red-400 font-bold">{stats.pendingReports}</span></p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function QuickActionLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="bg-[#11152b] rounded-xl p-4 text-center hover:border-[#7c3aed] transition border border-transparent"
    >
      <span className="text-2xl mb-2 block">{icon}</span>
      <p className="text-sm font-medium">{label}</p>
    </Link>
  );
}