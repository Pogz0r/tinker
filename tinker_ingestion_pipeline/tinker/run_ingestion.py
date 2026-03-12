"""
run_ingestion.py — Main entry point for the Tinker data ingestion pipeline.

This script orchestrates the full nightly data sync:
    1. Sync NBA teams (30 teams, very fast)
    2. Sync NBA players (all active players)
    3. Sync game schedule (all games this season)
    4. Sync player game logs (every box score this season)

Each step updates the sync_status table so the frontend can display
"Data last updated: 4:02 AM" and you can monitor for failures.

HOW TO RUN:
    Manually (for testing):
        python run_ingestion.py

    As a cron job (production):
        # Run every day at 4:00 AM ET
        0 4 * * * cd /path/to/tinker && python run_ingestion.py >> logs/ingestion.log 2>&1

    You can also run individual steps:
        python run_ingestion.py --step teams
        python run_ingestion.py --step players
        python run_ingestion.py --step schedule
        python run_ingestion.py --step gamelogs

TIMING:
    First run (full season):  ~10-15 minutes (mostly schedule + game logs)
    Nightly run (incremental): ~3-5 minutes (upserts skip existing data)
"""

import os
import sys
import time
import argparse
from datetime import datetime

from db import get_connection
from ingestion.teams import sync_teams
from ingestion.players import sync_players
from ingestion.schedule import sync_schedule
from ingestion.game_logs import sync_game_logs

# Load the NBA season from environment (e.g. "2025")
from dotenv import load_dotenv
load_dotenv()

NBA_SEASON_YEAR = os.getenv("NBA_SEASON", "2025")
# nba_api expects the format "2025-26"
NBA_SEASON = f"{NBA_SEASON_YEAR}-{str(int(NBA_SEASON_YEAR) + 1)[-2:]}"


def update_sync_status(conn, job_name, status, duration=None, error=None):
    """
    Update the sync_status table after a job runs.

    Args:
        conn:      Active database connection
        job_name:  Which job ran (e.g. 'nba_game_logs')
        status:    'success', 'failed', or 'running'
        duration:  How long the job took in seconds
        error:     Error message if the job failed
    """
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE sync_status
        SET last_run_at = NOW(),
            status = %s,
            duration_seconds = %s,
            error_message = %s
        WHERE job_name = %s
        """,
        (status, duration, error, job_name)
    )
    conn.commit()


def run_step(conn, step_name, job_db_name, func, *args):
    """
    Run a single ingestion step with timing and error handling.

    This wraps each step so that:
    - It prints clear start/end messages
    - It records how long it took
    - If it fails, the error gets logged to sync_status
      and the pipeline continues to the next step

    Args:
        conn:         Active database connection
        step_name:    Human-readable name for console output
        job_db_name:  The job_name value in sync_status table
        func:         The function to call
        *args:        Arguments to pass to the function
    """
    print(f"\n{'='*50}")
    print(f"  STEP: {step_name}")
    print(f"{'='*50}")

    update_sync_status(conn, job_db_name, "running")
    start = time.time()

    try:
        func(conn, *args)
        duration = time.time() - start
        update_sync_status(conn, job_db_name, "success", duration=duration)
        print(f"  Completed in {duration:.1f} seconds.")

    except Exception as e:
        duration = time.time() - start
        error_msg = str(e)
        update_sync_status(conn, job_db_name, "failed", duration=duration, error=error_msg)
        print(f"  FAILED after {duration:.1f}s: {error_msg}")
        # Don't re-raise — let the pipeline continue to the next step.
        # One failed step shouldn't block everything else.


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Tinker data ingestion pipeline")
    parser.add_argument(
        "--step",
        choices=["teams", "players", "schedule", "gamelogs", "all"],
        default="all",
        help="Run a specific step instead of the full pipeline"
    )
    args = parser.parse_args()

    print("=" * 60)
    print(f"  TINKER INGESTION PIPELINE")
    print(f"  Season: {NBA_SEASON}")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Get database connection
    conn = get_connection()
    pipeline_start = time.time()

    try:
        if args.step in ("all", "teams"):
            run_step(conn, "Sync NBA Teams", "schedule", sync_teams)

        if args.step in ("all", "players"):
            run_step(conn, "Sync NBA Players", "player_stats", sync_players, NBA_SEASON)

        if args.step in ("all", "schedule"):
            run_step(conn, "Sync Game Schedule", "schedule", sync_schedule, NBA_SEASON)

        if args.step in ("all", "gamelogs"):
            run_step(conn, "Sync Player Game Logs", "nba_game_logs", sync_game_logs, NBA_SEASON)

    finally:
        conn.close()

    total_time = time.time() - pipeline_start
    print(f"\n{'='*60}")
    print(f"  PIPELINE COMPLETE")
    print(f"  Total time: {total_time:.1f} seconds ({total_time/60:.1f} minutes)")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
