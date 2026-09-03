-- GoMo Core v0.8 read optimization
-- Tables additives d'etat courant. Les historiques existants restent intacts.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS core_current_members (
  gomo_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank TEXT,
  hq INTEGER,
  max_hq INTEGER,
  power INTEGER,
  hero_power INTEGER,
  kills INTEGER,
  avatar_url TEXT,
  confidence INTEGER NOT NULL,
  confidence_level TEXT NOT NULL,
  flags_json TEXT NOT NULL DEFAULT '[]',
  field_sources_json TEXT NOT NULL DEFAULT '{}',
  observed_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  membership_status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK(membership_status IN ('pending','confirmed','departure_candidate','departed')),
  updated_sync_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS core_current_source_state (
  source TEXT NOT NULL,
  source_member_id TEXT NOT NULL,
  gomo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rank TEXT,
  hq INTEGER,
  power INTEGER,
  hero_power INTEGER,
  kills INTEGER,
  avatar_url TEXT,
  observed_at TEXT,
  updated_sync_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(source, source_member_id),
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

-- La recherche du dernier succes utilisait completed_at sans index adapte.
CREATE INDEX IF NOT EXISTS idx_core_sync_runs_success_completed
  ON core_sync_runs(completed_at DESC)
  WHERE status='ok';
