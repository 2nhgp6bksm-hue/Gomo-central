import { V, HEARTBEAT, CONFIRM, LEAVE, iso, norm, ch, schema } from "./gomo-core-v06-engine.js";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function stableJson(value, fallback) {
  return JSON.stringify(stable(value ?? fallback));
}

async function storageState(db) {
  const [identityRows, memberRows, currentRows, sourceRows] = await db.batch([
    db.prepare("SELECT 'link' kind,source key1,source_member_id key2,gomo_id, NULL alias FROM core_source_links UNION ALL SELECT 'alias',normalized_alias,'',gomo_id,alias FROM core_member_aliases"),
    db.prepare(`SELECT m.gomo_id,m.current_name,m.normalized_name,m.active,
      ms.status membership_status,ms.confirmation_syncs,ms.missing_syncs
      FROM core_members m LEFT JOIN core_member_membership ms ON ms.gomo_id=m.gomo_id`),
    db.prepare(`SELECT gomo_id,name,rank,hq,max_hq,power,hero_power,kills,avatar_url,
      confidence,confidence_level,flags_json,field_sources_json,observed_at,
      active,membership_status FROM core_current_members`),
    db.prepare(`SELECT source,source_member_id,gomo_id,name,rank,hq,power,hero_power,
      kills,avatar_url,observed_at FROM core_current_source_state`),
  ]);
  const links = new Map();
  const aliases = new Map();
  const aliasesByMember = new Map();
  for (const x of identityRows.results || []) {
    if (x.kind === "link") {
      links.set(`${x.key1}:${x.key2}`, x.gomo_id);
    } else {
      const a = aliases.get(x.key1) || new Set();
      a.add(x.gomo_id);
      aliases.set(x.key1, a);
      aliasesByMember.set(`${x.gomo_id}:${x.key1}`, x.alias);
    }
  }
  return {
    links,
    aliases,
    aliasesByMember,
    members: new Map((memberRows.results || []).map((row) => [row.gomo_id, row])),
    currentMembers: new Map((currentRows.results || []).map((row) => [row.gomo_id, row])),
    currentSources: new Map((sourceRows.results || []).map((row) => [`${row.source}:${row.source_member_id}`, row])),
    rowsLoaded: [identityRows, memberRows, currentRows, sourceRows]
      .reduce((total, result) => total + Number(result.results?.length || 0), 0),
  };
}

const same = (left, right) => left === right || (left == null && right == null);

function canonicalStableBusinessChanged(current, row) {
  if (!current) return true;
  return !same(current.name, row.name)
    || !same(current.rank, row.rank)
    || !same(current.hq, row.hq)
    || !same(current.kills, row.kills)
    || !same(current.avatar_url, row.avatar);
}

function canonicalMovingBusinessChanged(current, row) {
  if (!current) return true;
  return !same(current.power, row.power)
    || !same(current.hero_power, row.hero);
}

function canonicalBusinessChanged(current, row) {
  return canonicalStableBusinessChanged(current, row)
    || canonicalMovingBusinessChanged(current, row);
}

function canonicalDerivedChanged(current, row) {
  if (!current) return true;
  return !same(current.confidence, row.confidence)
    || !same(current.confidence_level, row.level)
    || !same(current.flags_json, row.flags)
    || !same(current.field_sources_json, row.fields);
}

function sourceChanged(current, row) {
  if (!current) return true;
  return !same(current.gomo_id, row.g)
    || !same(current.name, row.name)
    || !same(current.rank, row.rank)
    || !same(current.hq, row.hq)
    || !same(current.power, row.power)
    || !same(current.hero_power, row.hero)
    || !same(current.kills, row.kills)
    || !same(current.avatar_url, row.avatar);
}

function nextMembership(current, presentInLastIntel) {
  if (!presentInLastIntel) return current?.membership_status || "pending";
  if (!current) return "pending";
  if (current.membership_status === "confirmed") return "confirmed";
  if (["departed", "departure_candidate"].includes(current.membership_status)) return "pending";
  return Number(current.confirmation_syncs || 0) + 1 >= CONFIRM ? "confirmed" : "pending";
}

