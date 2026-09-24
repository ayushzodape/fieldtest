import { supabase } from './supabase';
import {
  canonicalizeJson,
  sha256Hex,
  generateEd25519KeyPair,
  signCanonicalString,
} from './crypto';
import { CanonicalRecord, SealedRecord } from '../types/record';
import { ClassificationResult } from '../types/test';

// Fixed keypair for demo mode & prototype sealing (in production, signing is server-side)
// We maintain a deterministic keypair for reproducible audit checks
const DEMO_SIGNER = {
  publicKey: 'd472506e42b260907d4981146fc87e59b20b22a013f9c6c22ddfe7fc77e23fe9',
  secretKey: '87042a92634e7bb45a7eb82eef1108ef91b5c2a129ef31885f83863ca6be4810d472506e42b260907d4981146fc87e59b20b22a013f9c6c22ddfe7fc77e23fe9',
};

export interface FieldTestRow {
  id?: string;
  record_id: string;
  operator_id: string;
  captured_at: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  test_type: string;
  result: ClassificationResult;
  confidence: number;
  classifier_version: string;
  schema_version: string;
  image_sha256: string;
  record_hash: string;
  signature: string;
  public_key: string;
  is_verified: boolean;
  canonical_record: CanonicalRecord;
  explanation?: Record<string, unknown>;
  created_at?: string;
}

