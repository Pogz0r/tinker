'use client';

import { useState, useEffect } from 'react';
import { MOCK_ROSTER_NAMES } from '@/lib/mock-data';

const CATEGORIES = [
  { key: 'z_pts', label: 'PTS' },
  { key: 'z_reb', label: 'REB' },
  { key: 'z_ast', label: 'AST' },
  { key: 'z_stl', label: 'STL' },
  { key: 'z_blk', label: 'BLK' },
  { key: 'z_threes', label: '3PM' },
  { key: 'z_fg_impact', label: 'FG%' },
  { key: 'z_ft_impact', label: 'FT%' },
  { key: 'z_to', label: 'TO' },
];

type ViewMode = 'Projection' | 'Season Avg' | 'Last 15';

function SkeletonBar() {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-10 h-3 rounded animate-pulse" style={{ backgroundColor: '#27272a' }} />
      <div className="flex-1 h-5 rounded animate-pulse" style={{ backgroundColor: '#27272a' }} />
      <div className="w-10 h-3 rounded animate-pulse" style={{ backgroundColor: '#27272a' }} />
    </div>
  );
}

export default function TeamCategoryProfile() {
  const [avgScores, setAvgScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('Projection');

  useEffect(() => {
    const fetchRosterScores = async () => {
      try {
        const names = MOCK_ROSTER_NAMES.join(',');
        const res = await fetch(`/api/zscores?names=${encodeURIComponent(names)}`);
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const players = json.players || [];

        const avgs: Record<string, number> = {};
        for (const cat of CATEGORIES) {
          const vals = players
            .map((p: any) => parseFloat(p[cat.key] ?? '0'))
            .filter((v: number) => !isNaN(v));
          avgs[cat.key] = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
        }
        setAvgScores(avgs);
      } catch {
        // Use zeros on error
      } finally {
        setLoading(false);
      }
    };
    fetchRosterScores();
  }, []);

  const maxAbs = Math.max(...Object.values(avgScores).map(Math.abs), 1);

  return (
    <div
      className="rounded-lg"
      style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #27272a' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
          Team Category Profile
        </h3>
        <div
          className="flex rounded overflow-hidden text-xs"
          style={{ border: '1px solid #27272a' }}
        >
          {(['Projection', 'Season Avg', 'Last 15'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 font-medium transition-colors"
              style={{
                backgroundColor: viewMode === mode ? '#27272a' : 'transparent',
                color: viewMode === mode ? '#f4f4f5' : '#71717a',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <SkeletonBar key={cat.key} />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {CATEGORIES.map((cat) => {
              const val = avgScores[cat.key] ?? 0;
              const isPositive = val > 0.3;
              const isNegative = val < -0.3;
              const barColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#eab308';
              const barWidthPct = (Math.abs(val) / maxAbs) * 100;

              return (
                <div key={cat.key} className="flex items-center gap-3">
                  {/* Label */}
                  <span
                    className="text-xs font-medium w-8 text-right flex-shrink-0 tabular-nums"
                    style={{ color: '#71717a' }}
                  >
                    {cat.label}
                  </span>

                  {/* Bar track */}
                  <div className="flex-1 relative h-5 flex items-center">
                    <div
                      className="absolute inset-0 rounded-sm"
                      style={{ backgroundColor: '#09090b' }}
                    />
                    <div
                      className="relative h-3 rounded-sm transition-all"
                      style={{
                        width: `${barWidthPct}%`,
                        backgroundColor: barColor,
                        opacity: 0.8,
                      }}
                    />
                  </div>

                  {/* Value */}
                  <span
                    className="text-xs font-mono tabular-nums w-12 flex-shrink-0"
                    style={{ color: barColor }}
                  >
                    {val > 0 ? '+' : ''}{val.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: '#52525b' }}>
          Average z-score across 13-player roster · {viewMode}
        </p>
      </div>
    </div>
  );
}
