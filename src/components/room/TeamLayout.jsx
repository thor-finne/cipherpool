import React from "react";
import PlayerCard from "./PlayerCard";

export default function TeamLayout({ 
  teams, 
  tournament, 
  role, 
  currentUserId,
  onSelectPlayer, 
  onKickPlayer,
  onChangeSeat,
  onSwapRequest
}) {
  if (!teams || teams.length === 0) {
    return (
      <div className="text-center py-20 bg-[#11151C] border border-white/5 rounded-xl">
        <p className="text-white/40">No teams structure available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {teams.map((team) => (
        <div key={team.teamNumber} className="bg-[#11151C] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-md font-bold text-white">Team {team.teamNumber}</h3>
            <span className="text-xs text-white/40">
              {team.seats.filter(s => s.player).length}/{team.seats.length}
            </span>
          </div>

          <div className={`grid gap-3 ${
            team.seats.length === 4 ? 'grid-cols-4' : 
            team.seats.length === 2 ? 'grid-cols-2' : 
            'grid-cols-1'
          }`}>
            {team.seats.map((seat) => (
              <PlayerCard
                key={`${team.teamNumber}-${seat.seatNumber}`}
                player={seat.player}
                teamNumber={team.teamNumber}
                seatNumber={seat.seatNumber}
                tournament={tournament}
                role={role}
                currentUserId={currentUserId}
                onSelect={onSelectPlayer}
                onKick={onKickPlayer}
                onChangeSeat={onChangeSeat}
                onSwapRequest={onSwapRequest}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}