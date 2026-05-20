import type { DelegationExtract } from "./agentExecution.js";
import {
  extractDelegationContext,
  extractDelegationFromStoredEvent,
} from "./agentExecution.js";
import type {
  DerivedIngestFields,
  TelemetryHookSource,
} from "./eventMetadata.js";
import type { NormalizedAgentEvent } from "./normalize.js";

type SqliteDatabase = {
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function upsertAgentProfile(
  db: SqliteDatabase,
  delegation: DelegationExtract,
  source: string,
  at: string,
): number {
  const existing = db
    .prepare(`SELECT id FROM agent_profiles WHERE profile_key = ?`)
    .get(delegation.profileKey) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `
      UPDATE agent_profiles
      SET
        last_seen_at = ?,
        display_label = COALESCE(?, display_label)
      WHERE id = ?
      `,
    ).run(at, delegation.displayLabel, existing.id);
    return existing.id;
  }

  const info = db
    .prepare(
      `
      INSERT INTO agent_profiles (
        profile_key, source, actor_kind, specialization,
        display_label, first_seen_at, last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      delegation.profileKey,
      source,
      delegation.actorKind,
      delegation.specialization,
      delegation.displayLabel,
      at,
      at,
    ) as { lastInsertRowid: number | bigint };

  return Number(info.lastInsertRowid);
}

function upsertAgentProfileObservation(
  db: SqliteDatabase,
  profileId: number,
  delegation: DelegationExtract,
  evidenceEventId: number,
  at: string,
): number {
  const existing = db
    .prepare(
      `
      SELECT id FROM agent_profile_observations
      WHERE agent_profile_id = ? AND config_fingerprint = ?
      `,
    )
    .get(profileId, delegation.configFingerprint) as { id: number } | undefined;

  const configJson = JSON.stringify(delegation.configSnapshot);

  if (existing) {
    db.prepare(
      `
      UPDATE agent_profile_observations
      SET
        last_seen_at = ?,
        raw_evidence_event_id = COALESCE(raw_evidence_event_id, ?)
      WHERE id = ?
      `,
    ).run(at, evidenceEventId, existing.id);
    return existing.id;
  }

  const info = db
    .prepare(
      `
      INSERT INTO agent_profile_observations (
        agent_profile_id, config_fingerprint, config_json,
        observed_at, last_seen_at, raw_evidence_event_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      profileId,
      delegation.configFingerprint,
      configJson,
      at,
      at,
      evidenceEventId,
    ) as { lastInsertRowid: number | bigint };

  return Number(info.lastInsertRowid);
}

