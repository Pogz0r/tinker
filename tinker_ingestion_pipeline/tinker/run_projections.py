"""
run_projections.py — Tinker Projection Engine

This is the brain of Tinker. It reads the raw game logs from the database
and produces three outputs:

    1. player_stats_agg   — Per-minute production rates across three time windows
                            (Last 5 games, Last 15 games, Full season)

    2. player_projections — The "Tinker Projection" for each player per game,
                            using the weighted formula:
                            35% Last 5 + 25% Last 15 + 40% Season

    3. player_zscores     — Standardized values across all 9 fantasy categories
                            so you can compare apples to oranges
                            (e.g. "is 15 points worth more than 6 rebounds?")

THE GOLDEN RULE:
    We project MINUTES first, then multiply by per-minute production.
    Stats are a byproduct of time on the court. A player who averages
    0.8 points per minute and plays 30 minutes will score ~24 points.

THE PERCENTAGE TRAP:
    FG% and FT% z-scores use volume-adjusted IMPACT, not raw percentages.
    A player shooting 8/10 helps your team's FG% more than one shooting 4/5,
    even though both shoot 80%. The impact formula captures this.

HOW TO RUN:
    python run_projections.py

    This should run AFTER the ingestion pipeline (run_ingestion.py).
    Designed to run nightly as part of the same cron job.
"""

import os
import sys
import time
import math
from datetime import datetime

from db import get_connection
from dotenv import load_dotenv

load_dotenv()


# =============================================================
# CONFIGURATION
# =============================================================

# Projection weights (must sum to 1.0)
WEIGHT_L5 = 0.35       # Last 5 games — captures current form
WEIGHT_L15 = 0.25      # Last 15 games — captures recent trend
WEIGHT_SEASON = 0.40   # Full season — baseline safety net

# Minimum minutes to include a game log (filters out garbage time / injuries)
MIN_MINUTES = 5.0

# Minimum games played to be included in projections.
# Players with fewer games have unreliable per-minute rates.
MIN_GAMES_SEASON = 5

# Minimum minutes per game average to be included in the z-score player pool.
# Bench warmers would skew the league averages and standard deviations.
MIN_MPG_FOR_ZSCORE = 20.0

# The 9 standard fantasy basketball categories
COUNTING_CATS = ["pts", "reb", "ast", "stl", "blk", "threes"]
PERCENTAGE_CATS = ["fg", "ft"]    # These need special volume-adjusted treatment
NEGATIVE_CATS = ["to"]            # More turnovers = worse


# =============================================================
# STEP 1: AGGREGATE PER-MINUTE PRODUCTION
# =============================================================

