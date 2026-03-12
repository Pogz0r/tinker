import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const namesParam = searchParams.get('names');

  try {
    if (namesParam) {
      const names = namesParam.split(',').map((n) => n.trim());
      const rows = await query(
        `
        SELECT
          p.id, p.full_name, p.position, t.abbreviation as team_abbr,
          z.z_total, z.z_pts, z.z_reb, z.z_ast, z.z_stl, z.z_blk,
          z.z_threes, z.z_fg_impact, z.z_ft_impact, z.z_to,
          proj.proj_pts, proj.proj_reb, proj.proj_ast, proj.proj_stl,
          proj.proj_blk, proj.proj_threes, proj.proj_minutes
        FROM player_zscores z
        JOIN nba_players p ON p.id = z.player_id
        LEFT JOIN nba_teams t ON t.id = p.team_id
        LEFT JOIN player_projections proj ON proj.player_id = z.player_id
        WHERE p.full_name = ANY($1)
        ORDER BY z.z_total DESC
        `,
        [names]
      );
      return NextResponse.json({ players: rows });
    } else {
      const rows = await query(`
        SELECT
          p.id, p.full_name, p.position, t.abbreviation as team_abbr,
          z.z_total, z.z_pts, z.z_reb, z.z_ast, z.z_stl, z.z_blk,
          z.z_threes, z.z_fg_impact, z.z_ft_impact, z.z_to,
          proj.proj_pts, proj.proj_reb, proj.proj_ast, proj.proj_stl,
          proj.proj_blk, proj.proj_threes, proj.proj_minutes
        FROM player_zscores z
        JOIN nba_players p ON p.id = z.player_id
        LEFT JOIN nba_teams t ON t.id = p.team_id
        LEFT JOIN player_projections proj ON proj.player_id = z.player_id
        ORDER BY z.z_total DESC
        LIMIT 279
      `);
      return NextResponse.json({ players: rows });
    }
  } catch (error) {
    console.error('Error fetching zscores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch z-scores', details: String(error) },
      { status: 500 }
    );
  }
}
