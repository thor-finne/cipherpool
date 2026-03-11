import React from "react";

export default function PlayerProfileModal({ player, currentUser, onClose }) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-[400px] bg-[#11151C] border border-purple-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(139,92,246,0.3)] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3 shadow-lg">
            {player.profiles?.full_name?.charAt(0) || "U"}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            {player.profiles?.full_name}
          </h2>
          <p className="text-purple-400 text-sm mb-4">
            @{player.profiles?.free_fire_id || "player"}
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-[#1A1F2B] p-3 rounded-lg">
              <p className="text-lg font-bold text-white">24</p>
              <p className="text-xs text-white/40">Matches</p>
            </div>
            <div className="bg-[#1A1F2B] p-3 rounded-lg">
              <p className="text-lg font-bold text-white">8</p>
              <p className="text-xs text-white/40">Wins</p>
            </div>
          </div>

          <div className="flex gap-3">
            {currentUser && currentUser.id !== player.user_id && (
              <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
                Add Friend
              </button>
            )}
            <button 
              className="flex-1 px-4 py-2 border border-white/10 hover:border-white/30 rounded-lg text-sm font-medium transition"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}