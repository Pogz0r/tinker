import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MOCK_ROSTER_NAMES } from '@/lib/mock-data';

const CATEGORY_LABELS: Record<string, string> = {
  z_pts: 'PTS',
  z_reb: 'REB',
  z_ast: 'AST',
  z_stl: 'STL',
  z_blk: 'BLK',
  z_threes: '3PM',
  z_fg_impact: 'FG%',
  z_ft_impact: 'FT%',
  z_to: 'TO',
};

export async function GET() {
  try {
    // Get roster player z-scores
    const rosterData = await query(
      `
      SELECT p.full_name, z.z_pts, z.z_reb, z.z_ast, z.z_stl, z.z_blk,
             z.z_threes, z.z_fg_impact, z.z_ft_impact, z.z_to, z.z_total
      FROM player_zscores z
      JOIN nba_players p ON p.id = z.player_id
      WHERE p.full_name = ANY($1)
      `,
      [MOCK_ROSTER_NAMES]
    );

    if (rosterData.length === 0) {
      return NextResponse.json({
        insight: 'Unable to load roster data from database.',
        type: 'Lineup Tip',
      });
    }

    // Calculate average z-score per category
    const categories = ['z_pts', 'z_reb', 'z_ast', 'z_stl', 'z_blk', 'z_threes', 'z_fg_impact', 'z_ft_impact'];
    const categoryAverages: Record<string, number> = {};

    for (const cat of categories) {
      const vals = rosterData
        .map((p: any) => parseFloat(p[cat] ?? '0'))
        .filter((v: number) => !isNaN(v));
      categoryAverages[cat] = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    }

    // Find 2 weakest categories
    const sorted = Object.entries(categoryAverages).sort((a, b) => a[1] - b[1]);
    const weakCats = sorted.slice(0, 2).map(([cat]) => cat);

    // Find top available waiver wire players in those weak categories (not on roster)
    const waiverPlayers = await query(
      `
      SELECT p.full_name, t.abbreviation as team_abbr,
             z.z_blk, z.z_fg_impact, z.z_ft_impact, z.z_threes, z.z_pts, z.z_reb, z.z_ast, z.z_stl,
             z.z_total,
             z.${weakCats[0]} as weak_cat_1,
             z.${weakCats[1]} as weak_cat_2
      FROM player_zscores z
      JOIN nba_players p ON p.id = z.player_id
      LEFT JOIN nba_teams t ON t.id = p.team_id
      WHERE p.full_name != ALL($1)
      ORDER BY (z.${weakCats[0]} + z.${weakCats[1]}) DESC
      LIMIT 3
      `,
      [MOCK_ROSTER_NAMES]
    );

    const cat1Label = CATEGORY_LABELS[weakCats[0]] || weakCats[0];
    const cat2Label = CATEGORY_LABELS[weakCats[1]] || weakCats[1];

    let insight = `Your team ranks below average in **${cat1Label}** and **${cat2Label}**.`;

    if (waiverPlayers.length > 0) {
      const topPlayer = waiverPlayers[0];
      const cat1Val = parseFloat(topPlayer.weak_cat_1).toFixed(2);
      const cat2Val = parseFloat(topPlayer.weak_cat_2).toFixed(2);
      insight += ` Consider streaming **${topPlayer.full_name}** (z_${cat1Label.toLowerCase()}: ${cat1Val > '0' ? '+' : ''}${cat1Val}, z_${cat2Label.toLowerCase()}: ${cat2Val > '0' ? '+' : ''}${cat2Val}) — available on waivers and strong in your weak spots.`;
    }

    return NextResponse.json({
      insight,
      type: 'Waiver Wire',
      weakCategories: [cat1Label, cat2Label],
      targetPlayers: waiverPlayers.map((p: any) => ({
        name: p.full_name,
        team: p.team_abbr,
        cat1Score: parseFloat(p.weak_cat_1).toFixed(2),
        cat2Score: parseFloat(p.weak_cat_2).toFixed(2),
        zTotal: parseFloat(p.z_total).toFixed(2),
      })),
    });
  } catch (error) {
    console.error('Error computing insight:', error);
    return NextResponse.json(
      { error: 'Failed to compute insight', details: String(error) },
      { status: 500 }
    );
  }
}
