-- GoMo Core v0.1
-- Base dédiée à GoMo Core. Ne doit pas être exécutée sur les bases des autres sites GoMo.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS core_members (
  gomo_id TEXT PRIMARY KEY,
  current_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_core_members_normalized_name
  ON core_members(normalized_name);

CREATE TABLE IF NOT EXISTS core_member_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gomo_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'core',
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  UNIQUE(gomo_id, normalized_alias),
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_aliases_normalized
  ON core_member_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS core_source_links (
  source TEXT NOT NULL,
  source_member_id TEXT NOT NULL,
  gomo_id TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY(source, source_member_id),
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_source_links_gomo
  ON core_source_links(gomo_id);

CREATE TABLE IF NOT EXISTS core_sync_runs (
  sync_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  lastintel_status TEXT,
  lastrank_status TEXT,
  lastintel_members INTEGER NOT NULL DEFAULT 0,
  lastrank_members INTEGER NOT NULL DEFAULT 0,
  reconciled_members INTEGER NOT NULL DEFAULT 0,
  error_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_core_sync_runs_started
  ON core_sync_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS core_source_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_id TEXT NOT NULL,
  gomo_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_member_id TEXT,
  name TEXT NOT NULL,
  rank TEXT,
  hq INTEGER,
  power INTEGER,
  hero_power INTEGER,
  kills INTEGER,
  avatar_url TEXT,
  observed_at TEXT,
  fetched_at TEXT NOT NULL,
  FOREIGN KEY(sync_id) REFERENCES core_sync_runs(sync_id) ON DELETE CASCADE,
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_observations_member_time
  ON core_source_observations(gomo_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_observations_source_time
  ON core_source_observations(source, fetched_at DESC);

CREATE TABLE IF NOT EXISTS core_canonical_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_id TEXT NOT NULL,
  gomo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rank TEXT,
  hq INTEGER,
  power INTEGER,
  hero_power INTEGER,
  kills INTEGER,
  avatar_url TEXT,
  confidence INTEGER NOT NULL,
  confidence_level TEXT NOT NULL,
  flags_json TEXT NOT NULL DEFAULT '[]',
  field_sources_json TEXT NOT NULL DEFAULT '{}',
  observed_at TEXT NOT NULL,
  UNIQUE(sync_id, gomo_id),
  FOREIGN KEY(sync_id) REFERENCES core_sync_runs(sync_id) ON DELETE CASCADE,
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_canonical_member_time
  ON core_canonical_snapshots(gomo_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS core_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  gomo_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_core_audit_created
  ON core_audit_log(created_at DESC);
