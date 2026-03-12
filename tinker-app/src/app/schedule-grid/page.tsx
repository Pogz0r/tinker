'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { MOCK_ROSTER_NAMES, MOCK_ELIGIBLE_POSITIONS } from '@/lib/mock-data';

interface Game {
  game_date: string;
  home_team: string;
  away_team: string;
  home_name: string;
  away_name: string;
}

// Get all unique team abbreviations from roster
const ROSTER_TEAMS = new Set([
  'OKC', 'PHI', 'MIN', 'NO', 'LAC', 'BOS', 'MIA', 'SAS', 'DEN',
  'MEM', 'WAS', 'ATL', 'IND',
]);

export default function ScheduleGridPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();

  const currentWeekStart = startOfWeek(
    weekOffset === 0 ? today : weekOffset > 0 ? addWeeks(today, weekOffset) : subWeeks(today, -weekOffset),
    { weekStartsOn: 1 }
  );
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/schedule');
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        setGames(json.games || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  // Build team → day → games map
  const allTeams = new Set<string>();
  const gameMap: Record<string, Record<string, Game[]>> = {};

  for (const game of games) {
    const dateStr = game.game_date.split('T')[0];
    allTeams.add(game.home_team);
    allTeams.add(game.away_team);
    if (!gameMap[game.home_team]) gameMap[game.home_team] = {};
    if (!gameMap[game.home_team][dateStr]) gameMap[game.home_team][dateStr] = [];
    gameMap[game.home_team][dateStr].push(game);
    if (!gameMap[game.away_team]) gameMap[game.away_team] = {};
    if (!gameMap[game.away_team][dateStr]) gameMap[game.away_team][dateStr] = [];
    gameMap[game.away_team][dateStr].push(game);
  }

  const sortedTeams = Array.from(allTeams).sort();

  // Count games per team this week
  const teamWeekGames: Record<string, number> = {};
  for (const team of sortedTeams) {
    let count = 0;
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      count += (gameMap[team]?.[dateStr] ?? []).length;
    }
    teamWeekGames[team] = count;
  }

  // Games per day across league
  const dayTotals = weekDays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return games.filter(
      (g) => g.game_date.split('T')[0] === dateStr
    ).length;
  });

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#f4f4f5' }}>Schedule Grid</h1>
          <p className="text-sm mt-0.5" style={{ color: '#71717a' }}>
            {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-lg transition-colors hover:bg-zinc-800"
            style={{ border: '1px solid #27272a' }}
          >
            <ChevronLeft size={16} style={{ color: '#a1a1aa' }} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-zinc-800"
            style={{ border: '1px solid #27272a', color: '#a1a1aa' }}
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="p-2 rounded-lg transition-colors hover:bg-zinc-800"
            style={{ border: '1px solid #27272a' }}
          >
            <ChevronRight size={16} style={{ color: '#a1a1aa' }} />
          </button>
        </div>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                <th
                  className="px-3 py-2.5 text-left font-medium w-16"
                  style={{ color: '#52525b' }}
                >
                  Team
                </th>
                <th
                  className="px-2 py-2.5 text-center font-medium w-10"
                  style={{ color: '#52525b' }}
                >
                  GP
                </th>
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <th
                      key={day.toISOString()}
                      className="px-2 py-2.5 text-center font-medium min-w-[80px]"
                      style={{ color: isToday ? '#eab308' : '#52525b' }}
                    >
                      {format(day, 'EEE')}{' '}
                      <span className="text-xs" style={{ fontWeight: 400 }}>
                        {format(day, 'M/d')}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1f1f23' }}>
                    <td className="px-3 py-2.5">
                      <div className="h-3 w-10 rounded animate-pulse" style={{ backgroundColor: '#27272a' }} />
                    </td>
                    <td />
                    {weekDays.map((d) => (
                      <td key={d.toISOString()} className="px-2 py-2.5">
                        <div className="h-3 w-14 rounded animate-pulse mx-auto" style={{ backgroundColor: '#27272a' }} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!loading && sortedTeams.map((team) => {
                const isRostered = ROSTER_TEAMS.has(team);
                const weekGames = teamWeekGames[team] ?? 0;
                const isStreamer = weekGames >= 4;

                return (
                  <tr
                    key={team}
                    style={{
                      borderBottom: '1px solid #1f1f23',
                      backgroundColor: isRostered ? 'rgba(59,130,246,0.05)' : 'transparent',
                    }}
                  >
                    <td className="px-3 py-2 font-semibold" style={{ color: isRostered ? '#93c5fd' : '#a1a1aa' }}>
                      {team}
                      {isRostered && (
                        <span className="ml-1 text-xs" style={{ color: '#3b82f6' }}>★</span>
                      )}
                    </td>
                    <td
                      className="px-2 py-2 text-center font-semibold tabular-nums"
                      style={{ color: isStreamer ? '#eab308' : '#71717a' }}
                    >
                      {weekGames}
                    </td>
                    {weekDays.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayGames = gameMap[team]?.[dateStr] ?? [];
                      const isToday = isSameDay(day, today);

                      return (
                        <td
                          key={dateStr}
                          className="px-2 py-2 text-center"
                          style={{
                            backgroundColor: isToday ? 'rgba(234,179,8,0.05)' : 'transparent',
                          }}
                        >
                          {dayGames.map((g, i) => {
                            const isHome = g.home_team === team;
                            const opp = isHome ? g.away_team : g.home_team;
                            return (
                              <div key={i} className="text-xs whitespace-nowrap" style={{ color: '#a1a1aa' }}>
                                {isHome ? 'vs' : '@'}{' '}
                                <span style={{ color: '#f4f4f5', fontWeight: 500 }}>{opp}</span>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Totals row */}
              {!loading && (
                <tr style={{ borderTop: '1px solid #27272a', backgroundColor: '#09090b' }}>
                  <td className="px-3 py-2 text-xs font-semibold" style={{ color: '#52525b' }}>
                    Games
                  </td>
                  <td />
                  {dayTotals.map((total, i) => {
                    const isToday = isSameDay(weekDays[i], today);
                    return (
                      <td
                        key={i}
                        className="px-2 py-2 text-center text-xs font-semibold tabular-nums"
                        style={{ color: isToday ? '#eab308' : '#71717a' }}
                      >
                        {total}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: '#52525b' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }} />
          Rostered team
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: '#eab308' }}>★</span>
          4+ games (streaming target)
        </span>
      </div>
    </div>
  );
}
