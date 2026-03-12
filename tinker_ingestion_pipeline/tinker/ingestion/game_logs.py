"""
ingestion/game_logs.py — Sync player box scores into the database.

This is the MOST IMPORTANT ingestion script. Every box score line for
every player this season gets stored in player_game_logs. This is the
raw data that your projection engine reads to calculate per-minute
production rates and weighted averages.

DATA SOURCE:
    playergamelogs endpoint — returns every box score for every player
    in the season in a single API call. Very efficient.

STRATEGY:
    On the first run, this pulls the entire season of game logs.
    On subsequent nightly runs, it upserts everything — new games
    get inserted, existing games get ignored (ON CONFLICT DO NOTHING).
    This is safe to run repeatedly.

DEPENDS ON:
    - nba_players must be populated (foreign key)
    - nba_games must be populated (foreign key)
"""

import time
from nba_api.stats.endpoints import playergamelogs


API_DELAY = 1.0

# How many rows to insert per database round-trip.
# Higher = faster, but uses more memory. 500 is a good balance.
BATCH_SIZE = 500


def sync_game_logs(conn, season):
    """
    Fetch all player game logs for the season and insert into database.

    Args:
        conn:   Active database connection
        season: NBA season string, e.g. "2025-26"
    """
    print("  Fetching player game logs for the season...")

    # Pull ALL player game logs in one call.
    logs = playergamelogs.PlayerGameLogs(
        season_nullable=season,
        season_type_nullable="Regular Season",
        timeout=120
    )
    time.sleep(API_DELAY)

    df = logs.get_data_frames()[0]
    print(f"  Retrieved {len(df)} game log entries.")

    if len(df) == 0:
        print("  No game logs found. Is the season correct?")
        return

    # Build lookup maps: NBA.com IDs → our database IDs
    cur = conn.cursor()

    cur.execute("SELECT id, nba_person_id FROM nba_players")
    player_map = {row[1]: row[0] for row in cur.fetchall()}

    cur.execute("SELECT id, nba_game_id FROM nba_games")
    game_map = {row[1]: row[0] for row in cur.fetchall()}

    # Prepare all rows first, then insert in batches
    rows_to_insert = []
    skipped = 0
    no_match = 0

    for _, row in df.iterrows():
        player_db_id = player_map.get(row["PLAYER_ID"])
        game_db_id = game_map.get(row["GAME_ID"])

        if not player_db_id or not game_db_id:
            no_match += 1
            continue

        # Parse minutes
        minutes_raw = row.get("MIN", 0)
        try:
            if isinstance(minutes_raw, str) and ":" in minutes_raw:
                parts = minutes_raw.split(":")
                minutes = float(parts[0]) + float(parts[1]) / 60.0
            else:
                minutes = float(minutes_raw) if minutes_raw else 0.0
        except (ValueError, TypeError):
            minutes = 0.0

        # Skip very short appearances (< 5 minutes)
        if minutes < 5.0:
            skipped += 1
            continue

        rows_to_insert.append((
            player_db_id,
            game_db_id,
            minutes,
            int(row.get("PTS", 0)),
            int(row.get("REB", 0)),
            int(row.get("AST", 0)),
            int(row.get("STL", 0)),
            int(row.get("BLK", 0)),
            int(row.get("FG3M", 0)),
            int(row.get("FGM", 0)),
            int(row.get("FGA", 0)),
            int(row.get("FTM", 0)),
            int(row.get("FTA", 0)),
            int(row.get("TOV", 0)),
        ))

    print(f"  Prepared {len(rows_to_insert)} rows for insert ({skipped} filtered <5min, {no_match} unmatched).")
    print(f"  Inserting in batches of {BATCH_SIZE}...")

    # Insert in batches instead of one at a time.
    # This turns 21,000 network round-trips into ~42.
    inserted = 0

    for i in range(0, len(rows_to_insert), BATCH_SIZE):
        batch = rows_to_insert[i:i + BATCH_SIZE]

        # Build a single INSERT with multiple value sets.
        # Example: INSERT INTO table VALUES (%s,%s,...), (%s,%s,...), (%s,%s,...)
        placeholders = ", ".join(
            ["(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"] * len(batch)
        )

        # Flatten the list of tuples into a single flat list of values
        flat_values = []
        for row_tuple in batch:
            flat_values.extend(row_tuple)

        query = f"""
            INSERT INTO player_game_logs
                (player_id, game_id, minutes, pts, reb, ast, stl, blk,
                 threes_made, fgm, fga, ftm, fta, turnovers)
            VALUES {placeholders}
            ON CONFLICT (player_id, game_id) DO NOTHING
        """

        cur.execute(query, flat_values)
        conn.commit()

        inserted += len(batch)
        print(f"    Batch {i // BATCH_SIZE + 1}: {inserted}/{len(rows_to_insert)} rows inserted")

    print(f"  Done. Inserted {inserted} game logs.")