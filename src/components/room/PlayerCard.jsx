import React from "react";

export default function PlayerCard({ 
  player, 
  teamNumber, 
  seatNumber, 
  tournament, 
  role, 
  currentUserId,
  onSelect, 
  onKick,
  onChangeSeat,
  onSwapRequest,    // new: request swap with another player
  pendingSwap,      // new: { fromTeam, fromSeat, fromUserId } if someone wants to swap with me
  onSwapRespond,    // new: (accept: bool) => void
}) {
  const isCurrentUser = player?.id === currentUserId;
  const isCaptain = teamNumber === 1 && seatNumber === 1;
  
  // Someone sent ME a swap request for this seat
  const hasPendingRequest = pendingSwap && player?.id === currentUserId;

  const handleSeatClick = () => {
    if (!player) {
      // Empty seat → move here directly
      if (role === "participant" && tournament?.status === "open") {
        onChangeSeat?.(teamNumber, seatNumber);
      }
    } else if (!isCurrentUser) {
      // Occupied by OTHER player → request swap
      if (role === "participant" && tournament?.status === "open") {
        onSwapRequest?.(teamNumber, seatNumber, player);
      } else {
        onSelect?.(player);
      }
    } else {
      // My own card → open profile
      onSelect?.(player);
    }
  };

  const accentColor = tournament?.background_color || "#6D28D9";

  return (
    <div
      className={`relative aspect-square rounded-xl p-3 text-center transition-all duration-200 ${
        player
          ? "border cursor-pointer hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]"
          : "border border-white/5 opacity-40 cursor-pointer hover:opacity-70"
      } ${isCurrentUser ? "ring-2 ring-purple-500" : ""} ${
        hasPendingRequest ? "ring-2 ring-yellow-400 animate-pulse" : ""
      }`}
      style={{
        borderColor: player ? accentColor : undefined,
        background: player
          ? `linear-gradient(135deg, ${accentColor}20, #11151C)`
          : "#11151C",
      }}
      onClick={handleSeatClick}
    >
      {/* Team / Seat badges */}
      <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{ backgroundColor: accentColor }}>
        {teamNumber}
      </div>
      <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{ backgroundColor: accentColor }}>
        {seatNumber}
      </div>

      {/* Captain crown */}
      {player && isCaptain && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-400 text-sm">👑</div>
      )}

      {/* Ready dot */}
      {player?.isReady && (
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}

      {/* Kick button (organizer) */}
      {role === "organizer" && player && (
        <button onClick={(e) => { e.stopPropagation(); onKick?.(player.id); }}
          className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white hover:bg-red-600 transition z-10">
          ✕
        </button>
      )}

      {/* Swap icon overlay (not my seat, is participant) */}
      {player && !isCurrentUser && role === "participant" && tournament?.status === "open" && (
        <div className="absolute inset-0 rounded-xl bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200 z-5">
          <span className="text-2xl">🔄</span>
        </div>
      )}

      {/* Pending swap request badge */}
      {hasPendingRequest && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] animate-bounce">
            🔄
          </div>
        </div>
      )}

      {/* Player content */}
      {player ? (
        <>
          <div className="mb-1 mt-3">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.full_name}
                className="w-10 h-10 rounded-full mx-auto object-cover border-2"
                style={{ borderColor: accentColor }} />
            ) : (
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: `${accentColor}30`, color: accentColor }}>
                {player.full_name?.[0] || "?"}
              </div>
            )}
          </div>
          <p className="text-white text-xs font-medium truncate">
            {isCurrentUser ? `${player.full_name} (You)` : player.full_name}
          </p>
          <p className="text-white/40 text-[9px] truncate">{player.free_fire_id || ""}</p>
        </>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-white/20 text-xs">Empty</p>
        </div>
      )}
    </div>
  );
}