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
  onChangeSeat 
}) {
  const isCurrentUser = player?.id === currentUserId;
  const isCaptain = teamNumber === 1 && seatNumber === 1;

  const handleSeatClick = () => {
    if (!player) {
      // مقعد خالي
      if (role === "participant" && tournament?.status === "open") {
        onChangeSeat?.(teamNumber, seatNumber);
      }
    } else {
      // مقعد فيه لاعب
      onSelect?.(player);
    }
  };

  return (
    <div
      className={`relative aspect-square rounded-xl p-3 text-center transition-all duration-200 ${
        player ? 'border cursor-pointer hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]' : 'border border-white/5 opacity-40 cursor-pointer hover:opacity-70'
      } ${isCurrentUser ? 'ring-2 ring-purple-500' : ''}`}
      style={{
        borderColor: player ? tournament?.background_color || '#6D28D9' : undefined,
        background: player 
          ? `linear-gradient(135deg, ${tournament?.background_color || '#6D28D9'}20, #11151C)`
          : '#11151C'
      }}
      onClick={handleSeatClick}
    >
      {/* Team Number (صغير) */}
      <div 
        className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{ backgroundColor: tournament?.background_color || '#6D28D9' }}
      >
        {teamNumber}
      </div>

      {/* Seat Number */}
      <div 
        className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{ backgroundColor: tournament?.background_color || '#6D28D9' }}
      >
        {seatNumber}
      </div>

      {/* Captain Crown */}
      {player && isCaptain && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-400 text-sm">
          👑
        </div>
      )}

      {/* Ready Indicator (نقطة متحركة) */}
      {player?.isReady && (
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}

      {/* Kick Button */}
      {role === "organizer" && player && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onKick?.(player.id);
          }}
          className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white hover:bg-red-600 transition z-10"
        >
          ✕
        </button>
      )}

      {/* Player Info */}
      {player ? (
        <>
          <div className="mb-1 mt-3">
            {player.avatar_url ? (
              <img 
                src={player.avatar_url} 
                alt={player.full_name}
                className="w-8 h-8 rounded-full mx-auto border"
                style={{ borderColor: tournament?.background_color || '#6D28D9' }}
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-auto"
                style={{
                  background: `linear-gradient(135deg, ${tournament?.background_color || '#6D28D9'}40, #2A2F3B)`,
                  border: `1px solid ${tournament?.background_color || '#6D28D9'}`
                }}
              >
                {player.full_name?.charAt(0) || "U"}
              </div>
            )}
          </div>
          
          <p className="text-xs font-medium truncate">
            {player.full_name?.split(' ')[0] || "Player"}
            {isCurrentUser && " (You)"}
          </p>
          
          <p className="text-[10px] mt-1 truncate opacity-70" style={{ color: tournament?.background_color || '#6D28D9' }}>
            {player.free_fire_id?.slice(0, 6) || "FF ID"}
          </p>

          {/* Rank Badge (مثال) */}
          <div className="absolute bottom-1 left-1 text-[8px] bg-purple-600/30 px-1 rounded">
            Lv.5
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-white/20 text-xs">Empty</span>
        </div>
      )}
    </div>
  );
}