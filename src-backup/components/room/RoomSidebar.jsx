import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function Sidebar({ profile }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Menu principal - فقط العناصر المطلوبة
  const menuItems = [
    { path: "/dashboard", icon: "🏠", label: "TABLEAU DE BORD" },
    { path: "/tournaments", icon: "🏆", label: "TOURNOIS" },
    { path: "/leaderboard", icon: "📊", label: "CLASSEMENT" },
    { path: "/profile", icon: "👤", label: "MON PROFIL" },
    { path: "/support", icon: "🎟️", label: "SOUTIEN" },
  ];

  return (
    <aside className="w-64 bg-[#0a0a1a] border-r border-[rgba(124,58,237,0.2)] min-h-screen p-6 flex flex-col">
      {/* Logo */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-[#7c3aed]">CIPHER</span>POOL
        </h1>
        <p className="text-sm text-white/40 mt-1 uppercase tracking-wider">
          {profile?.role === "super_admin" ? "ADMINISTRATEUR" : 
           profile?.role === "admin" ? "ADMIN" :
           profile?.role === "founder" ? "FONDATEUR" : "JOUEUR"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white shadow-lg shadow-[#7c3aed]/30"
                  : "text-white/60 hover:bg-[rgba(124,58,237,0.15)] hover:text-white"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium tracking-wide">{item.label}</span>
          </NavLink>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-[rgba(239,68,68,0.15)] hover:text-red-400 transition-all duration-300 mt-8"
        >
          <span className="text-lg">🚪</span>
          <span className="text-sm font-medium tracking-wide">DÉCONNEXION</span>
        </button>
      </nav>

      {/* Version Footer */}
      <div className="mt-auto pt-6 text-center">
        <p className="text-xs text-white/20 tracking-wider">v2.0.0</p>
      </div>
    </aside>
  );
}