import { Outlet, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function MainLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    getProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchUnreadCount();
      fetchUrgentCount();
      
      const channel = supabase
        .channel('main_layout_channel')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'admin_messages',
            filter: `or(user_id.eq.${profile.id},is_global.eq.true)`
          },
          () => {
            fetchUnreadCount();
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'support_tickets'
          },
          () => {
            if (profile.role === 'admin' || profile.role === 'super_admin') {
              fetchUrgentCount();
            }
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [profile]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from("admin_messages")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${profile.id},is_global.eq.true`)
      .eq("read", false);

    setUnreadCount(count || 0);
  };

  const fetchUrgentCount = async () => {
    const { count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .in("priority", ["urgent", "critique"])
      .eq("status", "open");

    setUrgentCount(count || 0);
  };

  const getProfile = async () => {
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

    if (error) {
      console.error("Error fetching profile:", error);
      navigate("/login");
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  return (
    <div className="min-h-screen bg-[#030014] text-white cyber-grid flex">
      
      {/* Sidebar - فقط 3 عناصر رئيسية */}
      <aside className="w-64 bg-[#0a0a1a] border-r border-[rgba(124,58,237,0.2)] min-h-screen p-6 flex flex-col">
        
        {/* Logo */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-white">
            <span className="text-[#7c3aed]">CIPHER</span>POOL
          </h1>
          <p className="text-sm text-white/40 mt-1 uppercase tracking-wider">
            {profile?.role === "super_admin" ? "SUPER ADMIN" : 
             profile?.role === "admin" ? "ADMIN" :
             profile?.role === "founder" ? "FONDATEUR" : "JOUEUR"}
          </p>
        </div>

        {/* Navigation - فقط 3 عناصر */}
        <nav className="flex-1 space-y-2">
          {/* Dashboard */}
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-[rgba(124,58,237,0.15)] hover:text-white transition-all duration-300"
          >
            <span className="text-lg">🏠</span>
            <span className="text-sm font-medium tracking-wide">TABLEAU DE BORD</span>
          </Link>

          {/* Classement */}
          <Link
            to="/leaderboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-[rgba(124,58,237,0.15)] hover:text-white transition-all duration-300"
          >
            <span className="text-lg">📊</span>
            <span className="text-sm font-medium tracking-wide">CLASSEMENT</span>
          </Link>

          {/* Support avec badges */}
          <Link
            to="/support"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-[rgba(124,58,237,0.15)] hover:text-white transition-all duration-300 relative"
          >
            <span className="text-lg">🎟️</span>
            <span className="text-sm font-medium tracking-wide">SOUTIEN</span>
            {unreadCount > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
            {isAdmin && urgentCount > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {urgentCount}
              </span>
            )}
          </Link>
        </nav>

        {/* User Info + Logout */}
        <div className="mt-auto pt-6 border-t border-[rgba(124,58,237,0.2)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-sm font-bold">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <div>
                <p className="text-xs text-white/60">{profile?.full_name?.split(' ')[0]}</p>
                <p className="text-[10px] text-white/30">{profile?.coins || 0} pièces</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-white/40 hover:text-red-400 transition"
              title="Déconnexion"
            >
              <span className="text-lg">🚪</span>
            </button>
          </div>

          {/* Admin Link - يظهر فقط للأدمن */}
          {isAdmin && (
            <Link
              to="/admin"
              className="block text-center px-4 py-2 bg-[#11152b] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs text-white/60 hover:text-white transition"
            >
              PANEL ADMIN
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ profile, setProfile }} />
      </main>
    </div>
  );
}