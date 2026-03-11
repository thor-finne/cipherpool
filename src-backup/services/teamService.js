class TeamService {
  // تنظيم الفرق حسب mode
  organizeTeams(players, mode) {
    const teamSize = this.getTeamSize(mode);
    const teamMap = {};

    players.forEach(player => {
      const teamNum = player.team_number || 1;
      if (!teamMap[teamNum]) {
        teamMap[teamNum] = {
          number: teamNum,
          captain: teamNum === 1 ? players[0]?.user_id : null,
          players: []
        };
      }
      teamMap[teamNum].players.push(player);
    });

    return Object.values(teamMap).sort((a, b) => a.number - b.number);
  }

  // تحديد حجم الفريق حسب mode
  getTeamSize(mode) {
    switch(mode) {
      case "squad": return 4;
      case "duo": return 2;
      default: return 1;
    }
  }

  // إنشاء مصفوفة المقاعد
  createSeats(players, maxPlayers, mode) {
    const teamSize = this.getTeamSize(mode);
    const seats = [];

    for (let i = 0; i < maxPlayers; i++) {
      const seatNumber = i + 1;
      const player = players.find(p => p.seat_number === seatNumber);
      seats.push({
        number: seatNumber,
        player: player || null,
        teamNumber: player?.team_number || Math.ceil(seatNumber / teamSize)
      });
    }

    return seats;
  }

  // حساب عدد الجاهزين
  countReady(players) {
    return players.filter(p => p.is_ready).length;
  }
}

export const teamService = new TeamService();