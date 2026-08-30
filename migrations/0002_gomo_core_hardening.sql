-- GoMo Core v0.6 hardening
-- Migration additive et isolée : aucune table hors préfixe core_ n'est modifiée.

PRAGMA foreign_keys = ON;

-- Accélère la fenêtre temporelle globale utilisée par le moteur de précision.
CREATE INDEX IF NOT EXISTS idx_core_canonical_observed_at
  ON core_canonical_snapshots(observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_observations_fetched_at
  ON core_source_observations(fetched_at DESC);

-- Métadonnées détaillées séparées de error_json.
CREATE TABLE IF NOT EXISTS core_sync_metadata (
  sync_id TEXT PRIMARY KEY,
  lastwarrank_status TEXT,
  lastwarrank_members INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(sync_id) REFERENCES core_sync_runs(sync_id) ON DELETE CASCADE
);

-- État d'appartenance : un membre ne disparaît jamais après une seule absence.
CREATE TABLE IF NOT EXISTS core_member_membership (
  gomo_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK(status IN ('pending','confirmed','departure_candidate','departed')),
  confirmation_syncs INTEGER NOT NULL DEFAULT 0,
  missing_syncs INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL,
  status_updated_at TEXT NOT NULL,
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_membership_status
  ON core_member_membership(status, missing_syncs);

-- Les membres déjà présents avant v0.6 sont considérés comme confirmés.
INSERT OR IGNORE INTO core_member_membership(
  gomo_id,status,confirmation_syncs,missing_syncs,first_seen_at,status_updated_at
)
SELECT
  gomo_id,
  CASE WHEN active=1 THEN 'confirmed' ELSE 'departed' END,
  2,
  0,
  created_at,
  updated_at
FROM core_members;

-- Conservation longue durée : un relevé quotidien par membre avant purge de l'horaire ancien.
CREATE TABLE IF NOT EXISTS core_daily_member_rollups (
  day TEXT NOT NULL,
  gomo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  hq INTEGER,
  power INTEGER,
  hero_power INTEGER,
  rank TEXT,
  confidence INTEGER,
  observed_at TEXT NOT NULL,
  PRIMARY KEY(day, gomo_id),
  FOREIGN KEY(gomo_id) REFERENCES core_members(gomo_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_core_rollups_member_day
  ON core_daily_member_rollups(gomo_id, day DESC);
