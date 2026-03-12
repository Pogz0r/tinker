"""
ingestion/teams.py — Sync NBA teams into the database.

This is the simplest ingestion script and runs first because
every other table (players, games) has a foreign key to nba_teams.

DATA SOURCE:
    nba_api has a static list of all 30 NBA teams built in.
    No API call needed — it's hardcoded in the library.

STRATEGY:
    "Upsert" — INSERT each team, but if it already exists
    (matched by abbreviation), UPDATE the row instead.
    This means you can run this script repeatedly without
    creating duplicate rows.
"""

from nba_api.stats.static import teams as nba_teams_static


def sync_teams(conn):
    """
    Fetch all 30 NBA teams from nba_api and upsert them into the database.

    Args:
        conn: Active database connection (from db.get_connection())
    """
    print("  Fetching NBA teams...")

    # nba_api gives us a list of dictionaries like:
    # [{"id": 1610612747, "full_name": "Los Angeles Lakers", "abbreviation": "LAL",
    #   "nickname": "Lakers", "city": "Los Angeles", "state": "California",
    #   "year_founded": 1947}, ...]
    all_teams = nba_teams_static.get_teams()

    print(f"  Found {len(all_teams)} teams.")

    cur = conn.cursor()

    for team in all_teams:
        # Map nba_api's conference/division info.
        # nba_api's static data doesn't include conference/division directly,
        # so we'll set placeholders here and you can fill them in later,
        # or we can pull them from a different endpoint.
        #
        # For now, we store what we have — the key data (abbreviation, full_name)
        # is what the rest of the app actually needs.
        cur.execute(
            """
            INSERT INTO nba_teams (abbreviation, full_name, conference, division)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (abbreviation)
            DO UPDATE SET
                full_name  = EXCLUDED.full_name
            """,
            (
                team["abbreviation"],
                team["full_name"],
                "TBD",   # We'll enrich this later or from another endpoint
                "TBD",
            )
        )

    conn.commit()
    print(f"  ✓ Synced {len(all_teams)} teams.")
