import Link from 'next/link';
import { MOCK_STANDINGS } from '@/lib/mock-data';

export default function LeagueStandings() {
  const displayTeams = MOCK_STANDINGS.slice(0, 5);
  const userTeam = MOCK_STANDINGS.find((t) => t.team === 'Tinker Squad');
  const userRank = userTeam?.rank ?? 0;
  const showUserSeparate = userRank > 5;

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
          League Standings
        </h3>
        <Link href="/standings" className="text-xs" style={{ color: '#3b82f6' }}>
          Full Standings →
        </Link>
      </div>

      {/* Column headers */}
      <div
        className="grid px-4 py-2 text-xs"
        style={{
          gridTemplateColumns: '28px 1fr 80px',
          color: '#52525b',
          borderBottom: '1px solid #27272a',
        }}
      >
        <span>#</span>
        <span>Team</span>
        <span className="text-right">W-L-T</span>
      </div>

      {/* Rows */}
      <div className="flex-1">
        {displayTeams.map((team) => {
          const isUser = team.team === 'Tinker Squad';
          return (
            <div
              key={team.rank}
              className="grid px-4 py-2.5 text-sm items-center"
              style={{
                gridTemplateColumns: '28px 1fr 80px',
                borderLeft: isUser ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: isUser ? 'rgba(59,130,246,0.05)' : 'transparent',
                borderBottom: '1px solid #1f1f23',
              }}
            >
              <span className="tabular-nums text-xs" style={{ color: '#52525b' }}>
                {team.rank}
              </span>
              <span
                className="font-medium truncate"
                style={{ color: isUser ? '#f4f4f5' : '#a1a1aa' }}
              >
                {team.team}
                {isUser && (
                  <span className="ml-1.5 text-xs" style={{ color: '#3b82f6' }}>
                    ★
                  </span>
                )}
              </span>
              <span
                className="tabular-nums text-right text-xs"
                style={{ color: '#71717a' }}
              >
                {team.w}-{team.l}-{team.t}
              </span>
            </div>
          );
        })}

        {showUserSeparate && userTeam && (
          <>
            <div
              className="grid px-4 py-1 text-xs items-center"
              style={{ color: '#52525b', gridTemplateColumns: '28px 1fr 80px' }}
            >
              <span>·</span>
              <span>·</span>
              <span className="text-right">·</span>
            </div>
            <div
              className="grid px-4 py-2.5 text-sm items-center"
              style={{
                gridTemplateColumns: '28px 1fr 80px',
                borderLeft: '3px solid #3b82f6',
                backgroundColor: 'rgba(59,130,246,0.05)',
              }}
            >
              <span className="tabular-nums text-xs" style={{ color: '#52525b' }}>
                {userTeam.rank}
              </span>
              <span className="font-medium" style={{ color: '#f4f4f5' }}>
                {userTeam.team}{' '}
                <span className="text-xs" style={{ color: '#3b82f6' }}>
                  ★
                </span>
              </span>
              <span className="tabular-nums text-right text-xs" style={{ color: '#71717a' }}>
                {userTeam.w}-{userTeam.l}-{userTeam.t}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
