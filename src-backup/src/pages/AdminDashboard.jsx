// src/pages/admin/Dashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { can, ACTIONS } from '../../utils/permissions';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    openTickets: 0,
    pendingReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
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

    if (error || !data || !can(data, ACTIONS.VIEW_USERS)) { // Admin لديه صلاحية VIEW_USERS
      navigate('/dashboard');
    } else {
      setProfile(data);
      await fetchStats();
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    // طلبات التحقق المعلقة
    const { count: pendingApprovals } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    // تذاكر الدعم المفتوحة
    const { count: openTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'pending']);

    // البلاغات المعلقة
    const { count: pendingReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setStats({
      pendingApprovals: pendingApprovals || 0,
      openTickets: openTickets || 0,
      pendingReports: pendingReports || 0,
    });
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
            🛡️ PANEL ADMINISTRATEUR
          </h1>
          <p className="text-white/40">
            Bienvenue, {profile?.full_name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="APPROUVALS"
            value={stats.pendingApprovals}
            icon="🆔"
            link="/admin/approvals"
            color="yellow"
          />
          <StatCard
            title="TICKETS"
            value={stats.openTickets}
            icon="🎟️"
            link="/admin/support"
            color="blue"
          />
          <StatCard
            title="RAPPORTS"
            value={stats.pendingReports}
            icon="🚨"
            link="/admin/reports"
            color="red"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <QuickAction to="/admin/approvals" icon="🆔" title="Vérifier Profils" desc="Approuver les nouvelles inscriptions" />
          <QuickAction to="/admin/support" icon="🎟️" title="Support Tickets" desc="Répondre aux utilisateurs" />
          <QuickAction to="/admin/reports" icon="🚨" title="Gérer Rapports" desc="Traiter les signalements" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, link, color }) {
  const colorClasses = {
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
  };
  return (
    <Link to={link} className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-6 hover:scale-[1.02] transition">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <span className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</span>
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
    </Link>
  );
}

function QuickAction({ to, icon, title, desc }) {
  return (
    <Link to={to} className="bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl p-6 hover:border-[#7c3aed] transition group">
      <span className="text-3xl mb-3 block group-hover:scale-110 transition">{icon}</span>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40">{desc}</p>
    </Link>
  );
}