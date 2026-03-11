// src/pages/founder/Dashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { can, ACTIONS } from '../../utils/permissions';

export default function FounderDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [myTournaments, setMyTournaments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    ongoing: 0,
    pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFounder();
  }, []);

  const checkFounder = async () => {
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

    if (error || !data || !can(data, ACTIONS.CREATE_TOURNAMENT)) {
      navigate('/dashboard');
    } else {
      setProfile(data);
      await fetchMyTournaments(data.id);
    }
    setLoading(false);
  };

  const fetchMyTournaments = async (userId) => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyTournaments(data);

      // حساب الإحصائيات
      const open = data.filter(t => t.status === 'open').length;
      const ongoing = data.filter(t => t.status === 'ongoing').length;

      // حساب الطلبات المعلقة
      if (data.length > 0) {
        const tournamentIds = data.map(t => t.id);
        const { count } = await supabase
          .from('tournament_participants')
          .select('*', { count: 'exact', head: true })
          .in('tournament_id', tournamentIds)
          .eq('status', 'pending');

        setStats({
          total: data.length,
          open,
          ongoing,
          pendingRequests: count || 0,
        });
      }
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
              🎮 FOUNDER DASHBOARD
            </h1>
            <p className="text-white/40">
              Gérez vos tournois, {profile?.full_name}
            </p>
          </div>
          <Link
            to="/create-tournament"
            className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl font-bold text-white hover:opacity-90 transition"
          >
            + CRÉER UN TOURNOI
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Tournois" value={stats.total} color="text-white" />
          <StatCard label="Ouverts" value={stats.open} color="text-green-400" />
          <StatCard label="En Cours" value={stats.ongoing} color="text-blue-400" />
          <StatCard label="Demandes" value={stats.pendingRequests} color="text-yellow-400" />
        </div>

        {/* My Tournaments List */}
        <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">MES TOURNOIS</h2>
          {myTournaments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/40 mb-4">Vous n'avez pas encore créé de tournoi.</p>
              <Link to="/create-tournament" className="text-[#7c3aed] hover:underline">
                Créer votre premier tournoi →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-xl p-4">
      <p className="text-sm text-white/40 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TournamentCard({ tournament }) {
  return (
    <div className="bg-[#11152b] rounded-xl p-4 flex items-center justify-between hover:scale-[1.01] transition">
      <div>
        <h3 className="font-medium text-white">{tournament.name}</h3>
        <p className="text-xs text-white/40">
          {tournament.mode} • {tournament.current_players}/{tournament.max_players} joueurs
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 text-xs rounded-full ${
          tournament.status === 'open' ? 'bg-green-500/20 text-green-400' :
          tournament.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {tournament.status}
        </span>
        <Link
          to={`/founder/manage/${tournament.id}`}
          className="px-3 py-1 bg-[#7c3aed]/20 text-[#7c3aed] rounded-lg text-xs hover:bg-[#7c3aed]/30 transition"
        >
          Gérer
        </Link>
      </div>
    </div>
  );
}