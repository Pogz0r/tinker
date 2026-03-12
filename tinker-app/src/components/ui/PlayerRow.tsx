import ZScoreBadge from './ZScoreBadge';

interface Player {
  full_name: string;
  team_abbr?: string;
  position?: string;
  z_total?: number;
  z_pts?: number;
  z_reb?: number;
  z_ast?: number;
  z_stl?: number;
  z_blk?: number;
  z_threes?: number;
  z_fg_impact?: number;
  z_ft_impact?: number;
  z_to?: number;
}

interface PlayerRowProps {
  player: Player;
  rank?: number;
  showZScores?: boolean;
}

export default function PlayerRow({ player, rank, showZScores = false }: PlayerRowProps) {
  const zTotal = parseFloat(String(player.z_total ?? 0));

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-md"
      style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
    >
      {rank !== undefined && (
        <span className="text-sm tabular-nums w-6 text-right flex-shrink-0" style={{ color: '#52525b' }}>
          {rank}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#f4f4f5' }}>
          {player.full_name}
        </p>
        <p className="text-xs" style={{ color: '#71717a' }}>
          {player.team_abbr ?? '—'} · {player.position ?? '—'}
        </p>
      </div>
      {showZScores && (
        <div className="flex gap-2 items-center">
          <ZScoreBadge value={zTotal} size="sm" />
        </div>
      )}
    </div>
  );
}