def compute_stats_agg(conn):
    """
    Calculate per-minute production rates for every player across
    three time windows: Last 5 games, Last 15 games, and Full Season.

    This reads player_game_logs (joined with nba_games for date ordering)
    and writes to player_stats_agg.

    WHAT "PER-MINUTE PRODUCTION" MEANS:
        If a player scored 24 points in 30 minutes, their PPM for points
        is 24/30 = 0.80. We calculate this for every stat category.

    WHY PER-MINUTE:
        Because minutes fluctuate game to game (blowouts, foul trouble,
        rest days). Per-minute rates are more stable and let us project
        stats by multiplying: projected_minutes × per_minute_rate.
    """
    print("\n  STEP 1: Computing per-minute production rates...")

    cur = conn.cursor()

    # Pull all game logs ordered by date (most recent first) for each player.
    # We join with nba_games to get the game_date for ordering.
    cur.execute("""
        SELECT
            pgl.player_id,
            pgl.minutes,
            pgl.pts, pgl.reb, pgl.ast, pgl.stl, pgl.blk,
            pgl.threes_made, pgl.fgm, pgl.fga, pgl.ftm, pgl.fta,
            pgl.turnovers,
            g.game_date
        FROM player_game_logs pgl
        JOIN nba_games g ON g.id = pgl.game_id
        WHERE pgl.minutes >= %s
        ORDER BY pgl.player_id, g.game_date DESC
    """, (MIN_MINUTES,))

    rows = cur.fetchall()
    print(f"  Loaded {len(rows)} qualified game logs.")

    # Group game logs by player
    # Each player gets a list of their games, already sorted most-recent-first.
    player_logs = {}
    for row in rows:
        player_id = row[0]
        if player_id not in player_logs:
            player_logs[player_id] = []
        player_logs[player_id].append({
            "minutes": row[1],
            "pts": row[2],  "reb": row[3],  "ast": row[4],
            "stl": row[5],  "blk": row[6],  "threes": row[7],
            "fgm": row[8],  "fga": row[9],  "ftm": row[10],
            "fta": row[11], "to": row[12],
        })

    print(f"  Processing {len(player_logs)} players...")

    # Clear old aggregations and rebuild
    cur.execute("DELETE FROM player_stats_agg")
    conn.commit()

    count = 0

    for player_id, logs in player_logs.items():
        season_logs = logs                  # All games (already sorted recent-first)
        l15_logs = logs[:15]                # Most recent 15 games
        l5_logs = logs[:5]                  # Most recent 5 games

        gp_season = len(season_logs)
        gp_l15 = len(l15_logs)
        gp_l5 = len(l5_logs)

        # Skip players with too few games — their rates are unreliable
        if gp_season < MIN_GAMES_SEASON:
            continue

        # Calculate per-minute production for each time window.
        # PPM = total_stat / total_minutes across all games in the window.
        # Using totals (not averaging per-game PPM) is more accurate because
        # it naturally weights high-minute games more than low-minute ones.
        def calc_ppm(game_logs):
            total_min = sum(g["minutes"] for g in game_logs)
            if total_min == 0:
                return {cat: 0.0 for cat in
                        ["pts", "reb", "ast", "stl", "blk", "threes",
                         "fgm", "fga", "ftm", "fta", "to"]}
            return {
                "pts":    sum(g["pts"] for g in game_logs) / total_min,
                "reb":    sum(g["reb"] for g in game_logs) / total_min,
                "ast":    sum(g["ast"] for g in game_logs) / total_min,
                "stl":    sum(g["stl"] for g in game_logs) / total_min,
                "blk":    sum(g["blk"] for g in game_logs) / total_min,
                "threes": sum(g["threes"] for g in game_logs) / total_min,
                "fgm":    sum(g["fgm"] for g in game_logs) / total_min,
                "fga":    sum(g["fga"] for g in game_logs) / total_min,
                "ftm":    sum(g["ftm"] for g in game_logs) / total_min,
                "fta":    sum(g["fta"] for g in game_logs) / total_min,
                "to":     sum(g["to"] for g in game_logs) / total_min,
            }

        ppm_season = calc_ppm(season_logs)
        ppm_l15 = calc_ppm(l15_logs)
        ppm_l5 = calc_ppm(l5_logs)

        # Average minutes per game in each window
        avg_min_season = sum(g["minutes"] for g in season_logs) / gp_season
        avg_min_l15 = sum(g["minutes"] for g in l15_logs) / gp_l15
        avg_min_l5 = sum(g["minutes"] for g in l5_logs) / gp_l5

        cur.execute("""
            INSERT INTO player_stats_agg (
                player_id, gp_season, gp_l15, gp_l5,
                ppm_pts_season, ppm_reb_season, ppm_ast_season,
                ppm_stl_season, ppm_blk_season, ppm_threes_season,
                ppm_fgm_season, ppm_fga_season, ppm_ftm_season,
                ppm_fta_season, ppm_to_season,
                ppm_pts_l15, ppm_reb_l15, ppm_ast_l15,
                ppm_stl_l15, ppm_blk_l15, ppm_threes_l15,
                ppm_fgm_l15, ppm_fga_l15, ppm_ftm_l15,
                ppm_fta_l15, ppm_to_l15,
                ppm_pts_l5, ppm_reb_l5, ppm_ast_l5,
                ppm_stl_l5, ppm_blk_l5, ppm_threes_l5,
                ppm_fgm_l5, ppm_fga_l5, ppm_ftm_l5,
                ppm_fta_l5, ppm_to_l5,
                avg_min_season, avg_min_l15, avg_min_l5,
                updated_at
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s,
                NOW()
            )
        """, (
            player_id, gp_season, gp_l15, gp_l5,
            ppm_season["pts"], ppm_season["reb"], ppm_season["ast"],
            ppm_season["stl"], ppm_season["blk"], ppm_season["threes"],
            ppm_season["fgm"], ppm_season["fga"], ppm_season["ftm"],
            ppm_season["fta"], ppm_season["to"],
            ppm_l15["pts"], ppm_l15["reb"], ppm_l15["ast"],
            ppm_l15["stl"], ppm_l15["blk"], ppm_l15["threes"],
            ppm_l15["fgm"], ppm_l15["fga"], ppm_l15["ftm"],
            ppm_l15["fta"], ppm_l15["to"],
            ppm_l5["pts"], ppm_l5["reb"], ppm_l5["ast"],
            ppm_l5["stl"], ppm_l5["blk"], ppm_l5["threes"],
            ppm_l5["fgm"], ppm_l5["fga"], ppm_l5["ftm"],
            ppm_l5["fta"], ppm_l5["to"],
            avg_min_season, avg_min_l15, avg_min_l5,
        ))

        count += 1

    conn.commit()
    print(f"  Done. Computed stats for {count} players.")


