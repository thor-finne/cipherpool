import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayerProfilePanel({ player, onClose, accentColor }) {
  if (!player) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        exit={{ x: 300 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-80 bg-[#11151F] border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
        style={{
          boxShadow: accentColor ? `-5px 0 30px ${accentColor}20` : undefined
        }}
      >
        <div className="p-6 border-b border-white/10">
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-2 transition"
          >
            ← Close
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          
          <div 
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl"
            style={{
              background: accentColor ? `linear-gradient(135deg, ${accentColor}, #4C1D95)` : undefined,
              boxShadow: accentColor ? `0 10px 25px ${accentColor}40` : undefined
            }}
          >
            {player.profiles?.full_name?.charAt(0) || "U"}
          </div>

          <h2 className="text-xl font-bold text-white text-center">
            {player.profiles?.full_name}
          </h2>

          <div className="bg-[#1A1F2B] rounded-lg px-4 py-2 w-full text-center">
            <p className="text-xs text-white/40">Free Fire ID</p>
            <p className="text-sm text-purple-400 font-mono">
              {player.profiles?.free_fire_id || "N/A"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-[#1A1F2B] p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-white">24</p>
              <p className="text-xs text-white/40">Matches</p>
            </div>
            <div className="bg-[#1A1F2B] p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-white">8</p>
              <p className="text-xs text-white/40">Wins</p>
            </div>
          </div>

          <div className="bg-[#1A1F2B] p-4 rounded-lg w-full">
            <p className="text-xs text-white/40 mb-2">Win Rate</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-purple-400">33%</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: "33%",
                    backgroundColor: accentColor || '#7C3AED'
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs border border-purple-500/30">
              🏆 Champion
            </span>
            <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs border border-green-500/30">
              ✓ Verified
            </span>
            <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-full text-xs border border-yellow-500/30">
              ⭐ Top 10
            </span>
          </div>

          <div className="flex gap-3 w-full mt-4">
            <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
              Add Friend
            </button>
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 hover:border-white/30 rounded-lg text-sm font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}