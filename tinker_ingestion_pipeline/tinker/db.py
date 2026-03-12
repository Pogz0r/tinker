"""
db.py — Database connection helper for Tinker.

Uses pg8000 (pure Python) instead of psycopg2 to avoid C compilation
issues on Windows. Uses individual connection parameters instead of
a URL to avoid Python 3.14 urlparse strictness.
"""

import os
import pg8000
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "postgres")

if not DB_HOST or not DB_PASSWORD:
    raise RuntimeError(
        "Database credentials not set. "
        "Copy .env.example to .env and fill in your Supabase credentials."
    )


def get_connection():
    """
    Open and return a new database connection.

    Returns:
        pg8000 connection object
    """
    conn = pg8000.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        ssl_context=True,
    )

    return conn