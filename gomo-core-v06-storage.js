import { V, HEARTBEAT, CONFIRM, LEAVE, iso, norm, ch, schema } from "./gomo-core-v06-engine.js";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function stableJson(value, fallback) {
  return JSON.stringify(stable(value ?? fallback));
}

async function identities(db) {
  const r = await db.prepare("SELECT 'link' kind,source key1,source_member_id key2,gomo_id FROM core_source_links UNION ALL SELECT 'alias',normalized_alias,'',gomo_id FROM core_member_aliases").all();
  const links = new Map();
  const aliases = new Map();
  for (const x of r.results || []) {
    if (x.kind === "link") {
      links.set(`${x.key1}:${x.key2}`, x.gomo_id);
    } else {
      const a = aliases.get(x.key1) || new Set();
      a.add(x.gomo_id);
      aliases.set(x.key1, a);
    }
  }
  return { links, aliases };
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

    const p = payload(rep, await identities(db), syncId, now);
    const M = JSON.stringify(p.members);
    const C = JSON.stringify(p.canonical);
    const O = JSON.stringify(p.obs);
    const healthy = [rep.sources?.lastIntel, rep.sources?.lastRank, rep.sources?.lastWarRank].filter((x) => x?.ok).length;
    const q = [];
    const labels = [];
    const add = (label, statement) => {
      labels.push(label);
      q.push(statement);
    };

    // Keep identities for all observed rows so source history remains usable,
    // but LastRank/LastWarRank-only rows start inactive and never reactivate a departed member.
    add("members_inserted", db.prepare(`
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
    add("members_updated", db.prepare(`
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
    `).bind(C, now, now));

    add("aliases_updated", db.prepare(`
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
    `).bind(M, now, now));

    // Confirmation is driven by LastIntel presence, not by the number of sources.
    // A LastRank-only row can therefore never progress from pending to confirmed.
    add("memberships_updated", db.prepare(`
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
    `).bind(M, now, now));

    // Canonical/public snapshots contain only members present in LastIntel.
    // LastRank and LastWarRank still enrich fields and remain in source observations.
    add("canonical_snapshots_inserted", db.prepare(`
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

    add("current_members_updated", db.prepare(`
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
    `).bind(C, now, syncId, now));

    add("source_links_updated", db.prepare(`
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
    `).bind(O, now, now));

    add("source_observations_inserted", db.prepare(`
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

    add("current_source_state_updated", db.prepare(`
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
    add("memberships_missing_updated", db.prepare(`
      WITH li(g) AS(
        SELECT json_extract(value,'$.g') FROM json_each(?)
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
        AND gomo_id NOT IN(SELECT g FROM li)
    `).bind(C, now));

    add("members_archived", db.prepare(
      "UPDATE core_members SET active=0,updated_at=? WHERE gomo_id IN(SELECT gomo_id FROM core_member_membership WHERE status='departed') AND active<>0"
    ).bind(now));

    add("current_members_archived", db.prepare(`
      UPDATE core_current_members
      SET active=0,membership_status='departed',updated_sync_id=?,updated_at=?
      WHERE gomo_id IN(
        SELECT gomo_id FROM core_member_membership WHERE status='departed'
      )
        AND (active<>0 OR membership_status<>'departed')
    `).bind(syncId, now));

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
    const changesByStatement = Object.fromEntries(labels.map((label, index) => [label, ch(r[index])]));
    const meaningfulRows = Object.entries(changesByStatement)
      .filter(([label]) => label !== "sync_completed")
      .reduce((total, [, changes]) => total + changes, 0);
    const metrics = {
      statements: r.length,
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