# =============================================================
# STEP 2: GENERATE TINKER PROJECTIONS
# =============================================================

def compute_projections(conn):
    """
    Apply the Tinker weighted projection formula:

        projected_stat = projected_minutes × weighted_ppm

    Where:
        projected_minutes = (0.35 × avg_min_L5) + (0.25 × avg_min_L15) + (0.40 × avg_min_season)
        weighted_ppm      = (0.35 × ppm_L5)     + (0.25 × ppm_L15)     + (0.40 × ppm_season)

    This produces a PER-GAME projection. To get weekly totals,
    the frontend multiplies by remaining games this week (calculated dynamically).
    """
    print("\n  STEP 2: Generating Tinker projections...")

    cur = conn.cursor()

    # Read all aggregated stats
    cur.execute("SELECT * FROM player_stats_agg")
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()

    print(f"  Processing {len(rows)} players...")

    # Clear old projections and rebuild
    cur.execute("DELETE FROM player_projections")
    conn.commit()

    count = 0

    for row in rows:
        # Convert row to dict for readability
        data = dict(zip(columns, row))
        player_id = data["player_id"]

        # Project minutes using the same weighted formula
        proj_minutes = (
            WEIGHT_L5 * data["avg_min_l5"] +
            WEIGHT_L15 * data["avg_min_l15"] +
            WEIGHT_SEASON * data["avg_min_season"]
        )

        # For each stat category, blend the per-minute rates then multiply by minutes.
        # projected_stat = proj_minutes × (weighted blend of PPM across windows)
        def project_stat(cat):
            weighted_ppm = (
                WEIGHT_L5 * data[f"ppm_{cat}_l5"] +
                WEIGHT_L15 * data[f"ppm_{cat}_l15"] +
                WEIGHT_SEASON * data[f"ppm_{cat}_season"]
            )
            return proj_minutes * weighted_ppm

        proj_pts = project_stat("pts")
        proj_reb = project_stat("reb")
        proj_ast = project_stat("ast")
        proj_stl = project_stat("stl")
        proj_blk = project_stat("blk")
        proj_threes = project_stat("threes")
        proj_fgm = project_stat("fgm")
        proj_fga = project_stat("fga")
        proj_ftm = project_stat("ftm")
        proj_fta = project_stat("fta")
        proj_to = project_stat("to")

        cur.execute("""
            INSERT INTO player_projections (
                player_id, proj_minutes,
                proj_pts, proj_reb, proj_ast, proj_stl, proj_blk,
                proj_threes, proj_fgm, proj_fga, proj_ftm, proj_fta,
                proj_to, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            )
        """, (
            player_id, proj_minutes,
            proj_pts, proj_reb, proj_ast, proj_stl, proj_blk,
            proj_threes, proj_fgm, proj_fga, proj_ftm, proj_fta,
            proj_to,
        ))

        count += 1

    conn.commit()
    print(f"  Done. Generated projections for {count} players.")


# =============================================================
# STEP 3: CALCULATE Z-SCORES
# =============================================================

