/**
 * توليد هيكل الغرفة حسب mode وعدد اللاعبين
 */
export function generateStructure(mode, maxPlayers) {
  // التحقق من المدخلات
  if (!mode || !maxPlayers || maxPlayers <= 0) {
    console.warn("Invalid parameters for generateStructure:", { mode, maxPlayers });
    return [];
  }

  switch(mode) {
    case 'solo':
      return Array.from({ length: maxPlayers }, (_, i) => ({
        team: i + 1,
        seats: [{ seat: 1, player: null, isReady: false }]
      }));

    case 'duo': {
      const numTeams = Math.ceil(maxPlayers / 2);
      return Array.from({ length: numTeams }, (_, i) => ({
        team: i + 1,
        seats: [
          { seat: 1, player: null, isReady: false },
          { seat: 2, player: null, isReady: false }
        ]
      }));
    }

    case 'squad': {
      const numTeams = Math.ceil(maxPlayers / 4);
      return Array.from({ length: numTeams }, (_, i) => ({
        team: i + 1,
        seats: [
          { seat: 1, player: null, isReady: false },
          { seat: 2, player: null, isReady: false },
          { seat: 3, player: null, isReady: false },
          { seat: 4, player: null, isReady: false }
        ]
      }));
    }

    default:
      console.warn(`Unknown mode: ${mode}, defaulting to solo`);
      return Array.from({ length: maxPlayers }, (_, i) => ({
        team: i + 1,
        seats: [{ seat: 1, player: null, isReady: false }]
      }));
  }
}

/**
 * دمج المشاركين مع الهيكل
 */
export function mergeParticipants(structure, participants) {
  if (!structure || !participants) return structure;

  // نسخة عميقة من الهيكل
  const newStructure = JSON.parse(JSON.stringify(structure));

  participants.forEach(p => {
    const team = newStructure.find(t => t.team === p.team_number);
    if (!team) return;

    const seat = team.seats.find(s => s.seat === p.seat_number);
    if (!seat) return;

    seat.player = {
      id: p.user_id,
      full_name: p.profiles?.full_name || "Unknown",
      free_fire_id: p.profiles?.free_fire_id || "",
      avatar_url: p.profiles?.avatar_url || null,
      isReady: p.is_ready || false
    };
  });

  return newStructure;
}

/**
 * التحقق من إمكانية تغيير المقعد
 */
export function canChangeSeat(seat, currentUser, tournament, role) {
  // فقط المشاركين
  if (role !== 'participant') return false;

  // البطولة مفتوحة
  if (tournament?.status !== 'open') return false;

  // المقعد خالي
  if (seat.player) return false;

  return true;
}