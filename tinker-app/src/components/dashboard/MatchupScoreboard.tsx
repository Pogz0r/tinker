'use client';

import { AlertTriangle } from 'lucide-react';
import { MOCK_MATCHUP } from '@/lib/mock-data';

const LOWER_IS_BETTER = new Set(['TO']);

function formatScore(cat: string, val: number): string {
  if (cat === 'FG%' || cat === 'FT%') return '.' + val.toFixed(3).slice(2);
  if (cat === 'TO') return Math.round(val).toString();
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(1);
}

function isMeWinning(cat: string, myVal: number, oppVal: number): boolean {
  if (LOWER_IS_BETTER.has(cat)) return myVal < oppVal;
  return myVal > oppVal;
}

export default function MatchupScoreboard() {
  const m = MOCK_MATCHUP;
  const categories = m.categories;

  const currentWins: boolean[] = categories.map((cat, i) =>
    isMeWinning(cat, m.myCurrentScores[i], m.oppCurrentScores[i])
  );
  const projectedWins: boolean[] = categories.map((cat, i) =>
    isMeWinning(cat, m.myProjectedScores[i], m.oppProjectedScores[i])
  );

  const currentW = currentWins.filter(Boolean).length;
  const currentL = currentWins.filter((w) => !w).length;
  const projW = projectedWins.filter(Boolean).length;
  const projL = projectedWins.filter((w) => !w).length;
  const projWinning = projW > projL;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #27272a' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
            Week {m.week} Matchup
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>
            {m.myTeam} vs {m.opponent}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Current score */}
          <div className="text-right">
            <p className="text-xs" style={{ color: '#71717a' }}>Current</p>
            <p
              className="text-xl font-bold tabular-nums"
              style={{ color: currentW > currentL ? '#22c55e' : '#ef4444' }}
            >
              {currentW}-{currentL}
            </p>
          </div>
          {/* Arrow */}
          <div style={{ color: '#27272a' }}>→</div>
          {/* Projected outcome pill */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{
              backgroundColor: projWinning ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
              color: projWinning ? '#22c55e' : '#eab308',
            }}
          >
            {!projWinning && <AlertTriangle size={13} />}
            Projected: {projW}-{projL} {projWinning ? 'Win' : 'Loss'}
          </div>
        </div>
      </div>

      {/* Category grid */}
      <div className="p-4">
        {/* Team labels row */}
        <div className="grid mb-1" style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
          <div />
          {categories.map((cat) => (
            <div key={cat} className="text-center">
              <span className="text-xs font-semibold tracking-wide" style={{ color: '#71717a' }}>
                {cat}
              </span>
            </div>
          ))}
        </div>

        {/* My team current scores */}
        <div className="grid items-center" style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
          <div className="text-xs font-medium truncate pr-2" style={{ color: '#f4f4f5' }}>
            {m.myTeam.split(' ')[0]}
          </div>
          {categories.map((cat, i) => {
            const winning = currentWins[i];
            return (
              <div key={cat} className="text-center py-1.5">
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: winning ? '#22c55e' : '#ef4444' }}
                >
                  {formatScore(cat, m.myCurrentScores[i])}
                </span>
              </div>
            );
          })}
        </div>

        {/* Dashed separator */}
        <div className="grid my-0.5" style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
          <div />
          {categories.map((cat) => (
            <div key={cat} className="mx-1" style={{ height: '1px', borderTop: '1px dashed #3f3f46' }} />
          ))}
        </div>

        {/* Opponent current scores */}
        <div className="grid items-center" style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
          <div className="text-xs font-medium truncate pr-2" style={{ color: '#71717a' }}>
            {m.opponent}
          </div>
          {categories.map((cat, i) => {
            const oppWinning = !currentWins[i];
            return (
              <div key={cat} className="text-center py-1.5">
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: oppWinning ? '#22c55e' : '#ef4444' }}
                >
                  {formatScore(cat, m.oppCurrentScores[i])}
                </span>
              </div>
            );
          })}
        </div>

        {/* Projected section label */}
        <div
          className="mt-3 mb-1 px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: '#09090b', color: '#52525b' }}
        >
          Projected end-of-week
        </div>

        {/* My projected */}
        <div className="grid items-center" style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
          <div className="text-xs truncate pr-2" style={{ color: '#71717a' }}>
            {m.myTeam.split(' ')[0]}
          </div>
          {categories.map((cat, i) => {
            const projWin = projectedWins[i];
            const flipped = projWin !== currentWins[i];
            return (
              <div key={cat} className="text-center py-1 relative">
                <span
                  className="text-xs tabular-nums"
                  style={{ color: projWin ? '#22c55e' : '#ef4444' }}
                >
                  {formatScore(cat, m.myProjectedScores[i])}
                </span>
                {flipped && (
                  <span
                    className="absolute -top-0.5 -right-0 text-xs"
                    style={{ color: '#eab308', fontSize: '8px' }}
                    title="Category outcome changes in projections"
                  >
                    ↕
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Opponent projected */}
        <div className="grid items-center" style={{ gridTemplateColumns: '80px repeat(9, 1fr)' }}>
          <div className="text-xs truncate pr-2" style={{ color: '#52525b' }}>
            {m.opponent}
          </div>
          {categories.map((cat, i) => {
            const oppProjWin = !projectedWins[i];
            return (
              <div key={cat} className="text-center py-1">
                <span
                  className="text-xs tabular-nums"
                  style={{ color: oppProjWin ? '#22c55e' : '#ef4444' }}
                >
                  {formatScore(cat, m.oppProjectedScores[i])}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