def compute_zscores(conn):
    """
    Convert raw projections into Z-scores so different categories
    can be compared on the same scale.

    Z-score = (player_value - league_mean) / league_std_dev

    A Z-score of +2.0 means the player is 2 standard deviations
    above average in that category. A Z-score of -1.0 means they're
    1 standard deviation below average.

    THE PERCENTAGE TRAP:
        For FG% and FT%, we DON'T z-score the raw percentage.
        Instead we calculate each player's IMPACT on a team's
        overall percentage using the volume-adjusted formula:

        impact = (league_FGM + player_FGM) / (league_FGA + player_FGA) - (league_FGM / league_FGA)

        This correctly values a player shooting 8/10 more than 4/5,
        even though both shoot 80%.

    TURNOVERS:
        Z-scores are inverted (multiplied by -1) because fewer
        turnovers are better. A player with low turnovers gets
        a positive z-score.
    """
    print("\n  STEP 3: Calculating Z-scores...")

    cur = conn.cursor()

    # Pull all projections, but only for players with meaningful minutes.
    # Including bench warmers would skew the averages.
    cur.execute("""
        SELECT
            p.player_id,
            p.proj_minutes, p.proj_pts, p.proj_reb, p.proj_ast,
            p.proj_stl, p.proj_blk, p.proj_threes,
            p.proj_fgm, p.proj_fga, p.proj_ftm, p.proj_fta,
            p.proj_to
        FROM player_projections p
        WHERE p.proj_minutes >= %s
    """, (MIN_MPG_FOR_ZSCORE,))

    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()

    if len(rows) < 10:
        print("  Not enough qualified players to compute meaningful z-scores.")
        return

    # Convert to list of dicts for easier processing
    players = [dict(zip(columns, row)) for row in rows]
    print(f"  Computing z-scores for {len(players)} qualified players (>= {MIN_MPG_FOR_ZSCORE} mpg)...")

    # ----------------------------------------------------------
    # COUNTING STATS: Standard z-score
    # ----------------------------------------------------------
    # For each counting stat, calculate the league mean and std dev,
    # then z-score each player.

    counting_fields = {
        "pts": "proj_pts",
        "reb": "proj_reb",
        "ast": "proj_ast",
        "stl": "proj_stl",
        "blk": "proj_blk",
        "threes": "proj_threes",
    }

    # Calculate league means
    means = {}
    std_devs = {}

    for cat, field in counting_fields.items():
        values = [p[field] for p in players]
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = math.sqrt(variance) if variance > 0 else 1.0
        means[cat] = mean
        std_devs[cat] = std

    # Turnovers (negative category — lower is better)
    to_values = [p["proj_to"] for p in players]
    means["to"] = sum(to_values) / len(to_values)
    to_variance = sum((v - means["to"]) ** 2 for v in to_values) / len(to_values)
    std_devs["to"] = math.sqrt(to_variance) if to_variance > 0 else 1.0

    # ----------------------------------------------------------
    # PERCENTAGE STATS: Volume-adjusted impact
    # ----------------------------------------------------------
    # First calculate the league-wide totals (the "average team")
    league_fgm = sum(p["proj_fgm"] for p in players)
    league_fga = sum(p["proj_fga"] for p in players)
    league_ftm = sum(p["proj_ftm"] for p in players)
    league_fta = sum(p["proj_fta"] for p in players)

    # League-wide shooting percentages
    league_fg_pct = league_fgm / league_fga if league_fga > 0 else 0.45
    league_ft_pct = league_ftm / league_fta if league_fta > 0 else 0.77

    # Calculate each player's impact on team FG% and FT%
    fg_impacts = []
    ft_impacts = []

    for p in players:
        # FG% impact: how much does adding this player's makes/attempts
        # change the league-wide FG%?
        if league_fga + p["proj_fga"] > 0:
            fg_impact = (
                (league_fgm + p["proj_fgm"]) / (league_fga + p["proj_fga"])
                - league_fg_pct
            )
        else:
            fg_impact = 0.0

        # FT% impact: same logic
        if league_fta + p["proj_fta"] > 0:
            ft_impact = (
                (league_ftm + p["proj_ftm"]) / (league_fta + p["proj_fta"])
                - league_ft_pct
            )
        else:
            ft_impact = 0.0

        fg_impacts.append(fg_impact)
        ft_impacts.append(ft_impact)

    # Z-score the impacts
    fg_mean = sum(fg_impacts) / len(fg_impacts)
    fg_var = sum((v - fg_mean) ** 2 for v in fg_impacts) / len(fg_impacts)
    fg_std = math.sqrt(fg_var) if fg_var > 0 else 1.0

    ft_mean = sum(ft_impacts) / len(ft_impacts)
    ft_var = sum((v - ft_mean) ** 2 for v in ft_impacts) / len(ft_impacts)
    ft_std = math.sqrt(ft_var) if ft_var > 0 else 1.0

    # ----------------------------------------------------------
    # WRITE Z-SCORES TO DATABASE
    # ----------------------------------------------------------

    cur.execute("DELETE FROM player_zscores")
    conn.commit()

    count = 0

    for i, p in enumerate(players):
        # Counting stat z-scores
        z_pts = (p["proj_pts"] - means["pts"]) / std_devs["pts"]
        z_reb = (p["proj_reb"] - means["reb"]) / std_devs["reb"]
        z_ast = (p["proj_ast"] - means["ast"]) / std_devs["ast"]
        z_stl = (p["proj_stl"] - means["stl"]) / std_devs["stl"]
        z_blk = (p["proj_blk"] - means["blk"]) / std_devs["blk"]
        z_threes = (p["proj_threes"] - means["threes"]) / std_devs["threes"]

        # Percentage z-scores (volume-adjusted)
        z_fg_impact = (fg_impacts[i] - fg_mean) / fg_std
        z_ft_impact = (ft_impacts[i] - ft_mean) / ft_std

        # Turnovers: INVERT so fewer turnovers = higher (better) z-score
        z_to = -1.0 * (p["proj_to"] - means["to"]) / std_devs["to"]

        # Total z-score: sum of all categories
        z_total = z_pts + z_reb + z_ast + z_stl + z_blk + z_threes + z_fg_impact + z_ft_impact + z_to

        cur.execute("""
            INSERT INTO player_zscores (
                player_id, z_pts, z_reb, z_ast, z_stl, z_blk, z_threes,
                z_fg_impact, z_ft_impact, z_to, z_total, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            )
        """, (
            p["player_id"],
            round(z_pts, 4), round(z_reb, 4), round(z_ast, 4),
            round(z_stl, 4), round(z_blk, 4), round(z_threes, 4),
            round(z_fg_impact, 4), round(z_ft_impact, 4),
            round(z_to, 4), round(z_total, 4),
        ))

        count += 1

    conn.commit()
    print(f"  Done. Computed z-scores for {count} players.")