function findOpenExecutionInstance(
  db: SqliteDatabase,
  source: string,
  delegationCorrelationId: string,
): { id: number } | undefined {
  return db
    .prepare(
      `
      SELECT id FROM execution_instances
      WHERE source = ?
        AND delegation_correlation_id = ?
        AND ended_at IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
    )
    .get(source, delegationCorrelationId) as { id: number } | undefined;
}

function openExecutionInstance(
  db: SqliteDatabase,
  profileId: number,
  observationId: number,
  source: string,
  normalized: NormalizedAgentEvent,
  delegation: DelegationExtract,
  at: string,
): number {
  const info = db
    .prepare(
      `
      INSERT INTO execution_instances (
        agent_profile_id, observation_id, source,
        session_id, conversation_id, turn_id,
        parent_instance_id, delegation_correlation_id,
        transcript_path, started_at, ended_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
    )
    .run(
      profileId,
      observationId,
      source,
      normalized.sessionId ?? null,
      normalized.conversationId ?? null,
      normalized.turnId ?? null,
      null,
      delegation.delegationCorrelationId,
      delegation.transcriptPath,
      at,
    ) as { lastInsertRowid: number | bigint };

  return Number(info.lastInsertRowid);
}

function closeExecutionInstance(
  db: SqliteDatabase,
  instanceId: number,
  endedAt: string,
  transcriptPath: string | null,
): void {
  db.prepare(
    `
    UPDATE execution_instances
    SET
      ended_at = ?,
      transcript_path = COALESCE(?, transcript_path)
    WHERE id = ?
    `,
  ).run(endedAt, transcriptPath, instanceId);
}

export function setEventExecutionInstanceId(
  db: SqliteDatabase,
  eventId: number,
  executionInstanceId: number,
): void {
  db.prepare(`UPDATE events SET execution_instance_id = ? WHERE id = ?`).run(
    executionInstanceId,
    eventId,
  );
}

/**
 * Upserts catalog rows and links the current event to an execution instance when applicable.
 * @see ADR-009
 */
export function recordAgentExecutionOnIngest(
  db: SqliteDatabase,
  eventId: number,
  source: TelemetryHookSource | string,
  hookEventName: string,
  rawPayload: unknown,
  derived: DerivedIngestFields,
  normalized: NormalizedAgentEvent,
): number | null {
  const delegation = extractDelegationContext(
    source,
    hookEventName,
    rawPayload,
    derived,
  );
  if (!delegation) return null;

  const at = nowIso();
  const sourceKey = normalized.source;

  if (delegation.action === "start") {
    const profileId = upsertAgentProfile(db, delegation, sourceKey, at);
    const observationId = upsertAgentProfileObservation(
      db,
      profileId,
      delegation,
      eventId,
      at,
    );
    const open = findOpenExecutionInstance(
      db,
      sourceKey,
      delegation.delegationCorrelationId,
    );
    if (open) {
      return open.id;
    }
    return openExecutionInstance(
      db,
      profileId,
      observationId,
      sourceKey,
      normalized,
      delegation,
      at,
    );
  }

  const open = findOpenExecutionInstance(
    db,
    sourceKey,
    delegation.delegationCorrelationId,
  );
  if (!open) return null;

  closeExecutionInstance(db, open.id, at, delegation.transcriptPath);
  return open.id;
}

export function backfillAgentExecutionCatalog(db: SqliteDatabase): void {
  const candidates = db
    .prepare(
      `
      SELECT
        id,
        source,
        source_event,
        raw_payload,
        correlation_id,
        tool_canonical_name,
        session_id,
        conversation_id,
        turn_id,
        created_at
      FROM events
      WHERE execution_instance_id IS NULL
        AND (
          (source = 'cursor' AND tool_canonical_name IN ('Task', 'Subagent'))
          OR (source = 'opencode' AND source_event IN ('SessionStart', 'Stop'))
        )
      ORDER BY id ASC
      `,
    )
    .all() as Array<{
    id: number;
    source: string;
    source_event: string;
    raw_payload: string;
    correlation_id: string | null;
    tool_canonical_name: string | null;
    session_id: string | null;
    conversation_id: string | null;
    turn_id: string | null;
    created_at: string;
  }>;

  for (const row of candidates) {
    let rawPayload: unknown = {};
    try {
      rawPayload = JSON.parse(row.raw_payload);
    } catch {
      continue;
    }

    const delegation = extractDelegationFromStoredEvent({
      source: row.source,
      sourceEvent: row.source_event,
      rawPayload,
      correlationId: row.correlation_id,
      toolCanonicalName: row.tool_canonical_name,
    });
    if (!delegation) continue;

    const normalized: NormalizedAgentEvent = {
      source: row.source as NormalizedAgentEvent["source"],
      sourceEvent: row.source_event,
      sessionId: row.session_id ?? undefined,
      conversationId: row.conversation_id ?? undefined,
      turnId: row.turn_id ?? undefined,
      role: "tool_call",
      observableText: "",
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedTotalTokens: 0,
      rawPayload,
    };

    if (delegation.action === "start") {
      const profileId = upsertAgentProfile(
        db,
        delegation,
        row.source,
        row.created_at,
      );
      const observationId = upsertAgentProfileObservation(
        db,
        profileId,
        delegation,
        row.id,
        row.created_at,
      );
      const open = findOpenExecutionInstance(
        db,
        row.source,
        delegation.delegationCorrelationId,
      );
      const instanceId =
        open?.id ??
        openExecutionInstance(
          db,
          profileId,
          observationId,
          row.source,
          normalized,
          delegation,
          row.created_at,
        );
      setEventExecutionInstanceId(db, row.id, instanceId);
      continue;
    }

    const open = findOpenExecutionInstance(
      db,
      row.source,
      delegation.delegationCorrelationId,
    );
    if (!open) continue;
    closeExecutionInstance(
      db,
      open.id,
      row.created_at,
      delegation.transcriptPath,
    );
    setEventExecutionInstanceId(db, row.id, open.id);
  }
}