// Fallback demo records (compliant with 15 rules)
export const SEED_DEMO_RECORDS: FieldTestRow[] = [
  {
    record_id: 'FT-2026-000184',
    operator_id: 'OP-042',
    captured_at: '2026-09-24T17:11:32Z',
    latitude: 19.076,
    longitude: 72.8777,
    accuracy_meters: 8.4,
    test_type: 'marquis',
    result: 'PRESUMPTIVE_POSITIVE',
    confidence: 0.94,
    classifier_version: 'color-v1.0',
    schema_version: '1.0',
    image_sha256: '8e4a9f3b1c2d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    record_hash: '3f7a8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    signature: '1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
    public_key: DEMO_SIGNER.publicKey,
    is_verified: true,
    canonical_record: {
      schemaVersion: '1.0',
      recordId: 'FT-2026-000184',
      operatorId: 'OP-042',
      capturedAt: '2026-09-24T17:11:32Z',
      location: {
        latitude: 19.076,
        longitude: 72.8777,
        accuracyMeters: 8.4,
      },
      classification: {
        result: 'PRESUMPTIVE_POSITIVE',
        confidence: 0.94,
        classifierVersion: 'color-v1.0',
      },
      imageSha256: '8e4a9f3b1c2d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    },
  },
  {
    record_id: 'FT-2026-000183',
    operator_id: 'OP-042',
    captured_at: '2026-09-24T16:45:10Z',
    latitude: 19.078,
    longitude: 72.875,
    accuracy_meters: 12.1,
    test_type: 'marquis',
    result: 'PRESUMPTIVE_NEGATIVE',
    confidence: 0.91,
    classifier_version: 'color-v1.0',
    schema_version: '1.0',
    image_sha256: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    record_hash: 'c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
    signature: '2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
    public_key: DEMO_SIGNER.publicKey,
    is_verified: true,
    canonical_record: {
      schemaVersion: '1.0',
      recordId: 'FT-2026-000183',
      operatorId: 'OP-042',
      capturedAt: '2026-09-24T16:45:10Z',
      location: {
        latitude: 19.078,
        longitude: 72.875,
        accuracyMeters: 12.1,
      },
      classification: {
        result: 'PRESUMPTIVE_NEGATIVE',
        confidence: 0.91,
        classifierVersion: 'color-v1.0',
      },
      imageSha256: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    },
  },
  {
    record_id: 'FT-2026-000182',
    operator_id: 'OP-042',
    captured_at: '2026-09-24T15:20:00Z',
    latitude: 19.081,
    longitude: 72.871,
    accuracy_meters: 6.8,
    test_type: 'marquis',
    result: 'INCONCLUSIVE',
    confidence: 0.51,
    classifier_version: 'color-v1.0',
    schema_version: '1.0',
    image_sha256: 'f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1',
    record_hash: 'd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
    signature: '3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
    public_key: DEMO_SIGNER.publicKey,
    is_verified: true,
    canonical_record: {
      schemaVersion: '1.0',
      recordId: 'FT-2026-000182',
      operatorId: 'OP-042',
      capturedAt: '2026-09-24T15:20:00Z',
      location: {
        latitude: 19.081,
        longitude: 72.871,
        accuracyMeters: 6.8,
      },
      classification: {
        result: 'INCONCLUSIVE',
        confidence: 0.51,
        classifierVersion: 'color-v1.0',
      },
      imageSha256: 'f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1',
    },
  },
];

/**
 * Fetch all field test records from Supabase, with automatic fallback
 */
export async function getFieldTests(): Promise<FieldTestRow[]> {
  try {
    const { data, error } = await supabase
      .from('field_tests')
      .select('*')
      .order('captured_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return SEED_DEMO_RECORDS;
    }
    return data as FieldTestRow[];
  } catch (err) {
    console.warn('[FieldTest Records] Error loading tests, using fallback fixtures:', err);
    return SEED_DEMO_RECORDS;
  }
}

/**
 * Fetch single test record by recordId
 */
export async function getFieldTestById(recordId: string): Promise<FieldTestRow | null> {
  try {
    const { data, error } = await supabase
      .from('field_tests')
      .select('*')
      .eq('record_id', recordId)
      .single();

    if (!error && data) {
      return data as FieldTestRow;
    }
  } catch (err) {
    console.warn('[FieldTest Records] Error loading record by ID from Supabase:', err);
  }

  // Fallback check in demo fixtures
  const fallback = SEED_DEMO_RECORDS.find((r) => r.record_id === recordId);
  return fallback || null;
}

/**
 * Seal and persist a field test record
 */
export async function sealAndSaveFieldTest(params: {
  operatorId: string;
  result: ClassificationResult;
  confidence: number;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  imageBytesOrHash?: string;
  explanation?: Record<string, unknown>;
}): Promise<FieldTestRow> {
  // 1. Generate unique record ID
  const timestamp = new Date().toISOString();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const recordId = `FT-${new Date().getUTCFullYear()}-${randomSuffix}`;

  // 2. Hash image (or generate deterministic hash from mock)
  const imageSha256 = params.imageBytesOrHash?.length === 64
    ? params.imageBytesOrHash
    : await sha256Hex(`image_bytes_${recordId}_${timestamp}`);

  // 3. Construct CanonicalRecord
  const canonicalRecord: CanonicalRecord = {
    schemaVersion: '1.0',
    recordId,
    operatorId: params.operatorId,
    capturedAt: timestamp,
    location: {
      latitude: params.latitude,
      longitude: params.longitude,
      accuracyMeters: params.accuracyMeters,
    },
    classification: {
      result: params.result,
      confidence: params.confidence,
      classifierVersion: 'color-v1.0',
    },
    imageSha256,
  };

  // 4. Compute recordHash on canonicalized JSON
  const canonicalString = canonicalizeJson(canonicalRecord);
  const recordHash = await sha256Hex(canonicalString);

  // 5. Sign with Ed25519
  const signature = signCanonicalString(canonicalString, DEMO_SIGNER.secretKey);
  const publicKey = DEMO_SIGNER.publicKey;

  const newRow: FieldTestRow = {
    record_id: recordId,
    operator_id: params.operatorId,
    captured_at: timestamp,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracy_meters: params.accuracyMeters,
    test_type: 'marquis',
    result: params.result,
    confidence: params.confidence,
    classifier_version: 'color-v1.0',
    schema_version: '1.0',
    image_sha256: imageSha256,
    record_hash: recordHash,
    signature,
    public_key: publicKey,
    is_verified: true,
    canonical_record: canonicalRecord,
    explanation: params.explanation,
  };

  // 6. Persist to Supabase if available
  try {
    const { error: insertError } = await supabase.from('field_tests').insert(newRow);
    if (insertError) {
      console.warn('[FieldTest Records] Supabase insert warning:', insertError.message);
    } else {
      // Append audit event
      await supabase.from('audit_events').insert({
        record_id: recordId,
        event_type: 'RECORD_SEALED',
        operator_id: params.operatorId,
        details: {
          result: params.result,
          confidence: params.confidence,
          record_hash: recordHash,
        },
      });
    }
  } catch (err) {
    console.warn('[FieldTest Records] Could not write to remote database:', err);
  }

  // Prepend to in-memory fixtures for instant local feedback
  SEED_DEMO_RECORDS.unshift(newRow);

  return newRow;
}
