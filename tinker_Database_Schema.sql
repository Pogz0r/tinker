-- ============================================================
-- TINKER v1 — Fantasy Basketball AI Companion
-- Database Schema (PostgreSQL)
-- ============================================================
-- Three layers:
--   1. NBA Data Layer    — ingested nightly from nba_api
--   2. Analytics Layer   — computed by Tinker projection engine
--   3. Fantasy Layer     — pulled from Yahoo (and future platforms)
-- ============================================================

-- ============================================================
-- LAYER 1: NBA DATA
-- Source: nba_api nightly cron job
-- ============================================================

CREATE TABLE nba_teams (
    id              SERIAL PRIMARY KEY,
    abbreviation    VARCHAR(5)   NOT NULL UNIQUE,  -- e.g. 'LAL', 'BOS'
    full_name       VARCHAR(100) NOT NULL,          -- e.g. 'Los Angeles Lakers'
    conference      VARCHAR(10)  NOT NULL,          -- 'East' or 'West'
    division        VARCHAR(30)  NOT NULL           -- e.g. 'Pacific', 'Atlantic'
);

CREATE TABLE nba_players (
    id                  SERIAL PRIMARY KEY,
    nba_person_id       INTEGER      NOT NULL UNIQUE,  -- NBA.com player ID (used by nba_api)
    full_name           VARCHAR(150) NOT NULL,
    team_id             INTEGER      REFERENCES nba_teams(id) ON DELETE SET NULL,
    position            VARCHAR(20),                     -- NBA listed position: 'Guard', 'Forward-Center', etc.
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    injury_status       VARCHAR(20),                     -- 'OUT', 'DTD', 'IL', 'IL+', NULL if healthy
    injury_note         TEXT,                             -- e.g. 'Left ankle sprain'
    injury_updated_at   TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_team ON nba_players(team_id);
CREATE INDEX idx_players_active ON nba_players(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_players_nba_id ON nba_players(nba_person_id);

CREATE TABLE nba_games (
    id              SERIAL PRIMARY KEY,
    nba_game_id     VARCHAR(20)  NOT NULL UNIQUE,  -- NBA.com game ID, e.g. '0022400123'
    home_team_id    INTEGER      NOT NULL REFERENCES nba_teams(id),
    away_team_id    INTEGER      NOT NULL REFERENCES nba_teams(id),
    game_date       DATE         NOT NULL,
    season          INTEGER      NOT NULL,          -- e.g. 2025 for the 2025-26 season
    is_completed    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_games_date ON nba_games(game_date);
CREATE INDEX idx_games_home ON nba_games(home_team_id);
CREATE INDEX idx_games_away ON nba_games(away_team_id);
CREATE INDEX idx_games_season_date ON nba_games(season, game_date);

-- This is the most heavily queried raw table.
-- Every box score line for every player this season.
-- Stores counting stats only — percentages are derived, never stored.
CREATE TABLE player_game_logs (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES nba_players(id) ON DELETE CASCADE,
    game_id         INTEGER NOT NULL REFERENCES nba_games(id) ON DELETE CASCADE,
    minutes         REAL    NOT NULL DEFAULT 0,     -- raw minutes played (e.g. 34.5)
    pts             INTEGER NOT NULL DEFAULT 0,
    reb             INTEGER NOT NULL DEFAULT 0,
    ast             INTEGER NOT NULL DEFAULT 0,
    stl             INTEGER NOT NULL DEFAULT 0,
    blk             INTEGER NOT NULL DEFAULT 0,
    threes_made     INTEGER NOT NULL DEFAULT 0,
    fgm             INTEGER NOT NULL DEFAULT 0,     -- field goals made
    fga             INTEGER NOT NULL DEFAULT 0,     -- field goals attempted
    ftm             INTEGER NOT NULL DEFAULT 0,     -- free throws made
    fta             INTEGER NOT NULL DEFAULT 0,     -- free throws attempted
    turnovers       INTEGER NOT NULL DEFAULT 0,

    UNIQUE(player_id, game_id)
);

CREATE INDEX idx_gamelogs_player ON player_game_logs(player_id);
CREATE INDEX idx_gamelogs_game ON player_game_logs(game_id);
-- Composite index for the projection engine's most common query pattern:
-- "get all game logs for a player, ordered by date" (joined with nba_games)
CREATE INDEX idx_gamelogs_player_game ON player_game_logs(player_id, game_id);


-- ============================================================
-- LAYER 2: TINKER ANALYTICS
-- Computed by nightly cron job after NBA data ingestion
-- These tables are TRUNCATED and rebuilt each run
-- ============================================================

-- Intermediate step: per-minute production rates across time windows.
-- The projection engine reads this to apply the weighted formula.
-- Columns abbreviated here; in practice one set of ppm_ columns per category.
CREATE TABLE player_stats_agg (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER NOT NULL UNIQUE REFERENCES nba_players(id) ON DELETE CASCADE,

    -- Games played in each window (used for confidence/sample size checks)
    gp_season           INTEGER NOT NULL DEFAULT 0,
    gp_l15              INTEGER NOT NULL DEFAULT 0,
    gp_l5               INTEGER NOT NULL DEFAULT 0,

    -- Per-minute production: SEASON averages
    ppm_pts_season      REAL NOT NULL DEFAULT 0,
    ppm_reb_season      REAL NOT NULL DEFAULT 0,
    ppm_ast_season      REAL NOT NULL DEFAULT 0,
    ppm_stl_season      REAL NOT NULL DEFAULT 0,
    ppm_blk_season      REAL NOT NULL DEFAULT 0,
    ppm_threes_season   REAL NOT NULL DEFAULT 0,
    ppm_fgm_season      REAL NOT NULL DEFAULT 0,
    ppm_fga_season      REAL NOT NULL DEFAULT 0,
    ppm_ftm_season      REAL NOT NULL DEFAULT 0,
    ppm_fta_season      REAL NOT NULL DEFAULT 0,
    ppm_to_season       REAL NOT NULL DEFAULT 0,

    -- Per-minute production: LAST 15 GAMES
    ppm_pts_l15         REAL NOT NULL DEFAULT 0,
    ppm_reb_l15         REAL NOT NULL DEFAULT 0,
    ppm_ast_l15         REAL NOT NULL DEFAULT 0,
    ppm_stl_l15         REAL NOT NULL DEFAULT 0,
    ppm_blk_l15         REAL NOT NULL DEFAULT 0,
    ppm_threes_l15      REAL NOT NULL DEFAULT 0,
    ppm_fgm_l15         REAL NOT NULL DEFAULT 0,
    ppm_fga_l15         REAL NOT NULL DEFAULT 0,
    ppm_ftm_l15         REAL NOT NULL DEFAULT 0,
    ppm_fta_l15         REAL NOT NULL DEFAULT 0,
    ppm_to_l15          REAL NOT NULL DEFAULT 0,

    -- Per-minute production: LAST 5 GAMES
    ppm_pts_l5          REAL NOT NULL DEFAULT 0,
    ppm_reb_l5          REAL NOT NULL DEFAULT 0,
    ppm_ast_l5          REAL NOT NULL DEFAULT 0,
    ppm_stl_l5          REAL NOT NULL DEFAULT 0,
    ppm_blk_l5          REAL NOT NULL DEFAULT 0,
    ppm_threes_l5       REAL NOT NULL DEFAULT 0,
    ppm_fgm_l5          REAL NOT NULL DEFAULT 0,
    ppm_fga_l5          REAL NOT NULL DEFAULT 0,
    ppm_ftm_l5          REAL NOT NULL DEFAULT 0,
    ppm_fta_l5          REAL NOT NULL DEFAULT 0,
    ppm_to_l5           REAL NOT NULL DEFAULT 0,

    -- Average minutes per window (for minutes projection)
    avg_min_season      REAL NOT NULL DEFAULT 0,
    avg_min_l15         REAL NOT NULL DEFAULT 0,
    avg_min_l5          REAL NOT NULL DEFAULT 0,

    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Per-game projections using the Tinker weighted formula:
-- proj = projected_minutes * ((0.35 * ppm_l5) + (0.25 * ppm_l15) + (0.40 * ppm_season))
-- NO games_this_week here — that is calculated dynamically at query time.
CREATE TABLE player_projections (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL UNIQUE REFERENCES nba_players(id) ON DELETE CASCADE,

    proj_minutes    REAL NOT NULL DEFAULT 0,     -- weighted projected minutes per game
    proj_pts        REAL NOT NULL DEFAULT 0,
    proj_reb        REAL NOT NULL DEFAULT 0,
    proj_ast        REAL NOT NULL DEFAULT 0,
    proj_stl        REAL NOT NULL DEFAULT 0,
    proj_blk        REAL NOT NULL DEFAULT 0,
    proj_threes     REAL NOT NULL DEFAULT 0,
    proj_fgm        REAL NOT NULL DEFAULT 0,     -- needed for FG% impact calculation
    proj_fga        REAL NOT NULL DEFAULT 0,
    proj_ftm        REAL NOT NULL DEFAULT 0,     -- needed for FT% impact calculation
    proj_fta        REAL NOT NULL DEFAULT 0,
    proj_to         REAL NOT NULL DEFAULT 0,

    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Z-scores standardized against the relevant player pool.
-- FG% and FT% use volume-adjusted impact formula, NOT naive percentage z-scores.
-- Turnovers stored as negative (more TO = lower z_to).
CREATE TABLE player_zscores (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL UNIQUE REFERENCES nba_players(id) ON DELETE CASCADE,

    z_pts           REAL NOT NULL DEFAULT 0,
    z_reb           REAL NOT NULL DEFAULT 0,
    z_ast           REAL NOT NULL DEFAULT 0,
    z_stl           REAL NOT NULL DEFAULT 0,
    z_blk           REAL NOT NULL DEFAULT 0,
    z_threes        REAL NOT NULL DEFAULT 0,
    z_fg_impact     REAL NOT NULL DEFAULT 0,     -- volume-adjusted FG% impact z-score
    z_ft_impact     REAL NOT NULL DEFAULT 0,     -- volume-adjusted FT% impact z-score
    z_to            REAL NOT NULL DEFAULT 0,     -- negative: more turnovers = worse score

    z_total         REAL NOT NULL DEFAULT 0,     -- sum of all category z-scores

    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zscores_total ON player_zscores(z_total DESC);


-- ============================================================
-- LAYER 3: FANTASY PLATFORM DATA
-- Source: Yahoo Fantasy API (ESPN in future versions)
-- ============================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- One row per platform connection. A user can link Yahoo AND ESPN.
-- OAuth tokens are stored here, encrypted at rest in production.
CREATE TABLE user_platform_connections (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform            VARCHAR(20)  NOT NULL,       -- 'yahoo', 'espn', 'sleeper'
    access_token        TEXT         NOT NULL,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, platform)
);

CREATE INDEX idx_connections_user ON user_platform_connections(user_id);

CREATE TABLE fantasy_leagues (
    id                  SERIAL PRIMARY KEY,
    connection_id       INTEGER      NOT NULL REFERENCES user_platform_connections(id) ON DELETE CASCADE,
    platform_league_id  VARCHAR(100) NOT NULL,       -- e.g. Yahoo 'nba.l.12345' or ESPN league ID
    name                VARCHAR(200) NOT NULL,
    season              INTEGER      NOT NULL,        -- e.g. 2025
    num_teams           INTEGER      NOT NULL,
    league_type         VARCHAR(50)  NOT NULL DEFAULT 'head_to_head_each_category',
    current_week        INTEGER,
    week_start_date     DATE,                         -- start of current fantasy week
    week_end_date       DATE,                         -- end of current fantasy week (for dynamic game count)
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(connection_id, platform_league_id)
);

-- Stores which stat categories are active in the league.
-- Commissioners can customize: some leagues drop TO, add DD, OREB, etc.
CREATE TABLE league_categories (
    id              SERIAL PRIMARY KEY,
    league_id       INTEGER     NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
    category_name   VARCHAR(30) NOT NULL,       -- 'PTS', 'REB', 'AST', 'STL', 'BLK', '3PM', 'FG%', 'FT%', 'TO'
    is_negative     BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE for turnovers (winning = lower)
    display_order   INTEGER     NOT NULL DEFAULT 0,

    UNIQUE(league_id, category_name)
);

CREATE TABLE fantasy_teams (
    id                  SERIAL PRIMARY KEY,
    league_id           INTEGER      NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
    platform_team_id    VARCHAR(100) NOT NULL,       -- platform-specific team identifier
    team_name           VARCHAR(200) NOT NULL,
    manager_name        VARCHAR(150),
    is_user_team        BOOLEAN      NOT NULL DEFAULT FALSE,

    UNIQUE(league_id, platform_team_id)
);

CREATE INDEX idx_teams_league ON fantasy_teams(league_id);

-- Links fantasy teams to NBA players with positional context.
-- eligible_positions comes from the platform API (Yahoo/ESPN), NOT from nba_api.
CREATE TABLE roster_entries (
    id                  SERIAL PRIMARY KEY,
    team_id             INTEGER     NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    player_id           INTEGER     NOT NULL REFERENCES nba_players(id) ON DELETE CASCADE,
    roster_position     VARCHAR(10) NOT NULL,         -- current slot: 'PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'BN', 'IL', 'IL+'
    eligible_positions  VARCHAR(50),                   -- platform-assigned: 'PG,SG,SF' (comma-separated for v1)
    acquisition_type    VARCHAR(20),                   -- 'draft', 'add', 'trade'
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(team_id, player_id)
);

CREATE INDEX idx_roster_team ON roster_entries(team_id);
CREATE INDEX idx_roster_player ON roster_entries(player_id);

CREATE TABLE fantasy_matchups (
    id              SERIAL PRIMARY KEY,
    league_id       INTEGER NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
    week            INTEGER NOT NULL,
    team_a_id       INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    team_b_id       INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,

    UNIQUE(league_id, week, team_a_id)
);

CREATE INDEX idx_matchups_league_week ON fantasy_matchups(league_id, week);


-- ============================================================
-- SYSTEM / OPERATIONAL
-- ============================================================

-- Tracks cron job execution for monitoring and frontend status display.
-- One row per job type. Updated after each run.
CREATE TABLE sync_status (
    id              SERIAL PRIMARY KEY,
    job_name        VARCHAR(50)  NOT NULL UNIQUE,    -- 'nba_game_logs', 'projections', 'zscores', 'injuries', 'schedule'
    last_run_at     TIMESTAMP WITH TIME ZONE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending', -- 'success', 'failed', 'running', 'pending'
    error_message   TEXT,
    duration_seconds REAL                             -- how long the job took (for performance monitoring)
);

-- Seed the sync jobs so the frontend can always query them
INSERT INTO sync_status (job_name, status) VALUES
    ('nba_game_logs',   'pending'),
    ('player_stats',    'pending'),
    ('projections',     'pending'),
    ('zscores',         'pending'),
    ('injuries',        'pending'),
    ('schedule',        'pending');


-- ============================================================
-- HELPER VIEWS
-- These make common query patterns cleaner in application code
-- ============================================================

-- NOTE: "Remaining games this week" is NOT a database view.
-- It must be calculated in the Python backend because it depends on the
-- user's specific fantasy_leagues.week_end_date, which varies by league
-- (custom schedules, playoff matchups, etc.).
--
-- Backend query pattern:
--   SELECT COUNT(*) FROM nba_games
--   WHERE (home_team_id = :team_id OR away_team_id = :team_id)
--     AND game_date >= CURRENT_DATE
--     AND game_date <= :week_end_date
--     AND is_completed = FALSE;

-- Full player card: projections + z-scores + injury status in one row.
-- This is what the frontend queries for roster views and player comparisons.
CREATE VIEW v_player_dashboard AS
SELECT
    p.id                AS player_id,
    p.full_name,
    p.position,
    p.is_active,
    p.injury_status,
    p.injury_note,
    t.abbreviation      AS team_abbr,
    t.full_name         AS team_name,
    -- Per-game projections
    pr.proj_minutes,
    pr.proj_pts,
    pr.proj_reb,
    pr.proj_ast,
    pr.proj_stl,
    pr.proj_blk,
    pr.proj_threes,
    pr.proj_fgm,
    pr.proj_fga,
    pr.proj_ftm,
    pr.proj_fta,
    pr.proj_to,
    -- Z-scores
    z.z_pts,
    z.z_reb,
    z.z_ast,
    z.z_stl,
    z.z_blk,
    z.z_threes,
    z.z_fg_impact,
    z.z_ft_impact,
    z.z_to,
    z.z_total,
    -- Timestamps
    pr.updated_at       AS projections_updated_at
FROM nba_players p
LEFT JOIN nba_teams t          ON t.id = p.team_id
LEFT JOIN player_projections pr ON pr.player_id = p.id
LEFT JOIN player_zscores z     ON z.player_id = p.id
WHERE p.is_active = TRUE;

-- Waiver wire helper: players not rostered in a given league.
-- Usage: SELECT * FROM v_player_dashboard WHERE player_id NOT IN
--        (SELECT player_id FROM roster_entries re
--         JOIN fantasy_teams ft ON ft.id = re.team_id
--         WHERE ft.league_id = ?)
-- ORDER BY z_total DESC LIMIT 20;
