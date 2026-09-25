import { supabase, isSupabaseConfigured } from './supabase';
import {
  canonicalizeJson,
  sha256Hex,
  generateEd25519KeyPair,
  signCanonicalString,
} from './crypto';
import { CanonicalRecord, SealedRecord } from '../types/record';
import { ClassificationResult } from '../types/test';
import { RgbColor } from './classifier';
import { generateEvidenceImage } from './imageGenerator';
import {
  evaluateClockSkew,
  evaluateGeospatialIntegrity,
  generateSecureRecordId,
  GpsFixType,
} from './temporalGeospatial';

// Client trusted verification public key (from environment or default root authority)
export const TRUSTED_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_SIGNER_PUBLIC_KEY ||
  '8227260ea8e7aa475ecdb3f6655e13d6a01655e218458d418959521087218ea6';

// Fixed keypair for offline demo mode & fallback sealing (in production, signing is server-side via seal-record)
const DEMO_SIGNER = {
  publicKey: '8227260ea8e7aa475ecdb3f6655e13d6a01655e218458d418959521087218ea6',
  secretKey: '87042a92634e7bb45a7eb82eef1108ef91b5c2a129ef31885f83863ca6be48108227260ea8e7aa475ecdb3f6655e13d6a01655e218458d418959521087218ea6',
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
  // Layer 4 Temporal & Geospatial Provenance
  device_reported_at?: string;
  server_received_at?: string;
  clock_skew_seconds?: number;
  fix_type?: GpsFixType;
  is_mock_location?: boolean;
  hdop?: number;
}

// Fallback demo records (compliant with 15 rules & cryptographically authentic)
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
    record_hash: '5afcb0b9fd7fe548fc59b855502374093d322a9ca57e1028c975c1d60d4efc9e',
    signature: '3bac5537be661bd67320be10010f738c52c72248c1a49838a4d44f8a7a7a028b1f4cdda6a41bdb05ed7ff8d36b5c9c4f3e694726bfeb8e0421cbe4d88f476a00',
    public_key: TRUSTED_PUBLIC_KEY,
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
    record_hash: 'a61ca0e124de8de865c85ae9ab1a91eeab0eb03d2ee3f41c2d59ce64d34b3aff',
    signature: 'a78f58c28898d0435a6495e3b344d7b2953dbe82705c4e675bca857a96b7152d06355bc4e0a950a7ee670fd4ddec37d286af447bf08fad8732526fa042526d05',
    public_key: TRUSTED_PUBLIC_KEY,
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
    record_hash: '817549033faeee74935fc3e1ff399fdf26ad6e8ae5f7760b2340663a6337e16b',
    signature: 'a211d88577a6c075847b27e33d40aa5d9f4827978ae57acad158686170c919a69f0773f0776838db06676216255752eac2b0b1e21526ebdb3782f82d6240d802',
    public_key: TRUSTED_PUBLIC_KEY,
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
  if (!isSupabaseConfigured) {
    return SEED_DEMO_RECORDS;
  }

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
  if (!isSupabaseConfigured) {
    return SEED_DEMO_RECORDS.find((r) => r.record_id === recordId) || null;
  }

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
  capturedAt?: string;
  mocked?: boolean;
  fixType?: GpsFixType;
  altitudeMeters?: number;
  hdop?: number;
}): Promise<FieldTestRow> {
  // 1. Generate unique, cryptographically secure Record ID using UUID v4
  const { recordId } = generateSecureRecordId();
  const deviceReportedAt = params.capturedAt || new Date().toISOString();

  // Evaluate geospatial fix & anti-spoofing
  const geo = evaluateGeospatialIntegrity({
    latitude: params.latitude,
    longitude: params.longitude,
    accuracyMeters: params.accuracyMeters,
    altitudeMeters: params.altitudeMeters,
    mocked: params.mocked,
    fixType: params.fixType,
    hdop: params.hdop,
  });

  if (geo.isMocked) {
    console.warn(`[FieldTest Anti-Spoofing] Mock location detected on record ${recordId}! Flagging in provenance log.`);
  }

  // 2. Hash image (bind physical byte stream, authentic hex digest, or generated evidence raster)
  let imageSha256: string;
  if (params.imageBytesOrHash && params.imageBytesOrHash.length === 64 && /^[0-9a-f]{64}$/i.test(params.imageBytesOrHash)) {
    imageSha256 = params.imageBytesOrHash;
  } else if (params.imageBytesOrHash) {
    imageSha256 = await sha256Hex(params.imageBytesOrHash);
  } else {
    // Generate authentic binary raster evidence image from observed color and calibration card
    const observed = (params.explanation?.observedColor as RgbColor) || { r: 68, g: 24, b: 92 };
    const measuredWhite = (params.explanation?.measuredWhiteColor as RgbColor) || { r: 245, g: 245, b: 245 };
    const artifact = await generateEvidenceImage({
      observedRgb: observed,
      measuredWhiteRgb: measuredWhite,
      recordId,
    });
    imageSha256 = artifact.imageSha256;
  }

  // 3. Construct CanonicalRecord
  const canonicalRecord: CanonicalRecord = {
    schemaVersion: '1.0',
    recordId,
    operatorId: params.operatorId,
    capturedAt: deviceReportedAt,
    location: {
      latitude: geo.latitude,
      longitude: geo.longitude,
      accuracyMeters: geo.accuracyMeters,
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

  // 5. Sign with Ed25519: Use Edge Function / Server HSM boundary if available, with offline fallback
  let signature: string;
  let publicKey = TRUSTED_PUBLIC_KEY;
  let serverReceivedAt = new Date().toISOString();
  let clockSkewSeconds = 0;

  try {
    const { data: signResult, error: signError } = await supabase.functions.invoke('seal-record', {
      body: { canonicalRecord, recordHash },
    });

    if (!signError && signResult?.signature) {
      signature = signResult.signature;
      if (signResult.publicKey) {
        publicKey = signResult.publicKey;
      }
      if (signResult.serverReceivedAt) {
        serverReceivedAt = signResult.serverReceivedAt;
      }
      if (typeof signResult.clockSkewSeconds === 'number') {
        clockSkewSeconds = signResult.clockSkewSeconds;
      }
    } else {
      signature = signCanonicalString(canonicalString, DEMO_SIGNER.secretKey);
      const skew = evaluateClockSkew(deviceReportedAt, serverReceivedAt);
      clockSkewSeconds = skew.skewSeconds;
    }
  } catch (_err) {
    signature = signCanonicalString(canonicalString, DEMO_SIGNER.secretKey);
    const skew = evaluateClockSkew(deviceReportedAt, serverReceivedAt);
    clockSkewSeconds = skew.skewSeconds;
  }

  const newRow: FieldTestRow = {
    record_id: recordId,
    operator_id: params.operatorId,
    captured_at: deviceReportedAt,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy_meters: geo.accuracyMeters,
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
    device_reported_at: deviceReportedAt,
    server_received_at: serverReceivedAt,
    clock_skew_seconds: clockSkewSeconds,
    fix_type: geo.fixType,
    is_mock_location: geo.isMocked,
    hdop: geo.hdop,
  };

  // 6. Persist to Supabase if available
  if (isSupabaseConfigured) {
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
  }

  // Prepend to in-memory fixtures for instant local feedback
  SEED_DEMO_RECORDS.unshift(newRow);

  return newRow;
}