# =============================================================
# STEP 4: UPDATE SYNC STATUS
# =============================================================

def update_sync_status(conn, job_name, status, duration=None, error=None):
    cur = conn.cursor()
    cur.execute("""
        UPDATE sync_status
        SET last_run_at = NOW(),
            status = %s,
            duration_seconds = %s,
            error_message = %s
        WHERE job_name = %s
    """, (status, duration, error, job_name))
    conn.commit()


# =============================================================
# MAIN
# =============================================================

def main():
    print("=" * 60)
    print("  TINKER PROJECTION ENGINE")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    conn = get_connection()
    start = time.time()

    try:
        # Step 1: Aggregate per-minute production
        step_start = time.time()
        compute_stats_agg(conn)
        update_sync_status(conn, "player_stats", "success", time.time() - step_start)

        # Step 2: Generate projections
        step_start = time.time()
        compute_projections(conn)
        update_sync_status(conn, "projections", "success", time.time() - step_start)

        # Step 3: Calculate z-scores
        step_start = time.time()
        compute_zscores(conn)
        update_sync_status(conn, "zscores", "success", time.time() - step_start)

    except Exception as e:
        print(f"\n  FATAL ERROR: {e}")
        update_sync_status(conn, "projections", "failed", error=str(e))
        raise

    finally:
        conn.close()

    total = time.time() - start
    print(f"\n{'='*60}")
    print(f"  PROJECTION ENGINE COMPLETE")
    print(f"  Total time: {total:.1f} seconds")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
