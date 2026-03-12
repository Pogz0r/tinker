import { MOCK_STANDINGS } from '@/lib/mock-data';

export const metadata = {
  title: 'Standings — Tinker',
};

const FULL_STANDINGS = [
  { rank: 1, team: 'The Dynasty', manager: 'Alex K.', w: 14, l: 3, t: 1, pts: 98.4, reb: 91.2, ast: 88.6, stl: 82.0, blk: 79.4, threes: 86.2, fg: 72.0, ft: 68.8, to: 61.4 },
  { rank: 2, team: "Bron's Army", manager: 'Marcus T.', w: 13, l: 4, t: 1, pts: 95.8, reb: 88.4, ast: 92.0, stl: 74.6, blk: 68.2, threes: 80.4, fg: 78.6, ft: 72.2, to: 58.8 },
  { rank: 3, team: 'Tinker Squad', manager: 'You', w: 12, l: 5, t: 1, pts: 91.2, reb: 84.6, ast: 86.4, stl: 78.8, blk: 64.0, threes: 84.0, fg: 68.4, ft: 74.6, to: 63.2 },
  { rank: 4, team: "Ball Don't Lie", manager: 'Jordan M.', w: 11, l: 6, t: 1, pts: 88.4, reb: 86.2, ast: 80.0, stl: 72.4, blk: 74.8, threes: 76.6, fg: 74.2, ft: 70.0, to: 66.4 },
  { rank: 5, team: 'KD Forever', manager: 'Chris P.', w: 10, l: 7, t: 1, pts: 86.2, reb: 80.8, ast: 84.2, stl: 68.6, blk: 70.4, threes: 72.0, fg: 76.8, ft: 66.4, to: 70.0 },
  { rank: 6, team: 'Splash Bros', manager: 'Tyler W.', w: 9, l: 8, t: 1, pts: 84.0, reb: 78.4, ast: 76.8, stl: 66.2, blk: 66.0, threes: 90.4, fg: 70.0, ft: 76.8, to: 72.6 },
  { rank: 7, team: 'Triple Double', manager: 'Sam R.', w: 8, l: 9, t: 1, pts: 82.6, reb: 82.0, ast: 88.8, stl: 62.0, blk: 58.4, threes: 68.4, fg: 66.6, ft: 62.0, to: 74.0 },
  { rank: 8, team: 'Buckets Only', manager: 'Lisa H.', w: 7, l: 10, t: 1, pts: 80.4, reb: 76.0, ast: 72.4, stl: 70.8, blk: 62.0, threes: 64.2, fg: 80.4, ft: 78.4, to: 68.2 },
  { rank: 9, team: 'Rim Rockers', manager: 'Dave N.', w: 6, l: 11, t: 1, pts: 78.2, reb: 88.6, ast: 66.0, stl: 64.4, blk: 82.0, threes: 58.6, fg: 72.4, ft: 64.8, to: 76.4 },
  { rank: 10, team: 'Fast Break FC', manager: 'Emma L.', w: 5, l: 12, t: 1, pts: 76.0, reb: 72.4, ast: 70.6, stl: 58.2, blk: 54.6, threes: 60.0, fg: 64.8, ft: 80.2, to: 78.8 },
  { rank: 11, team: 'Anklebreakers', manager: 'Mike O.', w: 4, l: 13, t: 1, pts: 72.4, reb: 68.8, ast: 64.4, stl: 54.0, blk: 50.2, threes: 54.4, fg: 60.2, ft: 58.4, to: 82.0 },
  { rank: 12, team: 'Bench Warmers', manager: 'Nina C.', w: 3, l: 14, t: 1, pts: 68.8, reb: 64.2, ast: 58.8, stl: 50.4, blk: 46.0, threes: 50.8, fg: 58.4, ft: 54.6, to: 86.4 },
];

export default function StandingsPage() {
  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#f4f4f5' }}>Standings</h1>
        <p className="text-sm mt-0.5" style={{ color: '#71717a' }}>
          Tinker League · 12 teams · H2H 9-CAT · Week 18
        </p>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {[
                  { label: '#', width: '32px' },
                  { label: 'Team', width: '160px' },
                  { label: 'Manager', width: '100px' },
                  { label: 'W', width: '40px' },
                  { label: 'L', width: '40px' },
                  { label: 'T', width: '40px' },
                  { label: 'Win%', width: '60px' },
                  { label: 'PTS', width: '60px' },
                  { label: 'REB', width: '60px' },
                  { label: 'AST', width: '60px' },
                  { label: 'STL', width: '60px' },
                  { label: 'BLK', width: '60px' },
                  { label: '3PM', width: '60px' },
                  { label: 'FG%', width: '60px' },
                  { label: 'FT%', width: '60px' },
                  { label: 'TO', width: '60px' },
                ].map(({ label, width }) => (
                  <th
                    key={label}
                    className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                    style={{ color: '#52525b', minWidth: width }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FULL_STANDINGS.map((team) => {
                const isUser = team.team === 'Tinker Squad';
                const winPct = ((team.w + team.t * 0.5) / (team.w + team.l + team.t)).toFixed(3);
                return (
                  <tr
                    key={team.rank}
                    style={{
                      borderBottom: '1px solid #1f1f23',
                      borderLeft: isUser ? '3px solid #3b82f6' : '3px solid transparent',
                      backgroundColor: isUser ? 'rgba(59,130,246,0.04)' : 'transparent',
                    }}
                    className="hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#52525b' }}>
                      {team.rank}
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: isUser ? '#f4f4f5' : '#a1a1aa' }}>
                      {team.team}
                      {isUser && <span className="ml-1.5 text-xs" style={{ color: '#3b82f6' }}>★</span>}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: '#71717a' }}>{team.manager}</td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: '#22c55e' }}>{team.w}</td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: '#ef4444' }}>{team.l}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#71717a' }}>{team.t}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{winPct}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.pts.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.reb.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.ast.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.stl.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.blk.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.threes.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.fg.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.ft.toFixed(1)}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: '#a1a1aa' }}>{team.to.toFixed(1)}</td>
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
