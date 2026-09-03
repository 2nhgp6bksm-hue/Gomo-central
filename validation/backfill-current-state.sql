-- A executer uniquement sur une D1 isolee pendant la validation.
-- Le futur backfill de production devra rester une operation explicite et mesuree.

PRAGMA foreign_keys = ON;

WITH latest_ids AS (
  SELECT gomo_id, MAX(id) AS id
  FROM core_canonical_snapshots
  GROUP BY gomo_id
),
max_hq AS (
  SELECT gomo_id, MAX(hq) AS hq
  FROM (
    SELECT gomo_id, hq FROM core_canonical_snapshots WHERE hq IS NOT NULL
    UNION ALL
    SELECT gomo_id, hq FROM core_daily_member_rollups WHERE hq IS NOT NULL
  )
  GROUP BY gomo_id
)
INSERT INTO core_current_members(
  gomo_id,name,rank,hq,max_hq,power,hero_power,kills,avatar_url,
  confidence,confidence_level,flags_json,field_sources_json,observed_at,
  active,membership_status,updated_sync_id,updated_at
)
SELECT
  c.gomo_id,c.name,c.rank,c.hq,COALESCE(h.hq,c.hq),c.power,c.hero_power,c.kills,c.avatar_url,
  c.confidence,c.confidence_level,c.flags_json,c.field_sources_json,c.observed_at,
  m.active,COALESCE(ms.status,'confirmed'),c.sync_id,c.observed_at
FROM latest_ids l
JOIN core_canonical_snapshots c ON c.id=l.id
JOIN core_members m ON m.gomo_id=c.gomo_id
LEFT JOIN core_member_membership ms ON ms.gomo_id=c.gomo_id
LEFT JOIN max_hq h ON h.gomo_id=c.gomo_id
ON CONFLICT(gomo_id) DO UPDATE SET
  name=excluded.name,rank=excluded.rank,hq=excluded.hq,max_hq=excluded.max_hq,
  power=excluded.power,hero_power=excluded.hero_power,kills=excluded.kills,
  avatar_url=excluded.avatar_url,confidence=excluded.confidence,
  confidence_level=excluded.confidence_level,flags_json=excluded.flags_json,
  field_sources_json=excluded.field_sources_json,observed_at=excluded.observed_at,
  active=excluded.active,membership_status=excluded.membership_status,
  updated_sync_id=excluded.updated_sync_id,updated_at=excluded.updated_at;

WITH latest_ids AS (
  SELECT source, source_member_id, MAX(id) AS id
  FROM core_source_observations
  GROUP BY source, source_member_id
)
INSERT INTO core_current_source_state(
  source,source_member_id,gomo_id,name,rank,hq,power,hero_power,kills,
  avatar_url,observed_at,updated_sync_id,updated_at
)
SELECT
  o.source,o.source_member_id,o.gomo_id,o.name,o.rank,o.hq,o.power,o.hero_power,o.kills,
  o.avatar_url,o.observed_at,o.sync_id,o.fetched_at
FROM latest_ids l
JOIN core_source_observations o ON o.id=l.id
ON CONFLICT(source,source_member_id) DO UPDATE SET
  gomo_id=excluded.gomo_id,name=excluded.name,rank=excluded.rank,hq=excluded.hq,
  power=excluded.power,hero_power=excluded.hero_power,kills=excluded.kills,
  avatar_url=excluded.avatar_url,observed_at=excluded.observed_at,
  updated_sync_id=excluded.updated_sync_id,updated_at=excluded.updated_at;
