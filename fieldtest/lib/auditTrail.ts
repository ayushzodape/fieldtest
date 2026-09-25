import { canonicalizeJson, sha256Hex } from './crypto';
import { CanonicalRecord } from '../types/record';

export type AuditEventType =
  | 'RECORD_CREATED'
  | 'SAMPLE_CAPTURED'
  | 'COLOR_CLASSIFIED'
  | 'RECORD_SEALED'
  | 'RECORD_VERIFIED'
  | 'TAMPER_DETECTED'
  | 'RECORD_EXPORTED';

export interface AuditEvent {
  sequenceNumber: number;
  timestamp: string;
  eventType: AuditEventType;
  operatorId: string;
  recordId: string;
  eventData: Record<string, unknown>;
  previousEventHash: string; // 64-char hex of preceding event, or 64 zeros for genesis
  eventHash: string;         // SHA-256(canonical JSON of event payload including previousEventHash)
}

export interface AuditChain {
  recordId: string;
  chainVersion: '1.0';
  events: AuditEvent[];
}

export interface AuditVerificationResult {
  isValid: boolean;
  totalEvents: number;
  brokenAtIndex?: number;
  expectedHash?: string;
  computedHash?: string;
  reason?: string;
}

const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

/**
 * Compute the deterministic SHA-256 hash of an audit event
 */
export async function computeAuditEventHash(
  event: Omit<AuditEvent, 'eventHash'>
): Promise<string> {
  const canonicalString = canonicalizeJson({
    sequenceNumber: event.sequenceNumber,
    timestamp: event.timestamp,
    eventType: event.eventType,
    operatorId: event.operatorId,
    recordId: event.recordId,
    eventData: event.eventData,
    previousEventHash: event.previousEventHash,
  });
  return await sha256Hex(canonicalString);
}

/**
 * Append an immutable event to the audit chain, linking it to the prior event's hash
 */
export async function appendAuditEvent(
  chain: AuditChain,
  params: {
    eventType: AuditEventType;
    operatorId: string;
    eventData: Record<string, unknown>;
    timestamp?: string;
  }
): Promise<AuditEvent> {
  const lastEvent = chain.events[chain.events.length - 1];
  const previousEventHash = lastEvent ? lastEvent.eventHash : GENESIS_PREVIOUS_HASH;
  const sequenceNumber = chain.events.length + 1;
  const timestamp = params.timestamp || new Date().toISOString();

  const eventPayload: Omit<AuditEvent, 'eventHash'> = {
    sequenceNumber,
    timestamp,
    eventType: params.eventType,
    operatorId: params.operatorId,
    recordId: chain.recordId,
    eventData: params.eventData,
    previousEventHash,
  };

  const eventHash = await computeAuditEventHash(eventPayload);
  const newEvent: AuditEvent = {
    ...eventPayload,
    eventHash,
  };

  chain.events.push(newEvent);
  return newEvent;
}

/**
 * Cryptographically verify the entire audit trail hash chain.
 * Traverses from Genesis to latest event. If an attacker modifies or deletes
 * ANY prior event, the chain breaks at the subsequent link.
 */
export async function verifyAuditChain(chain: AuditChain): Promise<AuditVerificationResult> {
  if (!chain.events || chain.events.length === 0) {
    return {
      isValid: false,
      totalEvents: 0,
      reason: 'Audit trail is empty (missing genesis event)',
    };
  }

  let expectedPrevHash = GENESIS_PREVIOUS_HASH;

  for (let i = 0; i < chain.events.length; i++) {
    const event = chain.events[i];

    // 1. Verify sequence order
    if (event.sequenceNumber !== i + 1) {
      return {
        isValid: false,
        totalEvents: chain.events.length,
        brokenAtIndex: i,
        reason: `Sequence gap detected: expected #${i + 1}, found #${event.sequenceNumber}`,
      };
    }

    // 2. Verify backward link to previous event hash
    if (event.previousEventHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalEvents: chain.events.length,
        brokenAtIndex: i,
        expectedHash: expectedPrevHash,
        computedHash: event.previousEventHash,
        reason: `Hash chain link broken at event #${event.sequenceNumber}: previousEventHash does not match predecessor`,
      };
    }

    // 3. Recompute event hash over payload
    const { eventHash, ...payload } = event;
    const computedHash = await computeAuditEventHash(payload);

    if (computedHash !== eventHash) {
      return {
        isValid: false,
        totalEvents: chain.events.length,
        brokenAtIndex: i,
        expectedHash: eventHash,
        computedHash,
        reason: `Data tampering detected at event #${event.sequenceNumber}: stored eventHash does not match payload hash`,
      };
    }

    // Advance pointer
    expectedPrevHash = event.eventHash;
  }

  return {
    isValid: true,
    totalEvents: chain.events.length,
  };
}

/**
 * Create a full audit chain from a sealed canonical record
 */
export async function createInitialAuditChain(
  record: CanonicalRecord,
  initialDetails?: {
    lightingQuality?: string;
    focusQuality?: string;
  }
): Promise<AuditChain> {
  const chain: AuditChain = {
    recordId: record.recordId,
    chainVersion: '1.0',
    events: [],
  };

  // Event 1: Session Created
  await appendAuditEvent(chain, {
    eventType: 'RECORD_CREATED',
    operatorId: record.operatorId,
    timestamp: new Date(new Date(record.capturedAt).getTime() - 15000).toISOString(),
    eventData: {
      schemaVersion: record.schemaVersion,
      initialState: 'CAPTURE_INITIALIZED',
    },
  });

  // Event 2: Camera Sample Captured
  await appendAuditEvent(chain, {
    eventType: 'SAMPLE_CAPTURED',
    operatorId: record.operatorId,
    timestamp: new Date(new Date(record.capturedAt).getTime() - 8000).toISOString(),
    eventData: {
      imageSha256: record.imageSha256,
      location: record.location,
      lightingQuality: initialDetails?.lightingQuality || 'GOOD',
      focusQuality: initialDetails?.focusQuality || 'GOOD',
    },
  });

  // Event 3: Deterministic Classification Executed
  await appendAuditEvent(chain, {
    eventType: 'COLOR_CLASSIFIED',
    operatorId: record.operatorId,
    timestamp: new Date(new Date(record.capturedAt).getTime() - 2000).toISOString(),
    eventData: {
      classification: record.classification,
    },
  });

  // Event 4: Digital Record Sealed & Signed
  await appendAuditEvent(chain, {
    eventType: 'RECORD_SEALED',
    operatorId: record.operatorId,
    timestamp: record.capturedAt,
    eventData: {
      recordId: record.recordId,
      result: record.classification.result,
      confidence: record.classification.confidence,
    },
  });

  return chain;
}
