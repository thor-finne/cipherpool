import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Sidebar({ profile }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    { path: "/dashboard", icon: "🏠", label: "Dashboard" },
    { path: "/tournaments", icon: "🏆", label: "Tournaments" },
    { path: "/leaderboard", icon: "📊", label: "Leaderboard" },
    { path: "/profile", icon: "👤", label: "My Profile" },
    { path: "/support", icon: "🎟️", label: "Support" },
  ];

  const founderLinks = [
    { path: "/founder", icon: "🎮", label: "Founder Panel" },
    { path: "/create-tournament", icon: "➕", label: "Create Tournament" },
  ];

  if (profile?.role === "admin" || profile?.role === "super_admin") {
    menuItems.push({ path: "/admin", icon: "🛡️", label: "Admin Panel" });
  }
  
  if (profile?.role === "super_admin") {
    menuItems.push({ path: "/super-admin", icon: "👑", label: "Super Admin" });
  }

  return (
    <aside className="w-64 bg-[#11151C] border-r border-white/5 min-h-screen p-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-purple-400">CIPHER</span>POOL
        </h1>
        <p className="text-sm text-white/40 mt-1">{profile?.role}</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-purple-600/20 text-purple-400"
                  : "text-white/60 hover:bg-white/5"
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {profile?.role === "founder" && (
          <div className="pt-4 mt-4 border-t border-white/5">
            {founderLinks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? "bg-purple-600/20 text-purple-400"
                      : "text-white/60 hover:bg-white/5"
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:bg-white/5 transition mt-8"
        >
          <span>🚪</span>
          Logout
        </button>
      </nav>
    </aside>
  );
}