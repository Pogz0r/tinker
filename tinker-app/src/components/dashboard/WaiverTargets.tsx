'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MOCK_ROSTER_NAMES } from '@/lib/mock-data';

interface Player {
  full_name: string;
  team_abbr: string;
  position: string;
  z_total: number;
  z_blk?: number;
  z_fg_impact?: number;
  z_pts?: number;
  z_reb?: number;
  z_ast?: number;
  z_stl?: number;
  z_threes?: number;
  z_ft_impact?: number;
  z_to?: number;
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 rounded animate-pulse w-32" style={{ backgroundColor: '#27272a' }} />
        <div className="h-3 rounded animate-pulse w-20" style={{ backgroundColor: '#27272a' }} />
      </div>
      <div className="h-5 rounded animate-pulse w-14" style={{ backgroundColor: '#27272a' }} />
    </div>
  );
}

export default function WaiverTargets() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players');
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const available = (json.players || []).filter(
          (p: Player) => !MOCK_ROSTER_NAMES.includes(p.full_name)
        );
        setPlayers(available.slice(0, 4));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  // Determine weak categories based on simple heuristic
  const weakCats = ['BLK', 'FG%'];

  function getHelpTag(player: Player): string | null {
    const blk = parseFloat(String(player.z_blk ?? 0));
    const fg = parseFloat(String(player.z_fg_impact ?? 0));
    if (blk > 0.5) return 'BLK';
    if (fg > 0.5) return 'FG%';
    return null;
  }

  return (
    <div
      className="rounded-lg flex flex-col"
      style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #27272a' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
          Waiver Targets
        </h3>
        <Link href="/waiver-wire" className="text-xs" style={{ color: '#3b82f6' }}>
          View all →
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}
        {error && !loading && (
          <div className="px-4 py-6 text-sm text-center" style={{ color: '#71717a' }}>
            Unable to load players
          </div>
        )}
        {!loading && !error && players.map((player, idx) => {
          const zTotal = parseFloat(String(player.z_total ?? 0));
          const helpTag = getHelpTag(player);
          const isPositive = zTotal > 0;

          return (
            <div
              key={player.full_name}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: idx < players.length - 1 ? '1px solid #1f1f23' : 'none' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: '#f4f4f5' }}>
                    {player.full_name}
                  </span>
                  {helpTag && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                      style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#eab308' }}
                    >
                      Fills: {helpTag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: '#71717a' }}>
                    {player.team_abbr ?? '—'} · {player.position ?? '—'}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: isPositive ? '#22c55e' : '#ef4444' }}
                >
                  {zTotal > 0 ? '+' : ''}{zTotal.toFixed(2)}
                </span>
                <p className="text-xs" style={{ color: '#52525b' }}>
                  z-total
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
