// src/pages/superadmin/Dashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد التبويبات
import UsersTab from './Users';
import AdminsTab from './Admins';
import TournamentsTab from './Tournaments';
import ReportsTab from './Reports';
import EconomyTab from './Economy';
import LogsTab from './Logs';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading: authLoading, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // تحديد التبويب النشط
  const activeTab = location.pathname.split('/').pop() || 'dashboard';

  useEffect(() => {
    if (!authLoading) {
      if (!isSuperAdmin) {
        navigate('/dashboard');
      } else {
        fetchStats();
      }
    }
  }, [authLoading, isSuperAdmin]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const [
        { count: totalUsers },
        { count: onlineUsers },
        { count: totalTournaments },
        { count: openTournaments },
        { count: pendingReports },
        { count: pendingApprovals },
        { data: wallets }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('wallets').select('balance')
      ]);

      const totalCoins = wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        totalTournaments: totalTournaments || 0,
        openTournaments: openTournaments || 0,
        pendingReports: pendingReports || 0,
        pendingApprovals: pendingApprovals || 0,
        totalCoins
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { path: '/super-admin', name: '📊 DASHBOARD', key: 'dashboard' },
    { path: '/super-admin/users', name: '👥 USERS', key: 'users' },
    { path: '/super-admin/admins', name: '🛡️ ADMINS', key: 'admins' },
    { path: '/super-admin/tournaments', name: '🏆 TOURNAMENTS', key: 'tournaments' },
    { path: '/super-admin/reports', name: '🚨 REPORTS', key: 'reports' },
    { path: '/super-admin/economy', name: '💰 ECONOMY', key: 'economy' },
    { path: '/super-admin/logs', name: '📜 LOGS', key: 'logs' },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030014] via-[#0a0a1a] to-[#030014] text-white">
      {/* خلفية متحركة */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header مع ترحيب */}
        <div className="glass-panel p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
                👑 SUPER ADMIN PANEL
              </h1>
              <p className="text-white/60">
                Bienvenue, <span className="text-[#7c3aed] font-bold">{profile?.full_name}</span> • Contrôle total de la plateforme
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/admin"
                className="px-4 py-2 bg-[#11152b] border border-[rgba(124,58,237,0.3)] rounded-xl text-sm hover:border-[#7c3aed] transition"
              >
                PANEL ADMIN
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition"
              >
                DÉCONNEXION
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards (فقط للـ Dashboard) */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8"
          >
            <StatCard label="Utilisateurs" value={stats.totalUsers} icon="👥" color="text-white" />
            <StatCard label="En Ligne" value={stats.onlineUsers} icon="🟢" color="text-green-400" />
            <StatCard label="Tournois" value={stats.totalTournaments} icon="🏆" color="text-white" />
            <StatCard label="Ouverts" value={stats.openTournaments} icon="✅" color="text-green-400" />
            <StatCard label="Rapports" value={stats.pendingReports} icon="🚨" color="text-red-400" />
            <StatCard label="En Attente" value={stats.pendingApprovals} icon="⏳" color="text-yellow-400" />
            <StatCard label="Coins Total" value={stats.totalCoins.toLocaleString()} icon="💰" color="text-yellow-400" />
          </motion.div>
        )}

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-6 border-b border-[rgba(124,58,237,0.2)] pb-4 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.path}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white shadow-lg'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <Routes>
            <Route index element={<DashboardTab stats={stats} profile={profile} />} />
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

// ====== المكونات الفرعية ======

function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass-panel p-4 hover:scale-105 transition">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-xs text-white/40">{label}</p>
    </div>
  );
}

function DashboardTab({ stats, profile }) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid md:grid-cols-2 gap-8"
    >
      {/* Quick Actions */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
          ACTIONS RAPIDES
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <QuickAction to="/super-admin/users" icon="👥" label="Gérer Users" />
          <QuickAction to="/super-admin/admins" icon="🛡️" label="Gérer Admins" />
          <QuickAction to="/super-admin/economy" icon="💰" label="Économie" />
          <QuickAction to="/super-admin/reports" icon="🚨" label="Rapports" />
          <QuickAction to="/super-admin/grant" icon="🎁" label="Ajouter Coins" />
          <QuickAction to="/create-tournament" icon="🏆" label="Créer Tournoi" />
        </div>
      </div>

      {/* System Status */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#7c3aed] rounded-full"></span>
          ÉTAT DU SYSTÈME
        </h2>
        <div className="space-y-4">
          <StatusItem label="Base de données" status="healthy" />
          <StatusItem label="API" status="healthy" />
          <StatusItem label="Stockage" status="healthy" />
          <StatusItem label="Realtime" status="healthy" />
        </div>
      </div>
    </motion.div>
  );
}

function QuickAction({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="bg-[#11152b] rounded-xl p-4 text-center hover:border-[#7c3aed] transition border border-transparent group"
    >
      <span className="text-3xl mb-2 block group-hover:scale-110 transition">{icon}</span>
      <p className="text-sm font-medium text-white/80 group-hover:text-white">{label}</p>
    </Link>
  );
}

function StatusItem({ label, status }) {
  const colors = {
    healthy: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };
  return (
    <div className="flex items-center justify-between p-3 bg-[#11152b] rounded-lg">
      <span className="text-white/60">{label}</span>
      <span className={`${colors[status]} text-sm font-medium flex items-center gap-1`}>
        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
        {status === 'healthy' ? 'Opérationnel' : status}
      </span>
    </div>
  );
}