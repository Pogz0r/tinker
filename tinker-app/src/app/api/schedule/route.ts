import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query(`
      SELECT
        g.game_date, g.home_team_id, g.away_team_id,
        ht.abbreviation as home_team, at.abbreviation as away_team,
        ht.full_name as home_name, at.full_name as away_name
      FROM nba_games g
      JOIN nba_teams ht ON ht.id = g.home_team_id
      JOIN nba_teams at ON at.id = g.away_team_id
      WHERE g.game_date >= CURRENT_DATE - INTERVAL '1 day'
        AND g.game_date <= CURRENT_DATE + INTERVAL '21 days'
      ORDER BY g.game_date
    `);
    return NextResponse.json({ games: rows });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule', details: String(error) },
      { status: 500 }
    );
  }
}
