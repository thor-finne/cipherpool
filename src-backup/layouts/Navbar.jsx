import { Link } from "react-router-dom";

export default function Navbar({ profile }) {
  return (
    <header className="h-16 border-b border-purple-500/20 bg-slate-900/50 backdrop-blur-xl px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-gray-400">Welcome back,</span>
        <span className="font-bold text-purple-400">{profile?.full_name}</span>
        {profile?.verification_status !== "approved" && (
          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full">
            Pending
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">💰</span>
          <span className="font-bold">{profile?.coins || 0}</span>
        </div>
        <Link to="/profile" className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 flex items-center justify-center">
          {profile?.full_name?.charAt(0) || "U"}
        </Link>
      </div>
    </header>
  );
}