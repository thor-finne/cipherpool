import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ─── ROLE CONFIG ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  super_admin: { label: "SUPER ADMIN", color: "#f59e0b", icon: "👑" },
  admin:       { label: "ADMIN",       color: "#06b6d4", icon: "🛡️" },
  founder:     { label: "FOUNDER",     color: "#a855f7", icon: "⚡" },
  user:        { label: "JOUEUR",      color: "#6b7280", icon: "🎮" },
};

// ─── NAV LINKS ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { to: "/dashboard",   label: "ACCUEIL",    icon: "⚡" },
  { to: "/tournaments", label: "TOURNOIS",   icon: "🏆" },
  { to: "/leaderboard", label: "CLASSEMENT", icon: "📊" },
  { to: "/chat",        label: "CHAT",       icon: "💬", badge: true },
  { to: "/wallet",      label: "WALLET",     icon: "💰" },
];

const ADMIN_LINKS = [
  { to: "/founder",     label: "FOUNDER",    roles: ["founder", "super_admin"],    icon: "⚡" },
  { to: "/admin",       label: "ADMIN",      roles: ["admin", "super_admin"],      icon: "🛡️" },
  { to: "/super-admin", label: "SUPER ADM",  roles: ["super_admin"],               icon: "👑" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "linear-gradient(135deg,#7c3aed,#06b6d4)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#f97316,#eab308)",
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Navbar({ profile }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [unreadChat, setUnreadChat]       = useState(0);
  const [scrolled, setScrolled]           = useState(false);
  const profileRef = useRef(null);

  const roleConfig  = ROLE_CONFIG[profile?.role] || ROLE_CONFIG.user;
  const firstName   = profile?.full_name?.split(" ")[0] || "JOUEUR";
  const isVerified  = profile?.verification_status === "approved";
  const isAdmin     = ["admin", "super_admin"].includes(profile?.role);
  const isFounder   = ["founder", "super_admin"].includes(profile?.role);

  // ── Scroll shadow ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Close dropdowns on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Close mobile menu on route change ──────────────────────────────────────
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ── Unread chat badge ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnread = async () => {
      const lastSeen = localStorage.getItem("chat_last_seen") || "2020-01-01";
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastSeen)
        .neq("sender_id", profile.id);

      setUnreadChat(count || 0);
    };

    fetchUnread();

    const sub = supabase
      .channel("chat-unread-nav")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        if (location.pathname !== "/chat") fetchUnread();
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [profile?.id, location.pathname]);

  // Reset unread when visiting chat
  useEffect(() => {
    if (location.pathname === "/chat") {
      localStorage.setItem("chat_last_seen", new Date().toISOString());
      setUnreadChat(0);
    }
  }, [location.pathname]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path ||
    (path !== "/dashboard" && location.pathname.startsWith(path));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');

        .nav-link-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 2px;
          background: linear-gradient(90deg, #7c3aed, #06b6d4);
          border-radius: 99px;
        }
        .nav-glow {
          box-shadow: 0 1px 0 0 rgba(124,58,237,0.15), 0 0 40px rgba(124,58,237,0.04);
        }
        .nav-glow-scrolled {
          box-shadow: 0 4px 30px rgba(0,0,0,0.5), 0 1px 0 0 rgba(124,58,237,0.2);
        }
        .profile-menu {
          animation: menuDown 0.15s ease forwards;
        }
        @keyframes menuDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .coin-shimmer {
          background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2.5s linear infinite;
        }
        @keyframes shimmer {
          to { background-position: 200% center; }
        }
        .mobile-slide {
          animation: slideDown 0.2s ease forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled
            ? "bg-[#030014]/95 backdrop-blur-xl nav-glow-scrolled"
            : "bg-[#030014]/80 backdrop-blur-md nav-glow"
          }`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Accent line ── */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#7c3aed]/40 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">

          {/* ── LOGO ─────────────────────────────────────────────────────────── */}
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-[#7c3aed]/30 group-hover:shadow-[#7c3aed]/50 transition-shadow">
                <span className="text-white font-black text-sm" style={{fontFamily:"Orbitron,sans-serif"}}>C</span>
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#030014] animate-pulse"></span>
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-sm tracking-[2px]" style={{fontFamily:"Orbitron,sans-serif"}}>
                CIPHER<span className="text-[#7c3aed]">POOL</span>
              </span>
            </div>
          </Link>

          {/* ── DESKTOP NAV ──────────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map(link => {
              const active = isActive(link.to);
              const showBadge = link.badge && unreadChat > 0;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all
                    ${active
                      ? "text-white nav-link-active"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    }`}
                >
                  <span className="text-sm">{link.icon}</span>
                  <span>{link.label}</span>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#7c3aed] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadChat > 99 ? "99+" : unreadChat}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Admin links separator */}
            {(isAdmin || isFounder) && (
              <>
                <div className="w-px h-5 bg-white/10 mx-1"></div>
                {ADMIN_LINKS.filter(l => l.roles.includes(profile?.role)).map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all
                      ${isActive(link.to)
                        ? "text-white nav-link-active"
                        : "text-white/40 hover:text-white/80 hover:bg-white/5"
                      }`}
                  >
                    <span className="text-sm">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* ── RIGHT SIDE ───────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Coins */}
            <Link
              to="/wallet"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg hover:border-[#f59e0b]/40 transition-colors group"
            >
              <span className="text-base">💰</span>
              <span className="text-sm font-bold coin-shimmer group-hover:opacity-100">
                {(profile?.coins || 0).toLocaleString()}
              </span>
            </Link>

            {/* Verification badge */}
            {!isVerified && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <span className="text-yellow-400 text-xs">⏳</span>
                <span className="text-yellow-400 text-xs font-semibold">EN ATTENTE</span>
              </div>
            )}

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(p => !p)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg transition-all border
                  ${profileOpen
                    ? "bg-[#7c3aed]/20 border-[#7c3aed]/40"
                    : "bg-white/5 border-white/8 hover:bg-white/8 hover:border-white/15"
                  }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: avatarColor(profile?.full_name) }}
                >
                  {firstName[0]}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-white/80 leading-none">{firstName}</p>
                  <p className="text-[9px] font-bold tracking-wider leading-none mt-0.5" style={{ color: roleConfig.color }}>
                    {roleConfig.icon} {roleConfig.label}
                  </p>
                </div>
                <svg
                  className={`w-3 h-3 text-white/30 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-[#0d0f24] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shadow-lg"
                          style={{ background: avatarColor(profile?.full_name) }}
                        >
                          {firstName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{profile?.full_name}</p>
                          <p className="text-[10px] font-bold tracking-wider" style={{ color: roleConfig.color }}>
                            {roleConfig.icon} {roleConfig.label}
                          </p>
                        </div>
                      </div>
                      {profile?.free_fire_id && (
                        <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 bg-white/3 rounded-lg">
                          <span className="text-[10px] text-white/30">FREE FIRE ID</span>
                          <span className="text-[10px] font-mono text-white/60 ml-auto">{profile.free_fire_id}</span>
                        </div>
                      )}
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <DropdownItem to="/profile"  icon="👤" label="Mon Profil" onClick={() => setProfileOpen(false)} />
                      <DropdownItem to="/wallet"   icon="💰" label="Portefeuille" badge={`${(profile?.coins||0).toLocaleString()} coins`} onClick={() => setProfileOpen(false)} />
                      <DropdownItem to="/support"  icon="🎟️" label="Support" onClick={() => setProfileOpen(false)} />
                      <DropdownItem to="/chat"     icon="💬" label="Chat Global" badge={unreadChat > 0 ? unreadChat : null} onClick={() => setProfileOpen(false)} />
                    </div>

                    {/* Divider + logout */}
                    <div className="p-2 border-t border-white/5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition text-sm font-medium"
                      >
                        <span>🚪</span>
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
              onClick={() => setMobileOpen(p => !p)}
            >
              <span className={`block w-4 h-0.5 bg-white/60 rounded transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`}></span>
              <span className={`block w-4 h-0.5 bg-white/60 rounded transition-all ${mobileOpen ? "opacity-0" : ""}`}></span>
              <span className={`block w-4 h-0.5 bg-white/60 rounded transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`}></span>
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU ──────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-white/5 bg-[#030014]/98 backdrop-blur-xl"
            >
              <div className="px-4 py-3 space-y-1">
                {/* Profile strip */}
                <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-white/3 rounded-xl">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                    style={{ background: avatarColor(profile?.full_name) }}
                  >
                    {firstName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{profile?.full_name}</p>
                    <p className="text-[10px]" style={{ color: roleConfig.color }}>
                      {roleConfig.icon} {roleConfig.label}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-sm font-bold text-yellow-400">
                    💰 {(profile?.coins || 0).toLocaleString()}
                  </div>
                </div>

                {/* Nav links */}
                {NAV_LINKS.map(link => {
                  const active = isActive(link.to);
                  const showBadge = link.badge && unreadChat > 0;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${active
                          ? "bg-[#7c3aed]/20 text-white border border-[#7c3aed]/30"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <span className="text-base w-6 text-center">{link.icon}</span>
                      <span>{link.label}</span>
                      {showBadge && (
                        <span className="ml-auto bg-[#7c3aed] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadChat}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Admin mobile links */}
                {(isAdmin || isFounder) && (
                  <>
                    <div className="border-t border-white/5 my-2"></div>
                    <p className="text-[10px] text-white/25 tracking-widest px-3 pb-1">GESTION</p>
                    {ADMIN_LINKS.filter(l => l.roles.includes(profile?.role)).map(link => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                          ${isActive(link.to)
                            ? "bg-[#7c3aed]/20 text-white border border-[#7c3aed]/30"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                          }`}
                      >
                        <span className="text-base w-6 text-center">{link.icon}</span>
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </>
                )}

                {/* Logout */}
                <div className="border-t border-white/5 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
                  >
                    <span className="text-base w-6 text-center">🚪</span>
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Spacer to push content below fixed navbar ── */}
      <div className="h-[57px] flex-shrink-0"></div>
    </>
  );
}

// ─── DROPDOWN ITEM ────────────────────────────────────────────────────────────
function DropdownItem({ to, icon, label, badge, onClick }) {
  const location = useLocation();
  const active   = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
        ${active
          ? "bg-[#7c3aed]/15 text-white"
          : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span className="font-medium flex-1">{label}</span>
      {badge && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
          ${typeof badge === "number"
            ? "bg-[#7c3aed] text-white"
            : "bg-white/8 text-white/40"
          }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}