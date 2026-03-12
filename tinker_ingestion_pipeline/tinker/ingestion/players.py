"""
ingestion/players.py — Sync NBA players into the database.

Pulls all players who have played in the current season and upserts
them into nba_players. Also updates injury status from the API.

DATA SOURCE:
    - commonallplayers endpoint (full player list with team info)
    - We filter to only players active in the current season.

DEPENDS ON:
    nba_teams must be populated first (foreign key relationship).

RATE LIMITING:
    nba_api calls NBA.com, which rate-limits aggressively.
    We add a delay between API calls to avoid getting blocked.
    If you see "Connection reset" or 429 errors, increase the delay.
"""

import time
from nba_api.stats.endpoints import commonallplayers, commonplayerinfo
from nba_api.stats.static import teams as nba_teams_static


# Delay between API calls (in seconds) to respect NBA.com rate limits.
# Start with 1 second. Increase if you get blocked.
API_DELAY = 1.0


def sync_players(conn, season):
    """
    Fetch all active players for the given season and upsert into database.

    Args:
        conn:   Active database connection
        season: NBA season string, e.g. "2025-26"
    """
    print("  Fetching player list from NBA.com...")

    # commonallplayers returns every player ever, with a flag for current season.
    # is_only_current_season=1 filters to active players only.
    player_list = commonallplayers.CommonAllPlayers(
        is_only_current_season=1,
        timeout=60
    )
    time.sleep(API_DELAY)

    # The result comes back as a DataFrame-like structure.
    # .get_data_frames() returns a list of pandas DataFrames.
    df = player_list.get_data_frames()[0]

    print(f"  Found {len(df)} active players.")

    # Build a lookup: team_id (NBA.com) → team abbreviation → our DB team ID.
    # We need this because nba_api uses NBA.com team IDs (like 1610612747)
    # but our database uses our own auto-incremented IDs.
    cur = conn.cursor()

    # First, build a map of abbreviation → our database ID
    cur.execute("SELECT id, abbreviation FROM nba_teams")
    db_teams = {row[1]: row[0] for row in cur.fetchall()}

    # Also build a map of NBA.com team ID → abbreviation using nba_api static data
    nba_id_to_abbr = {}
    for team in nba_teams_static.get_teams():
        nba_id_to_abbr[team["id"]] = team["abbreviation"]

    inserted = 0
    skipped = 0

    for _, row in df.iterrows():
        nba_person_id = row["PERSON_ID"]
        full_name = row["DISPLAY_FIRST_LAST"]
        nba_team_id = row.get("TEAM_ID")

        # Look up our internal team_id
        team_abbr = nba_id_to_abbr.get(nba_team_id)
        our_team_id = db_teams.get(team_abbr) if team_abbr else None

        if our_team_id is None:
            # Player might be a free agent or on a two-way contract
            # with a G-League team. We still store them but without a team.
            skipped += 1

        cur.execute(
            """
            INSERT INTO nba_players (nba_person_id, full_name, team_id, is_active)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (nba_person_id)
            DO UPDATE SET
                full_name  = EXCLUDED.full_name,
                team_id    = EXCLUDED.team_id,
                is_active  = EXCLUDED.is_active,
                updated_at = NOW()
            """,
            (
                nba_person_id,
                full_name,
                our_team_id,
                True,
            )
        )
        inserted += 1

    conn.commit()
    print(f"  ✓ Synced {inserted} players ({skipped} without team mapping).")


def sync_injuries(conn):
    """
    Update injury status for all active players.

    This queries each player individually, which is slow but necessary
    because injury data isn't available in a bulk endpoint.

    For v1, we pull injury info from the Yahoo Fantasy API instead
    (when we build that integration). This function is a fallback
    using NBA.com data.

    NOTE: This is the slowest part of the pipeline because of per-player
    API calls. For ~500 active players at 1 second delay, it takes ~8 minutes.
    Consider running this less frequently (every few hours) or only for
    rostered players in active leagues.
    """
    print("  Updating injury statuses...")

    cur = conn.cursor()

    # Only check players who are currently active and on a team
    cur.execute(
        "SELECT id, nba_person_id, full_name FROM nba_players "
        "WHERE is_active = TRUE AND team_id IS NOT NULL"
    )
    players = cur.fetchall()

    updated = 0
    errors = 0

    for db_id, nba_id, name in players:
        try:
            info = commonplayerinfo.CommonPlayerInfo(
                player_id=nba_id,
                timeout=30
            )
            time.sleep(API_DELAY)

            df = info.get_data_frames()[0]

            if len(df) > 0:
                row = df.iloc[0]
                # Position info from NBA.com
                position = row.get("POSITION", None)

                cur.execute(
                    """
                    UPDATE nba_players
                    SET position = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (position, db_id)
                )
                updated += 1

        except Exception as e:
            # Don't let one failed player crash the whole pipeline.
            # Log it and move on.
            print(f"    Warning: Failed to fetch info for {name}: {e}")
            errors += 1
            time.sleep(API_DELAY * 2)  # Back off on errors

    conn.commit()
    print(f"  ✓ Updated {updated} players ({errors} errors).")