function gid(idx, m) {
  for (const [s, id] of [
    ["lastintel", m.sources?.lastIntel?.sourceId],
    ["lastrank", m.sources?.lastRank?.sourceId],
    ["lastwarrank", m.sources?.lastWarRank?.sourceId],
  ]) {
    if (id && idx.links.has(`${s}:${id}`)) return idx.links.get(`${s}:${id}`);
  }
  const a = idx.aliases.get(norm(m.name));
  if (a?.size === 1) return [...a][0];
  return `gomo_${crypto.randomUUID()}`;
}

function payload(rep, idx, syncId, now) {
  const members = [];
  const canonical = [];
  const obs = [];

  for (const m of rep.members) {
    const g = gid(idx, m);
    const nn = norm(m.name);
    const hasLastIntel = Boolean(m.sources?.lastIntel);
    const sourceCount = [m.sources?.lastIntel, m.sources?.lastRank, m.sources?.lastWarRank].filter(Boolean).length;
    const row = {
      g,
      name: m.name,
      n: nn,
      rank: m.canonical?.rank ?? null,
      hq: m.canonical?.hq ?? null,
      power: m.canonical?.power ?? null,
      hero: m.canonical?.heroPower ?? null,
      kills: m.canonical?.kills ?? null,
      avatar: m.canonical?.avatarUrl ?? null,
      confidence: m.confidence?.score ?? 0,
      level: m.confidence?.level || "review",
      flags: stableJson([...new Set(m.flags || [])].sort(), []),
      fields: stableJson(m.fieldSources, {}),
      sourceCount,
      li: hasLastIntel ? 1 : 0,
    };

    members.push(row);
    // LastIntel is the authoritative source for current GoMo membership.
    // Other sources are retained as observations, but cannot create a current canonical member alone.
    if (hasLastIntel) canonical.push(row);

    for (const [s, o] of [
      ["lastintel", m.sources?.lastIntel],
      ["lastrank", m.sources?.lastRank],
      ["lastwarrank", m.sources?.lastWarRank],
    ]) {
      if (!o) continue;
      const id = String(o.sourceId || nn);
      obs.push({
        g,
        s,
        id,
        name: o.name || m.name,
        rank: o.rank ?? null,
        hq: o.hq ?? null,
        power: o.power ?? null,
        hero: o.heroPower ?? null,
        kills: o.kills ?? null,
        avatar: o.avatarUrl ?? null,
        observed: o.observedAt ?? null,
      });
    }
  }

  return { members, canonical, obs, syncId, now };
}

