"""
ingestion/schedule.py — Sync the NBA game schedule into the database.

Pulls every game for the current season (past and future) and upserts
into nba_games. This gives Tinker two things:
    1. Historical games — needed to join with player_game_logs
    2. Future games — needed to calculate "remaining games this week"

DATA SOURCE:
    leaguegamefinder endpoint from nba_api.
    We pull all games for the season in one call per team,
    which is more reliable than trying to get a full season schedule.

STRATEGY:
    Pull the full season once, then on nightly runs only
    update the is_completed flag for newly finished games.

DEPENDS ON:
    nba_teams must be populated first.
"""

import time
from datetime import datetime
from nba_api.stats.endpoints import leaguegamefinder


API_DELAY = 1.0


def sync_schedule(conn, season):
    """
    Fetch all games for the season and upsert into nba_games.

    Args:
        conn:   Active database connection
        season: NBA season string, e.g. "2025-26"
    """
    print("  Fetching season schedule...")

    # Build lookup: NBA.com team ID → our database team ID
    cur = conn.cursor()
    cur.execute("SELECT id, abbreviation FROM nba_teams")
    db_teams = {row[1]: row[0] for row in cur.fetchall()}

    from nba_api.stats.static import teams as nba_teams_static
    abbr_to_nba_id = {t["abbreviation"]: t["id"] for t in nba_teams_static.get_teams()}

    # We'll collect all unique games across all teams.
    # Each game appears twice in the API (once per team), so we deduplicate.
    all_games = {}  # nba_game_id → game info dict

    for abbr, our_team_id in db_teams.items():
        nba_team_id = abbr_to_nba_id.get(abbr)
        if not nba_team_id:
            continue

        try:
            finder = leaguegamefinder.LeagueGameFinder(
                team_id_nullable=nba_team_id,
                season_nullable=season,
                season_type_nullable="Regular Season",
                timeout=60
            )
            time.sleep(API_DELAY)

            df = finder.get_data_frames()[0]

            for _, row in df.iterrows():
                game_id = row["GAME_ID"]

                if game_id in all_games:
                    # Already seen this game from the other team's perspective
                    continue

                # Parse the matchup string to figure out home vs away.
                # Format: "LAL vs. BOS" (LAL is home) or "LAL @ BOS" (LAL is away)
                matchup = row["MATCHUP"]
                game_date = row["GAME_DATE"]

                if " vs. " in matchup:
                    # This team is HOME
                    home_abbr = matchup.split(" vs. ")[0].strip()
                    away_abbr = matchup.split(" vs. ")[1].strip()
                elif " @ " in matchup:
                    # This team is AWAY
                    away_abbr = matchup.split(" @ ")[0].strip()
                    home_abbr = matchup.split(" @ ")[1].strip()
                else:
                    continue  # Unexpected format, skip

                home_id = db_teams.get(home_abbr)
                away_id = db_teams.get(away_abbr)

                if not home_id or not away_id:
                    continue

                # Determine if the game is completed.
                # If the game date is before today, it's completed.
                game_dt = datetime.strptime(game_date, "%Y-%m-%d").date()
                is_completed = game_dt < datetime.now().date()

                all_games[game_id] = {
                    "nba_game_id": game_id,
                    "home_team_id": home_id,
                    "away_team_id": away_id,
                    "game_date": game_date,
                    "is_completed": is_completed,
                }

        except Exception as e:
            print(f"    Warning: Failed to fetch schedule for {abbr}: {e}")
            time.sleep(API_DELAY * 2)

    print(f"  Found {len(all_games)} unique games.")

    # Parse the season year for storage.
    # "2025-26" → 2025
    season_year = int(season.split("-")[0])

    # Upsert all games
    for game in all_games.values():
        cur.execute(
            """
            INSERT INTO nba_games
                (nba_game_id, home_team_id, away_team_id, game_date, season, is_completed)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (nba_game_id)
            DO UPDATE SET
                is_completed = EXCLUDED.is_completed
            """,
            (
                game["nba_game_id"],
                game["home_team_id"],
                game["away_team_id"],
                game["game_date"],
                season_year,
                game["is_completed"],
            )
        )

    conn.commit()

    # Count completed vs upcoming
    completed = sum(1 for g in all_games.values() if g["is_completed"])
    upcoming = len(all_games) - completed
    print(f"  ✓ Synced {len(all_games)} games ({completed} completed, {upcoming} upcoming).")
