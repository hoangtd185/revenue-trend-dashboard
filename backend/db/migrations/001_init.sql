-- 001_init.sql
-- Initial schema: admin users, reporting weeks and their daily metrics.

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL DEFAULT 'Admin',
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per reporting week. week_start is always a Monday (ISO day 1).
CREATE TABLE IF NOT EXISTS report_weeks (
  id          SERIAL PRIMARY KEY,
  week_start  DATE        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT report_weeks_week_start_is_monday CHECK (EXTRACT(ISODOW FROM week_start) = 1)
);

-- Seven rows per week (day_index 0 = Monday ... 6 = Sunday).
CREATE TABLE IF NOT EXISTS daily_metrics (
  id               SERIAL PRIMARY KEY,
  week_id          INTEGER       NOT NULL REFERENCES report_weeks(id) ON DELETE CASCADE,
  day_index        SMALLINT      NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  pos_revenue      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pos_revenue >= 0),
  eatclub_revenue  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (eatclub_revenue >= 0),
  labour_cost      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (labour_cost >= 0),
  covers           INTEGER       NOT NULL DEFAULT 0 CHECK (covers >= 0),
  event_impact     TEXT          NULL CHECK (event_impact IN ('positive', 'negative')),
  event_note       TEXT          NULL,
  CONSTRAINT daily_metrics_week_day_unique UNIQUE (week_id, day_index)
);

CREATE INDEX IF NOT EXISTS daily_metrics_week_id_idx ON daily_metrics (week_id);
