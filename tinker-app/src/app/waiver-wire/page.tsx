'use client';

import { useState, useEffect } from 'react';
import { MOCK_ROSTER_NAMES } from '@/lib/mock-data';

const POSITIONS = ['All', 'PG', 'SG', 'SF', 'PF', 'C'];
const SORT_OPTIONS = [
  { key: 'z_total', label: 'Z-Total' },
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

const WEAK_CATS = ['BLK', 'FG%']; // User's weak categories (from insight)

interface Player {
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
}

function zCellBg(val: number): string {
  if (val > 0.5) return 'rgba(20,83,45,0.25)';
  if (val < -0.5) return 'rgba(127,29,29,0.25)';
  if (val < 0) return 'rgba(146,64,14,0.15)';
  return 'transparent';
}

function zCellColor(val: number): string {
  if (val > 0.5) return '#22c55e';
  if (val < -0.5) return '#ef4444';
  if (val < 0) return '#eab308';
  return '#a1a1aa';
}

function getFillTags(player: Player): string[] {
  const tags: string[] = [];
  if (player.z_blk > 0.5 && WEAK_CATS.includes('BLK')) tags.push('BLK');
  if (player.z_fg_impact > 0.5 && WEAK_CATS.includes('FG%')) tags.push('FG%');
  if (player.z_stl > 0.5 && WEAK_CATS.includes('STL')) tags.push('STL');
  return tags;
}

export default function WaiverWirePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [posFilter, setPosFilter] = useState('All');
  const [sortKey, setSortKey] = useState('z_total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players');
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const available = (json.players || [])
          .filter((p: Player) => !MOCK_ROSTER_NAMES.includes(p.full_name))
          .map((p: any) => ({
            ...p,
            z_total: parseFloat(p.z_total ?? '0'),
            z_pts: parseFloat(p.z_pts ?? '0'),
            z_reb: parseFloat(p.z_reb ?? '0'),
            z_ast: parseFloat(p.z_ast ?? '0'),
            z_stl: parseFloat(p.z_stl ?? '0'),
            z_blk: parseFloat(p.z_blk ?? '0'),
            z_threes: parseFloat(p.z_threes ?? '0'),
            z_fg_impact: parseFloat(p.z_fg_impact ?? '0'),
            z_ft_impact: parseFloat(p.z_ft_impact ?? '0'),
            z_to: parseFloat(p.z_to ?? '0'),
          }));
        setPlayers(available);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = players
    .filter((p) => posFilter === 'All' || (p.position && p.position.includes(posFilter)))
    .sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? 0;
      const bVal = (b as any)[sortKey] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const headers = [
    { key: 'rank', label: '#' },
    { key: 'full_name', label: 'Player' },
    { key: 'team_abbr', label: 'Team' },
    { key: 'position', label: 'Pos' },
    { key: 'z_total', label: 'Z-Total' },
    { key: 'z_pts', label: 'z_pts' },
    { key: 'z_reb', label: 'z_reb' },
    { key: 'z_ast', label: 'z_ast' },
    { key: 'z_stl', label: 'z_stl' },
    { key: 'z_blk', label: 'z_blk' },
    { key: 'z_threes', label: 'z_3pm' },
    { key: 'z_fg_impact', label: 'z_fg' },
    { key: 'z_ft_impact', label: 'z_ft' },
    { key: 'z_to', label: 'z_to' },
    { key: 'fills', label: 'Fills' },
  ];

  const nonSortable = new Set(['rank', 'full_name', 'team_abbr', 'position', 'fills']);

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#f4f4f5' }}>Waiver Wire</h1>
        <p className="text-sm mt-0.5" style={{ color: '#71717a' }}>
          Available players ranked by z-score
        </p>
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-4 mb-5 p-3 rounded-lg"
        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
      >
        {/* Position pills */}
        <div className="flex gap-1">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: posFilter === pos ? '#3b82f6' : '#27272a',
                color: posFilter === pos ? '#fff' : '#71717a',
              }}
            >
              {pos}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#27272a' }} />

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#71717a' }}>Sort by:</span>
          <select
            value={sortKey}
            onChange={(e) => handleSort(e.target.value)}
            className="text-xs px-2 py-1 rounded outline-none"
            style={{ backgroundColor: '#27272a', color: '#f4f4f5', border: '1px solid #3f3f46' }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs" style={{ color: '#52525b' }}>
          {filtered.length} players available
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {headers.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => !nonSortable.has(key) && handleSort(key)}
                    className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                    style={{
                      color: sortKey === key ? '#f4f4f5' : '#52525b',
                      cursor: nonSortable.has(key) ? 'default' : 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {label}
                    {sortKey === key && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1f1f23' }}>
                    {headers.map((h) => (
                      <td key={h.key} className="px-3 py-3">
                        <div className="h-3 rounded animate-pulse" style={{ backgroundColor: '#27272a', width: '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!loading && filtered.map((player, idx) => {
                const fills = getFillTags(player);
                return (
                  <tr
                    key={player.full_name}
                    style={{ borderBottom: '1px solid #1f1f23' }}
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#52525b' }}>{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: '#f4f4f5' }}>
                      {player.full_name}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: '#71717a' }}>{player.team_abbr || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: '#71717a' }}>{player.position || '—'}</td>
                    <td
                      className="px-3 py-2.5 font-semibold tabular-nums"
                      style={{ color: player.z_total >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {player.z_total >= 0 ? '+' : ''}{player.z_total.toFixed(2)}
                    </td>
                    {(['z_pts', 'z_reb', 'z_ast', 'z_stl', 'z_blk', 'z_threes', 'z_fg_impact', 'z_ft_impact', 'z_to'] as const).map((cat) => {
                      const val = player[cat] ?? 0;
                      return (
                        <td
                          key={cat}
                          className="px-3 py-2.5 tabular-nums text-right"
                          style={{ backgroundColor: zCellBg(val), color: zCellColor(val) }}
                        >
                          {val >= 0 ? '+' : ''}{val.toFixed(2)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {fills.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#eab308' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