async function persist(db, rep) {
  await schema(db);
  const syncId = `sync6_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const started = new Date().toISOString();
  const now = iso(rep.generatedAt) || started;
  const lwr = rep.sources?.lastWarRank || {};

  await db.prepare(
    "INSERT INTO core_sync_runs(sync_id,started_at,status,lastintel_status,lastrank_status,lastintel_members,lastrank_members,reconciled_members,error_json) VALUES(?,?,?,?,?,?,?,?,NULL)"
  ).bind(
    syncId,
    started,
    "running",
    rep.sources?.lastIntel?.ok ? "ok" : "error",
    rep.sources?.lastRank?.ok ? "ok" : "error",
    rep.sources?.lastIntel?.memberCount || 0,
    rep.sources?.lastRank?.memberCount || 0,
    0,
  ).run();

  try {
    // Membership cannot be recalculated safely without the authoritative roster.
    // Refuse to publish a new "successful" roster if LastIntel is unavailable;
    // the public v0.7 gateway will keep serving the previous successful D1 snapshot.
    if (!rep.sources?.lastIntel?.ok) {
      throw new Error("LastIntel membership source unavailable; refusing authoritative roster sync");
    }

    const state = await storageState(db);
    const p = payload(rep, state, syncId, now);
    const memberInserts = p.members.filter((row) => !state.members.has(row.g));
    const memberUpdates = p.canonical.filter((row) => {
      const current = state.members.get(row.g);
      return !current
        || !same(current.current_name, row.name)
        || !same(current.normalized_name, row.n)
        || Number(current.active) !== 1;
    });
    const aliasUpdates = p.members.filter((row) => !same(state.aliasesByMember.get(`${row.g}:${row.n}`), row.name));
    const membershipUpdates = p.members.filter((row) => {
      if (!row.li) return false;
      const current = state.members.get(row.g);
      return !current?.membership_status
        || current.membership_status !== "confirmed"
        || Number(current.missing_syncs || 0) !== 0;
    });
    const sourceLinkUpdates = p.obs.filter((row) => !same(state.links.get(`${row.s}:${row.id}`), row.g));
    const sourceChanges = p.obs.filter((row) => sourceChanged(state.currentSources.get(`${row.s}:${row.id}`), row));
    const sourceChangedMembers = new Set(sourceChanges.map((row) => row.g));
    const canonicalChanges = p.canonical.filter((row) => {
      const current = state.currentMembers.get(row.g);
      return canonicalStableBusinessChanged(current, row)
        || (canonicalMovingBusinessChanged(current, row) && sourceChangedMembers.has(row.g));
    });
    const freshnessOnlyCanonicalRowsSuppressed = p.canonical.filter((row) => {
      const current = state.currentMembers.get(row.g);
      return current
        && !canonicalStableBusinessChanged(current, row)
        && canonicalMovingBusinessChanged(current, row)
        && !sourceChangedMembers.has(row.g);
    }).length;
    const derivedMetadataRowsSuppressed = p.canonical.filter((row) => {
      const current = state.currentMembers.get(row.g);
      return current
        && !canonicalBusinessChanged(current, row)
        && canonicalDerivedChanged(current, row)
        && !sourceChangedMembers.has(row.g);
    }).length;
    const currentMemberUpdates = p.canonical.filter((row) => {
      const current = state.currentMembers.get(row.g);
      const membership = nextMembership(state.members.get(row.g), true);
      return canonicalStableBusinessChanged(current, row)
        || (canonicalMovingBusinessChanged(current, row) && sourceChangedMembers.has(row.g))
        || (canonicalDerivedChanged(current, row) && sourceChangedMembers.has(row.g))
        || current?.max_hq == null
        || (row.hq != null && Number(row.hq) > Number(current?.max_hq))
        || Number(current?.active) !== 1
        || !same(current?.membership_status, membership);
    });
    const currentRoster = new Set(p.canonical.map((row) => row.g));
    const missingMemberships = [...state.members.values()].filter((row) => (
      row.membership_status
      && row.membership_status !== "departed"
      && !currentRoster.has(row.gomo_id)
    ));
    const departingIds = new Set(missingMemberships
      .filter((row) => Number(row.missing_syncs || 0) + 1 >= LEAVE)
      .map((row) => row.gomo_id));
    const memberArchiveIds = [...state.members.values()]
      .filter((row) => Number(row.active) !== 0 && (row.membership_status === "departed" || departingIds.has(row.gomo_id)))
      .map((row) => row.gomo_id);
    const currentArchiveIds = [...state.currentMembers.values()]
      .filter((row) => {
        const membership = state.members.get(row.gomo_id)?.membership_status;
        const departed = membership === "departed" || departingIds.has(row.gomo_id);
        return departed && (Number(row.active) !== 0 || row.membership_status !== "departed");
      })
      .map((row) => row.gomo_id);
    const M = JSON.stringify(memberInserts);
    const MU = JSON.stringify(memberUpdates);
    const A = JSON.stringify(aliasUpdates);
    const MS = JSON.stringify(membershipUpdates);
    const C = JSON.stringify(canonicalChanges);
    const CU = JSON.stringify(currentMemberUpdates);
    const SL = JSON.stringify(sourceLinkUpdates);
    const O = JSON.stringify(sourceChanges);
    const healthy = [rep.sources?.lastIntel, rep.sources?.lastRank, rep.sources?.lastWarRank].filter((x) => x?.ok).length;
    const q = [];
    const labels = [];
    const add = (label, statement) => {
      labels.push(label);
      q.push(statement);
    };

    // Keep identities for all observed rows so source history remains usable,
    // but LastRank/LastWarRank-only rows start inactive and never reactivate a departed member.
    if (memberInserts.length) add("members_inserted", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               json_extract(value,'$.name') name,
               json_extract(value,'$.n') n,
               CAST(json_extract(value,'$.li') AS INTEGER) li
        FROM json_each(?)
      )
      INSERT OR IGNORE INTO core_members(gomo_id,current_name,normalized_name,active,created_at,updated_at)
      SELECT g,name,n,CASE WHEN li=1 THEN 1 ELSE 0 END,?,? FROM j
    `).bind(M, now, now));

    // Only LastIntel-present members may refresh the current identity and active flag.
    if (memberUpdates.length) add("members_updated", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               json_extract(value,'$.name') name,
               json_extract(value,'$.n') n
        FROM json_each(?)
      )
      INSERT INTO core_members(gomo_id,current_name,normalized_name,active,created_at,updated_at)
      SELECT g,name,n,1,?,? FROM j WHERE 1=1
      ON CONFLICT(gomo_id) DO UPDATE SET
        current_name=excluded.current_name,
        normalized_name=excluded.normalized_name,
        active=1,
        updated_at=excluded.updated_at
      WHERE core_members.current_name<>excluded.current_name
         OR core_members.normalized_name<>excluded.normalized_name
         OR core_members.active<>1
    `).bind(MU, now, now));

    if (aliasUpdates.length) add("aliases_updated", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               json_extract(value,'$.name') name,
               json_extract(value,'$.n') n
        FROM json_each(?)
      )
      INSERT INTO core_member_aliases(gomo_id,alias,normalized_alias,source,first_seen,last_seen)
      SELECT g,name,n,'core',?,? FROM j WHERE 1=1
      ON CONFLICT(gomo_id,normalized_alias) DO UPDATE SET
        alias=excluded.alias
      WHERE core_member_aliases.alias<>excluded.alias
    `).bind(A, now, now));

    // Confirmation is driven by LastIntel presence, not by the number of sources.
    // A LastRank-only row can therefore never progress from pending to confirmed.
    if (membershipUpdates.length) add("memberships_updated", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               CAST(json_extract(value,'$.li') AS INTEGER) li
        FROM json_each(?)
      )
      INSERT INTO core_member_membership(
        gomo_id,status,confirmation_syncs,missing_syncs,first_seen_at,status_updated_at
      )
      SELECT g,'pending',CASE WHEN li=1 THEN 1 ELSE 0 END,0,?,? FROM j WHERE 1=1
      ON CONFLICT(gomo_id) DO UPDATE SET
        confirmation_syncs=CASE
          WHEN excluded.confirmation_syncs=1 THEN
            CASE
              WHEN core_member_membership.status IN ('departed','departure_candidate') THEN 1
              WHEN core_member_membership.status='confirmed' THEN core_member_membership.confirmation_syncs
              ELSE MIN(core_member_membership.confirmation_syncs+1,${CONFIRM})
            END
          ELSE core_member_membership.confirmation_syncs
        END,
        missing_syncs=CASE
          WHEN excluded.confirmation_syncs=1 THEN 0
          ELSE core_member_membership.missing_syncs
        END,
        status=CASE
          WHEN excluded.confirmation_syncs=1 THEN
            CASE
              WHEN core_member_membership.status='confirmed' THEN 'confirmed'
              WHEN core_member_membership.status IN ('departed','departure_candidate') THEN 'pending'
              WHEN core_member_membership.confirmation_syncs+1>=${CONFIRM} THEN 'confirmed'
              ELSE 'pending'
            END
          ELSE core_member_membership.status
        END,
        status_updated_at=excluded.status_updated_at
      WHERE excluded.confirmation_syncs=1
        AND (
          core_member_membership.status<>'confirmed'
          OR core_member_membership.missing_syncs<>0
        )
    `).bind(MS, now, now));

    // Canonical/public snapshots contain only members present in LastIntel.
    // LastRank and LastWarRank still enrich fields and remain in source observations.
    if (canonicalChanges.length) add("canonical_snapshots_inserted", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               json_extract(value,'$.name') name,
               json_extract(value,'$.rank') rank,
               json_extract(value,'$.hq') hq,
               json_extract(value,'$.power') power,
               json_extract(value,'$.hero') hero,
               json_extract(value,'$.kills') kills,
               json_extract(value,'$.avatar') avatar,
               json_extract(value,'$.confidence') confidence,
               json_extract(value,'$.level') level,
               json_extract(value,'$.flags') flags,
               json_extract(value,'$.fields') fields
        FROM json_each(?)
      ), latest AS(
        SELECT * FROM core_current_members
      )
      INSERT INTO core_canonical_snapshots(
        sync_id,gomo_id,name,rank,hq,power,hero_power,kills,avatar_url,
        confidence,confidence_level,flags_json,field_sources_json,observed_at
      )
      SELECT ?,j.g,j.name,j.rank,j.hq,j.power,j.hero,j.kills,j.avatar,
             j.confidence,j.level,j.flags,j.fields,?
      FROM j
      LEFT JOIN latest l ON l.gomo_id=j.g
      WHERE l.gomo_id IS NULL
         OR l.name IS NOT j.name
         OR l.rank IS NOT j.rank
         OR l.hq IS NOT j.hq
         OR l.power IS NOT j.power
         OR l.hero_power IS NOT j.hero
         OR l.kills IS NOT j.kills
         OR l.avatar_url IS NOT j.avatar
         OR l.confidence IS NOT j.confidence
         OR l.confidence_level IS NOT j.level
         OR l.flags_json IS NOT j.flags
         OR l.field_sources_json IS NOT j.fields
    `).bind(C, syncId, now));

    if (currentMemberUpdates.length) add("current_members_updated", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               json_extract(value,'$.name') name,
               json_extract(value,'$.rank') rank,
               json_extract(value,'$.hq') hq,
               json_extract(value,'$.power') power,
               json_extract(value,'$.hero') hero,
               json_extract(value,'$.kills') kills,
               json_extract(value,'$.avatar') avatar,
               json_extract(value,'$.confidence') confidence,
               json_extract(value,'$.level') level,
               json_extract(value,'$.flags') flags,
               json_extract(value,'$.fields') fields
        FROM json_each(?)
      )
      INSERT INTO core_current_members(
        gomo_id,name,rank,hq,max_hq,power,hero_power,kills,avatar_url,
        confidence,confidence_level,flags_json,field_sources_json,observed_at,
        active,membership_status,updated_sync_id,updated_at
      )
      SELECT j.g,j.name,j.rank,j.hq,j.hq,j.power,j.hero,j.kills,j.avatar,
             j.confidence,j.level,j.flags,j.fields,?,1,
             COALESCE(ms.status,'confirmed'),?,?
      FROM j
      LEFT JOIN core_member_membership ms ON ms.gomo_id=j.g
      WHERE 1=1
      ON CONFLICT(gomo_id) DO UPDATE SET
        name=excluded.name,
        rank=excluded.rank,
        hq=excluded.hq,
        max_hq=CASE
          WHEN core_current_members.max_hq IS NULL THEN excluded.max_hq
          WHEN excluded.max_hq IS NULL THEN core_current_members.max_hq
          ELSE MAX(core_current_members.max_hq,excluded.max_hq)
        END,
        power=excluded.power,
        hero_power=excluded.hero_power,
        kills=excluded.kills,
        avatar_url=excluded.avatar_url,
        confidence=excluded.confidence,
        confidence_level=excluded.confidence_level,
        flags_json=excluded.flags_json,
        field_sources_json=excluded.field_sources_json,
        observed_at=excluded.observed_at,
        active=1,
        membership_status=excluded.membership_status,
        updated_sync_id=excluded.updated_sync_id,
        updated_at=excluded.updated_at
      WHERE core_current_members.name IS NOT excluded.name
         OR core_current_members.rank IS NOT excluded.rank
         OR core_current_members.hq IS NOT excluded.hq
         OR core_current_members.max_hq IS NULL
         OR (excluded.max_hq IS NOT NULL AND excluded.max_hq>core_current_members.max_hq)
         OR core_current_members.power IS NOT excluded.power
         OR core_current_members.hero_power IS NOT excluded.hero_power
         OR core_current_members.kills IS NOT excluded.kills
         OR core_current_members.avatar_url IS NOT excluded.avatar_url
         OR core_current_members.confidence IS NOT excluded.confidence
         OR core_current_members.confidence_level IS NOT excluded.confidence_level
         OR core_current_members.flags_json IS NOT excluded.flags_json
         OR core_current_members.field_sources_json IS NOT excluded.field_sources_json
         OR core_current_members.active<>1
         OR core_current_members.membership_status IS NOT excluded.membership_status
    `).bind(CU, now, syncId, now));

    if (sourceLinkUpdates.length) add("source_links_updated", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.s') s,
               json_extract(value,'$.id') id,
               json_extract(value,'$.g') g
        FROM json_each(?)
      )
      INSERT INTO core_source_links(source,source_member_id,gomo_id,first_seen,last_seen)
      SELECT s,id,g,?,? FROM j WHERE 1=1
      ON CONFLICT(source,source_member_id) DO UPDATE SET
        gomo_id=excluded.gomo_id
      WHERE core_source_links.gomo_id<>excluded.gomo_id
    `).bind(SL, now, now));

    if (sourceChanges.length) add("source_observations_inserted", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               json_extract(value,'$.s') s,
               json_extract(value,'$.id') id,
               json_extract(value,'$.name') name,
               json_extract(value,'$.rank') rank,
               json_extract(value,'$.hq') hq,
               json_extract(value,'$.power') power,
               json_extract(value,'$.hero') hero,
               json_extract(value,'$.kills') kills,
               json_extract(value,'$.avatar') avatar,
               json_extract(value,'$.observed') observed
        FROM json_each(?)
      ), latest AS(
        SELECT * FROM core_current_source_state
      )
      INSERT INTO core_source_observations(
        sync_id,gomo_id,source,source_member_id,name,rank,hq,power,hero_power,
        kills,avatar_url,observed_at,fetched_at
      )
      SELECT ?,j.g,j.s,j.id,j.name,j.rank,j.hq,j.power,j.hero,j.kills,j.avatar,j.observed,?
      FROM j
      LEFT JOIN latest l ON l.source=j.s AND l.source_member_id=j.id
      WHERE l.source_member_id IS NULL
         OR l.gomo_id IS NOT j.g
         OR l.name IS NOT j.name
         OR l.rank IS NOT j.rank
         OR l.hq IS NOT j.hq
         OR l.power IS NOT j.power
         OR l.hero_power IS NOT j.hero
         OR l.kills IS NOT j.kills
         OR l.avatar_url IS NOT j.avatar
    `).bind(O, syncId, now));

    if (sourceChanges.length) add("current_source_state_updated", db.prepare(`
      WITH j AS(
        SELECT json_extract(value,'$.g') g,
               json_extract(value,'$.s') s,
               json_extract(value,'$.id') id,
               json_extract(value,'$.name') name,
               json_extract(value,'$.rank') rank,
               json_extract(value,'$.hq') hq,
               json_extract(value,'$.power') power,
               json_extract(value,'$.hero') hero,
               json_extract(value,'$.kills') kills,
               json_extract(value,'$.avatar') avatar,
               json_extract(value,'$.observed') observed
        FROM json_each(?)
      )
      INSERT INTO core_current_source_state(
        source,source_member_id,gomo_id,name,rank,hq,power,hero_power,kills,
        avatar_url,observed_at,updated_sync_id,updated_at
      )
      SELECT j.s,j.id,j.g,j.name,j.rank,j.hq,j.power,j.hero,j.kills,
             j.avatar,j.observed,?,?
      FROM j WHERE 1=1
      ON CONFLICT(source,source_member_id) DO UPDATE SET
        gomo_id=excluded.gomo_id,
        name=excluded.name,
        rank=excluded.rank,
        hq=excluded.hq,
        power=excluded.power,
        hero_power=excluded.hero_power,
        kills=excluded.kills,
        avatar_url=excluded.avatar_url,
        observed_at=excluded.observed_at,
        updated_sync_id=excluded.updated_sync_id,
        updated_at=excluded.updated_at
      WHERE core_current_source_state.gomo_id IS NOT excluded.gomo_id
         OR core_current_source_state.name IS NOT excluded.name
         OR core_current_source_state.rank IS NOT excluded.rank
         OR core_current_source_state.hq IS NOT excluded.hq
         OR core_current_source_state.power IS NOT excluded.power
         OR core_current_source_state.hero_power IS NOT excluded.hero_power
         OR core_current_source_state.kills IS NOT excluded.kills
         OR core_current_source_state.avatar_url IS NOT excluded.avatar_url
    `).bind(O, syncId, now));

    // Because LastIntel is healthy here, every identity absent from its roster
    // counts as one consecutive missing membership sync, even if LastRank still lists it.
    if (missingMemberships.length) add("memberships_missing_updated", db.prepare(`
      WITH missing(g) AS(
        SELECT value FROM json_each(?)
      )
      UPDATE core_member_membership
      SET confirmation_syncs=0,
          missing_syncs=missing_syncs+1,
          status=CASE
            WHEN missing_syncs+1>=${LEAVE} THEN 'departed'
            WHEN missing_syncs+1>=2 THEN 'departure_candidate'
            ELSE status
          END,
          status_updated_at=?
      WHERE status<>'departed'
        AND gomo_id IN(SELECT g FROM missing)
    `).bind(JSON.stringify(missingMemberships.map((row) => row.gomo_id)), now));

    if (memberArchiveIds.length) add("members_archived", db.prepare(`
      UPDATE core_members SET active=0,updated_at=?
      WHERE active<>0 AND gomo_id IN(SELECT value FROM json_each(?))
    `).bind(now, JSON.stringify(memberArchiveIds)));

    if (currentArchiveIds.length) add("current_members_archived", db.prepare(`
      UPDATE core_current_members
      SET active=0,membership_status='departed',updated_sync_id=?,updated_at=?
      WHERE gomo_id IN(SELECT value FROM json_each(?))
        AND (active<>0 OR membership_status<>'departed')
    `).bind(syncId, now, JSON.stringify(currentArchiveIds)));

    const meta = {
      hardeningVersion: V,
      bulkD1Writes: true,
      healthySources: healthy,
      stableHeartbeatHours: HEARTBEAT,
      hqProtected: Number(rep.summary?.protectedHqMembers || 0),
      membershipAuthority: "lastIntel",
      unionMembers: rep.members.length,
      canonicalMembers: p.canonical.length,
    };

    add("sync_completed", db.prepare(
      "UPDATE core_sync_runs SET completed_at=?,status='ok',reconciled_members=?,error_json=? WHERE sync_id=?"
    ).bind(
      new Date().toISOString(),
      p.canonical.length,
      JSON.stringify({
        sourceErrors: {
          lastIntel: rep.sources?.lastIntel?.error || null,
          lastRank: rep.sources?.lastRank?.error || null,
          lastWarRank: lwr.error || null,
        },
      }),
      syncId,
    ));

    const r = await db.batch(q);
    const allLabels = [
      "members_inserted",
      "members_updated",
      "aliases_updated",
      "memberships_updated",
      "canonical_snapshots_inserted",
      "current_members_updated",
      "source_links_updated",
      "source_observations_inserted",
      "current_source_state_updated",
      "memberships_missing_updated",
      "members_archived",
      "current_members_archived",
      "sync_completed",
    ];
    const changesByStatement = Object.fromEntries(allLabels.map((label) => [label, 0]));
    labels.forEach((label, index) => { changesByStatement[label] = ch(r[index]); });
    const meaningfulRows = Object.entries(changesByStatement)
      .filter(([label]) => label !== "sync_completed")
      .reduce((total, [, changes]) => total + changes, 0);
    const metrics = {
      statements: r.length,
      statementsSkippedAsUnchanged: allLabels.length - r.length,
      dedupStateQueries: 4,
      dedupStateRowsLoaded: state.rowsLoaded,
      derivedMetadataRowsSuppressed,
      freshnessOnlyCanonicalRowsSuppressed,
      rowsChanged: r.reduce((a, x) => a + ch(x), 0),
      meaningfulRows,
      operationalBookkeepingRows: 3,
      changesByStatement,
      canonicalRows: p.canonical.length,
      observationRows: p.obs.length,
    };

    await db.prepare(`
      INSERT INTO core_sync_metadata(sync_id,lastwarrank_status,lastwarrank_members,metadata_json)
      VALUES(?,?,?,?)
    `)
      .bind(syncId, lwr.ok ? "ok" : "error", lwr.memberCount || 0, JSON.stringify({ ...meta, ...metrics }))
      .run();

    return {
      syncId,
      members: p.canonical.length,
      changed: meaningfulRows > 0,
      summary: rep.summary,
      storage: { ...meta, ...metrics },
    };
  } catch (e) {
    try {
      await db.prepare("UPDATE core_sync_runs SET completed_at=?,status='error',error_json=? WHERE sync_id=?")
        .bind(new Date().toISOString(), JSON.stringify({ message: e?.message || String(e), hardeningVersion: V }), syncId)
        .run();
    } catch {}
    throw e;
  }
}

export { persist };
