'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MOCK_ROSTER_NAMES,
  MOCK_ELIGIBLE_POSITIONS,
  MOCK_INJURY_STATUS,
} from '@/lib/mock-data';

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

interface Player {
  id: string;
  full_name: string;
  team_abbr: string;
  position: string;
  z_total: number;
  z_pts: number;
  z_reb: number;
  z_ast: number;
  z_stl: number;
  z_blk: number;
  z_threes: number;
  z_fg_impact: number;
  z_ft_impact: number;
  z_to: number;
  proj_minutes?: number;
}

function zColor(val: number): string {
  if (val > 0.5) return 'rgba(20,83,45,0.25)';
  if (val < -0.5) return 'rgba(127,29,29,0.25)';
  if (val < 0) return 'rgba(146,64,14,0.15)';
  return 'transparent';
}

function zTextColor(val: number): string {
  if (val > 0.5) return '#22c55e';
  if (val < -0.5) return '#ef4444';
  if (val < 0) return '#eab308';
  return '#a1a1aa';
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 16 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: '#27272a' }} />
        </td>
      ))}
    </tr>
  );
}

export default function MyTeamPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sortKey, setSortKey] = useState<string>('z_total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [teamAvgs, setTeamAvgs] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const names = MOCK_ROSTER_NAMES.join(',');
        const res = await fetch(`/api/zscores?names=${encodeURIComponent(names)}`);
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const p = json.players || [];

        // Convert string numbers to floats
        const parsed = p.map((player: any) => ({
          ...player,
          z_total: parseFloat(player.z_total ?? '0'),
          z_pts: parseFloat(player.z_pts ?? '0'),
          z_reb: parseFloat(player.z_reb ?? '0'),
          z_ast: parseFloat(player.z_ast ?? '0'),
          z_stl: parseFloat(player.z_stl ?? '0'),
          z_blk: parseFloat(player.z_blk ?? '0'),
          z_threes: parseFloat(player.z_threes ?? '0'),
          z_fg_impact: parseFloat(player.z_fg_impact ?? '0'),
          z_ft_impact: parseFloat(player.z_ft_impact ?? '0'),
          z_to: parseFloat(player.z_to ?? '0'),
          proj_minutes: parseFloat(player.proj_minutes ?? '0'),
        }));

        setPlayers(parsed);

        // Compute team averages
        const avgs: Record<string, number> = {};
        for (const cat of CATEGORIES) {
          const vals = parsed.map((pl: Player) => (pl as any)[cat.key]).filter((v: any) => !isNaN(v));
          avgs[cat.key] = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
        }
        setTeamAvgs(avgs);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRoster();
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...players].sort((a, b) => {
    const aVal = (a as any)[sortKey] ?? 0;
    const bVal = (b as any)[sortKey] ?? 0;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const dropCandidates = [...players]
    .sort((a, b) => a.z_total - b.z_total)
    .slice(0, 3);

  const maxAbs = Math.max(...Object.values(teamAvgs).map(Math.abs), 1);

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#f4f4f5' }}>
          My Team
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#71717a' }}>
          Tinker Squad · 13 players
        </p>
      </div>

      {/* Team Summary Bar */}
      <div
        className="rounded-lg p-5 mb-5"
        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#f4f4f5' }}>
          Team Category Summary
        </h2>
        <div className="grid grid-cols-9 gap-2">
          {CATEGORIES.map((cat) => {
            const val = teamAvgs[cat.key] ?? 0;
            const barH = (Math.abs(val) / maxAbs) * 48;
            const barColor = val > 0.3 ? '#22c55e' : val < -0.3 ? '#ef4444' : '#eab308';
            return (
              <div key={cat.key} className="flex flex-col items-center gap-1">
                <span className="text-xs tabular-nums font-mono" style={{ color: barColor }}>
                  {val > 0 ? '+' : ''}{val.toFixed(1)}
                </span>
                <div className="w-full flex flex-col justify-end" style={{ height: '48px' }}>
                  <div
                    className="w-full rounded-sm"
                    style={{ height: `${barH}px`, backgroundColor: barColor, opacity: 0.8 }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: '#71717a' }}>
                  {cat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roster Table */}
      <div
        className="rounded-lg overflow-hidden mb-5"
        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
      >
        <div
          className="px-5 py-3"
          style={{ borderBottom: '1px solid #27272a' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
            Roster
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {[
                  { key: 'full_name', label: 'Player' },
                  { key: 'team_abbr', label: 'Team' },
                  { key: 'position', label: 'Pos' },
                  { key: 'eligible', label: 'Eligible' },
                  { key: 'status', label: 'Status' },
                  { key: 'proj_minutes', label: 'Min' },
                  { key: 'z_pts', label: 'z_pts' },
                  { key: 'z_reb', label: 'z_reb' },
                  { key: 'z_ast', label: 'z_ast' },
                  { key: 'z_stl', label: 'z_stl' },
                  { key: 'z_blk', label: 'z_blk' },
                  { key: 'z_threes', label: 'z_3pm' },
                  { key: 'z_fg_impact', label: 'z_fg' },
                  { key: 'z_ft_impact', label: 'z_ft' },
                  { key: 'z_to', label: 'z_to' },
                  { key: 'z_total', label: 'Z-Total' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => ['full_name', 'team_abbr', 'position', 'eligible', 'status'].includes(key) ? null : handleSort(key)}
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                    style={{
                      color: sortKey === key ? '#f4f4f5' : '#52525b',
                      cursor: ['full_name', 'eligible', 'status'].includes(key) ? 'default' : 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {label}
                    {sortKey === key && (
                      <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 13 }).map((_, i) => <SkeletonRow key={i} />)}
              {!loading && error && (
                <tr>
                  <td colSpan={16} className="px-4 py-6 text-center" style={{ color: '#ef4444' }}>
                    Failed to load roster data
                  </td>
                </tr>
              )}
              {!loading && !error && sorted.map((player) => {
                const injStatus = MOCK_INJURY_STATUS[player.full_name];
                const eligPos = MOCK_ELIGIBLE_POSITIONS[player.full_name] || [];
                return (
                  <tr
                    key={player.full_name}
                    style={{ borderBottom: '1px solid #1f1f23' }}
                  >
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: '#f4f4f5' }}>
                      {player.full_name}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: '#71717a' }}>
                      {player.team_abbr || '—'}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: '#71717a' }}>
                      {player.position || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {eligPos.map((pos) => (
                          <span
                            key={pos}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}
                          >
                            {pos}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {injStatus ? (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: injStatus === 'OUT' ? '#ef4444' : '#eab308' }}
                        >
                          {injStatus}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#71717a' }}>
                      {(player.proj_minutes ?? 0) > 0 ? (player.proj_minutes ?? 0).toFixed(1) : '—'}
                    </td>
                    {([
                      'z_pts', 'z_reb', 'z_ast', 'z_stl', 'z_blk',
                      'z_threes', 'z_fg_impact', 'z_ft_impact', 'z_to'
                    ] as const).map((cat) => {
                      const val = (player as any)[cat] ?? 0;
                      return (
                        <td
                          key={cat}
                          className="px-3 py-2.5 tabular-nums text-right"
                          style={{
                            backgroundColor: zColor(val),
                            color: zTextColor(val),
                          }}
                        >
                          {val > 0 ? '+' : ''}{val.toFixed(2)}
                        </td>
                      );
                    })}
                    <td
                      className="px-3 py-2.5 tabular-nums font-semibold text-right"
                      style={{ color: player.z_total > 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {player.z_total > 0 ? '+' : ''}{player.z_total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop Candidates */}
      {!loading && dropCandidates.length > 0 && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
        >
          <div
            className="px-5 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid #27272a', backgroundColor: 'rgba(239,68,68,0.05)' }}
          >
            <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>
              Drop Candidates
            </span>
            <span className="text-xs" style={{ color: '#71717a' }}>
              · Lowest z-score players on your roster
            </span>
          </div>
          <div className="p-4 grid gap-3 sm:grid-cols-3">
            {dropCandidates.map((player) => (
              <div
                key={player.full_name}
                className="rounded-lg p-4"
                style={{ backgroundColor: '#09090b', border: '1px solid #27272a' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
                      {player.full_name}
                    </p>
                    <p className="text-xs" style={{ color: '#71717a' }}>
                      {player.team_abbr || '—'} · {player.position || '—'}
                    </p>
                  </div>
                  <span className="text-lg font-bold tabular-nums" style={{ color: '#ef4444' }}>
                    {player.z_total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: '#71717a' }}>
                  Low z_total ({player.z_total.toFixed(2)}) — consider replacing with a waiver wire target
                </p>
                <Link
                  href="/waiver-wire"
                  className="text-xs font-medium"
                  style={{ color: '#3b82f6' }}
                >
                  Find replacement →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
