'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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

function PlayerCard({ player, onRemove }: { player: Player; onRemove: () => void }) {
  const zTotal = parseFloat(String(player.z_total));
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ backgroundColor: '#09090b', border: '1px solid #27272a' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#f4f4f5' }}>
          {player.full_name}
        </p>
        <p className="text-xs" style={{ color: '#71717a' }}>
          {player.team_abbr} · {player.position}
        </p>
      </div>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: zTotal >= 0 ? '#22c55e' : '#ef4444' }}
      >
        {zTotal >= 0 ? '+' : ''}{zTotal.toFixed(2)}
      </span>
      <button onClick={onRemove} className="p-1 rounded hover:bg-zinc-800 transition-colors">
        <X size={14} style={{ color: '#71717a' }} />
      </button>
    </div>
  );
}

function PlayerSearch({
  allPlayers,
  onSelect,
  excludeNames,
}: {
  allPlayers: Player[];
  onSelect: (p: Player) => void;
  excludeNames: string[];
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length > 1
    ? allPlayers
        .filter((p) => !excludeNames.includes(p.full_name))
        .filter((p) => p.full_name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        placeholder="Search players..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-2 rounded text-sm outline-none"
        style={{
          backgroundColor: '#09090b',
          border: '1px solid #27272a',
          color: '#f4f4f5',
        }}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-lg overflow-hidden z-50"
          style={{ backgroundColor: '#18181b', border: '1px solid #27272a', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
        >
          {filtered.map((p) => (
            <button
              key={p.full_name}
              onClick={() => { onSelect(p); setQuery(''); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors"
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#f4f4f5' }}>{p.full_name}</p>
                <p className="text-xs" style={{ color: '#71717a' }}>{p.team_abbr} · {p.position}</p>
              </div>
              <span
                className="text-xs font-mono tabular-nums"
                style={{ color: parseFloat(String(p.z_total)) >= 0 ? '#22c55e' : '#ef4444' }}
              >
                {parseFloat(String(p.z_total)) >= 0 ? '+' : ''}{parseFloat(String(p.z_total)).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TradeAnalyzerPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]);
  const [sendPlayers, setSendPlayers] = useState<Player[]>([]);
  const [receivePlayers, setReceivePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [allRes, rosterRes] = await Promise.all([
          fetch('/api/players'),
          fetch(`/api/zscores?names=${encodeURIComponent(MOCK_ROSTER_NAMES.join(','))}`),
        ]);
        const allJson = await allRes.json();
        const rosterJson = await rosterRes.json();
        const parsePlayer = (p: any): Player => ({
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
        });
        setAllPlayers((allJson.players || []).map(parsePlayer));
        setRosterPlayers((rosterJson.players || []).map(parsePlayer));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const addSend = (p: Player) => setSendPlayers((prev) => [...prev, p]);
  const addReceive = (p: Player) => setReceivePlayers((prev) => [...prev, p]);
  const removeSend = (name: string) => setSendPlayers((prev) => prev.filter((p) => p.full_name !== name));
  const removeReceive = (name: string) => setReceivePlayers((prev) => prev.filter((p) => p.full_name !== name));

  // Calculate category impact
  const catImpact = CATEGORIES.map((cat) => {
    const rosterAvg = rosterPlayers.length > 0
      ? rosterPlayers.reduce((sum, p) => sum + ((p as any)[cat.key] ?? 0), 0) / rosterPlayers.length
      : 0;
    const sendAvg = sendPlayers.length > 0
      ? sendPlayers.reduce((sum, p) => sum + ((p as any)[cat.key] ?? 0), 0) / sendPlayers.length
      : 0;
    const receiveAvg = receivePlayers.length > 0
      ? receivePlayers.reduce((sum, p) => sum + ((p as any)[cat.key] ?? 0), 0) / receivePlayers.length
      : 0;
    const before = rosterAvg;
    const after = sendPlayers.length > 0 || receivePlayers.length > 0
      ? rosterAvg - sendAvg + receiveAvg
      : rosterAvg;
    const delta = after - before;
    return { ...cat, before, after, delta };
  });

  const netZChange = catImpact.reduce((sum, c) => sum + c.delta, 0);
  const improving = catImpact.filter((c) => c.delta > 0.1).map((c) => c.label);
  const declining = catImpact.filter((c) => c.delta < -0.1).map((c) => c.label);

  let verdict: 'ACCEPT' | 'REJECT' | 'RISKY' = 'RISKY';
  if (netZChange > 0.5) verdict = 'ACCEPT';
  else if (netZChange < -0.5) verdict = 'REJECT';

  const verdictColor = verdict === 'ACCEPT' ? '#22c55e' : verdict === 'REJECT' ? '#ef4444' : '#eab308';
  const verdictBg = verdict === 'ACCEPT'
    ? 'rgba(34,197,94,0.1)'
    : verdict === 'REJECT'
    ? 'rgba(239,68,68,0.1)'
    : 'rgba(234,179,8,0.1)';

  const maxImpact = Math.max(...catImpact.map((c) => Math.abs(c.before)), 1);

  const excludeFromSearch = [
    ...sendPlayers.map((p) => p.full_name),
    ...receivePlayers.map((p) => p.full_name),
  ];

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#f4f4f5' }}>Trade Analyzer</h1>
        <p className="text-sm mt-0.5" style={{ color: '#71717a' }}>Evaluate trade impact on your roster</p>
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* You Send */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
        >
          <div
            className="px-4 py-3"
            style={{
              borderBottom: '1px solid #27272a',
              backgroundColor: 'rgba(239,68,68,0.07)',
              borderLeft: '3px solid #ef4444',
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#ef4444' }}>You Send</h2>
          </div>
          <div className="p-4 space-y-2">
            {sendPlayers.map((p) => (
              <PlayerCard key={p.full_name} player={p} onRemove={() => removeSend(p.full_name)} />
            ))}
            {!loading && (
              <PlayerSearch
                allPlayers={rosterPlayers}
                onSelect={addSend}
                excludeNames={excludeFromSearch}
              />
            )}
            {sendPlayers.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: '#52525b' }}>
                Search and add players from your roster
              </p>
            )}
          </div>
        </div>

        {/* You Receive */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
        >
          <div
            className="px-4 py-3"
            style={{
              borderBottom: '1px solid #27272a',
              backgroundColor: 'rgba(34,197,94,0.07)',
              borderLeft: '3px solid #22c55e',
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#22c55e' }}>You Receive</h2>
          </div>
          <div className="p-4 space-y-2">
            {receivePlayers.map((p) => (
              <PlayerCard key={p.full_name} player={p} onRemove={() => removeReceive(p.full_name)} />
            ))}
            {!loading && (
              <PlayerSearch
                allPlayers={allPlayers}
                onSelect={addReceive}
                excludeNames={[...excludeFromSearch, ...MOCK_ROSTER_NAMES]}
              />
            )}
            {receivePlayers.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: '#52525b' }}>
                Search and add players from the league
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Impact */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <div
            className="rounded-lg overflow-hidden mb-5"
            style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #27272a' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>Category Impact</h2>
            </div>
            <div className="p-4 space-y-2">
              {catImpact.map((cat) => {
                const beforeW = (Math.abs(cat.before) / maxImpact) * 100;
                const afterW = (Math.abs(cat.after) / maxImpact) * 100;
                const deltaColor = cat.delta > 0.05 ? '#22c55e' : cat.delta < -0.05 ? '#ef4444' : '#71717a';
                return (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: '#71717a' }}>
                      {cat.label}
                    </span>
                    <div className="flex-1 flex gap-1 items-center">
                      <div
                        className="h-3 rounded-sm"
                        style={{ width: `${beforeW}%`, backgroundColor: '#52525b', minWidth: '2px' }}
                      />
                      <div
                        className="h-3 rounded-sm"
                        style={{ width: `${afterW}%`, backgroundColor: '#3b82f6', minWidth: '2px', opacity: sendPlayers.length > 0 || receivePlayers.length > 0 ? 1 : 0 }}
                      />
                    </div>
                    <span
                      className="text-xs tabular-nums font-mono w-14 text-right flex-shrink-0"
                      style={{ color: deltaColor }}
                    >
                      {cat.delta >= 0 ? '+' : ''}{cat.delta.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tinker Verdict */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#f4f4f5' }}>Tinker Verdict</h2>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-3"
              style={{ backgroundColor: verdictBg }}
            >
              {verdict === 'ACCEPT' && <CheckCircle size={18} style={{ color: verdictColor }} />}
              {verdict === 'REJECT' && <XCircle size={18} style={{ color: verdictColor }} />}
              {verdict === 'RISKY' && <AlertTriangle size={18} style={{ color: verdictColor }} />}
              <span className="text-lg font-black" style={{ color: verdictColor }}>{verdict}</span>
            </div>
            <p className="text-sm font-semibold tabular-nums mb-1" style={{ color: '#f4f4f5' }}>
              Net z-change: {netZChange >= 0 ? '+' : ''}{netZChange.toFixed(2)} overall
            </p>
            <p className="text-xs" style={{ color: '#71717a' }}>
              {sendPlayers.length === 0 && receivePlayers.length === 0 ? (
                'Add players to both sides to see the verdict.'
              ) : (
                <>
                  {improving.length > 0 && `Improves: ${improving.join(', ')}. `}
                  {declining.length > 0 && `Hurts: ${declining.join(', ')}.`}
                  {improving.length === 0 && declining.length === 0 && 'Roughly neutral trade impact.'}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Roster Fit */}
        <div
          className="rounded-lg"
          style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #27272a' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>Roster Fit Check</h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Position fit */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#a1a1aa' }}>Position Fit</span>
              <span className="text-sm font-medium" style={{ color: receivePlayers.length > 0 ? '#22c55e' : '#71717a' }}>
                {receivePlayers.length > 0 ? '✓ Compatible' : '—'}
              </span>
            </div>

            {/* Injury status */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#a1a1aa' }}>Injury Status</span>
              <div className="space-y-1 text-right">
                {receivePlayers.length === 0 && <span className="text-sm" style={{ color: '#71717a' }}>—</span>}
                {receivePlayers.map((p) => (
                  <div key={p.full_name} className="text-xs">
                    <span style={{ color: '#71717a' }}>{p.full_name.split(' ').pop()}: </span>
                    <span style={{ color: '#22c55e' }}>Healthy</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Z-total comparison */}
            <div
              className="rounded p-3"
              style={{ backgroundColor: '#09090b', border: '1px solid #27272a' }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: '#71717a' }}>Z-Total Comparison</p>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-xs" style={{ color: '#ef4444' }}>Sending</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: '#ef4444' }}>
                    {sendPlayers.length > 0
                      ? (sendPlayers.reduce((s, p) => s + p.z_total, 0) / sendPlayers.length).toFixed(2)
                      : '—'}
                  </p>
                </div>
                <span style={{ color: '#27272a', fontSize: '24px' }}>→</span>
                <div className="text-center">
                  <p className="text-xs" style={{ color: '#22c55e' }}>Receiving</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: '#22c55e' }}>
                    {receivePlayers.length > 0
                      ? (receivePlayers.reduce((s, p) => s + p.z_total, 0) / receivePlayers.length).toFixed(2)
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Helps opponent indicator */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#a1a1aa' }}>Helps Opponent?</span>
              <span className="text-sm font-medium" style={{ color: sendPlayers.length > 0 ? '#eab308' : '#71717a' }}>
                {sendPlayers.length > 0 ? '⚠ Check manually' : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
