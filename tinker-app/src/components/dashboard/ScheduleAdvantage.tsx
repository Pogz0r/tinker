'use client';

import { MOCK_SCHEDULE_ADVANTAGE } from '@/lib/mock-data';
import { format, startOfWeek, addDays } from 'date-fns';

export default function ScheduleAdvantage() {
  const { days, myGames, oppGames } = MOCK_SCHEDULE_ADVANTAGE;

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  const weekDates = days.map((_, i) => addDays(weekStart, i));

  const myTotal = myGames.reduce((a, b) => a + b, 0);
  const oppTotal = oppGames.reduce((a, b) => a + b, 0);
  const diff = myTotal - oppTotal;

  const maxGames = Math.max(...myGames, ...oppGames, 1);

  return (
    <div
      className="rounded-lg h-full flex flex-col"
      style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #27272a' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
          Schedule Advantage — Week 18
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
            <span style={{ color: '#71717a' }}>Mine</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
            <span style={{ color: '#71717a' }}>Opp</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-end justify-between gap-2 h-32">
          {days.map((day, i) => {
            const date = weekDates[i];
            const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isToday =
              date.getFullYear() === today.getFullYear() &&
              date.getMonth() === today.getMonth() &&
              date.getDate() === today.getDate();

            const myH = (myGames[i] / maxGames) * 100;
            const oppH = (oppGames[i] / maxGames) * 100;

            const myColor = isPast ? '#3f3f46' : '#22c55e';
            const oppColor = isPast ? '#3f3f46' : '#ef4444';

            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                {/* Day label */}
                <div
                  className="text-xs font-medium mb-1"
                  style={{
                    color: isToday ? '#eab308' : '#71717a',
                  }}
                >
                  {day}
                </div>

                {/* Bars */}
                <div
                  className="w-full flex items-end justify-center gap-0.5 h-24"
                  style={{
                    border: isToday ? '1px solid rgba(234,179,8,0.3)' : 'none',
                    borderRadius: '4px',
                    padding: '2px',
                  }}
                >
                  {/* My bar */}
                  <div className="flex-1 flex flex-col justify-end items-center">
                    <span className="text-xs tabular-nums mb-0.5" style={{ color: myColor, fontSize: '10px' }}>
                      {myGames[i]}
                    </span>
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${myH}%`,
                        backgroundColor: myColor,
                        minHeight: myGames[i] > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                  {/* Opp bar */}
                  <div className="flex-1 flex flex-col justify-end items-center">
                    <span className="text-xs tabular-nums mb-0.5" style={{ color: oppColor, fontSize: '10px' }}>
                      {oppGames[i]}
                    </span>
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${oppH}%`,
                        backgroundColor: oppColor,
                        minHeight: oppGames[i] > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div
          className="mt-3 px-3 py-2 rounded text-sm font-medium text-center"
          style={{
            backgroundColor: diff > 0 ? 'rgba(34,197,94,0.1)' : diff < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(113,113,122,0.1)',
            color: diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#71717a',
          }}
        >
          You: {myTotal} games | Opp: {oppTotal} games{' '}
          {diff !== 0 && (
            <span>
              ({diff > 0 ? '+' : ''}{diff} {diff > 0 ? 'advantage' : 'disadvantage'})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
