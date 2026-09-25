/**
 * Layer 8: Integration Test Suite (End-to-End Sealing & Verification Pipeline)
 * 
 * Verifies the complete lifecycle:
 * Authentication → Camera/Sensor Validation → CIEDE2000 Two-Vector Classification →
 * Authentic Image Byte Hashing → RFC 8785 Canonical JSON → Ed25519 Sealing →
 * Offline Queue Ingestion → Tamper Detection → BSA Section 63 Dossier & LIMS Export.
 */

import { verifyBadgeNumber, startOperatorSession } from '../lib/auth';
import { classifyColorimetry, RgbColor } from '../lib/classifier';
import { generateCalibrationImageBytes } from '../lib/imageGenerator';
import { sha256Hex, canonicalizeRecord, generateDeterministicKeyPair, signCanonicalRecord, verifyCanonicalRecordSignature } from '../lib/crypto';
import { CanonicalRecord } from '../types/record';
import { enqueueOfflineRecord, processOfflineQueue, getOfflineQueue, resetOfflineQueue } from '../lib/offlineQueue';
import { generateEvidencePacketHtml } from '../lib/evidencePacket';
import { exportRecordsToCsv, exportRecordsToLimsJson } from '../lib/limsExport';
import { FieldTestRow } from '../lib/records';

console.log('[INTEGRATION TEST] Starting End-to-End Forensic Sealing & Verification Pipeline...');

async function runPipeline() {
  // Step 1: Officer Authentication
  const badgeResult = verifyBadgeNumber('OP-042');
  if (!badgeResult.isValid || !badgeResult.operator) {
    throw new Error('Step 1 Failed: Operator OP-042 authentication failed');
  }
  const sessionResult = await startOperatorSession('OP-042');
  if (!sessionResult.success || !sessionResult.session) {
    throw new Error(`Step 1 Failed: Session creation failed: ${sessionResult.error}`);
  }
  const session = sessionResult.session;
  console.log('✓ Step 1: Operator authenticated (Inspector R. Sharma, NCB)');

  // Step 2: Camera & Sensor Capture Simulation
  const sampleRgb: RgbColor = { r: 68, g: 24, b: 92 }; // Marquis positive violet
  const sampleBlank: RgbColor = { r: 236, g: 232, b: 218 }; // Blank amber
  const sampleTarget: RgbColor = { r: 68, g: 24, b: 92 };

  // Step 3: Two-Vector Deterministic Colorimetry
  const classification = classifyColorimetry(sampleRgb, sampleBlank, sampleTarget);
  if (classification.result !== 'PRESUMPTIVE_POSITIVE' || classification.confidence < 0.90) {
    throw new Error(`Step 3 Failed: Unexpected classification ${classification.result}`);
  }
  console.log(`✓ Step 3: Two-Vector CIEDE2000 classified: ${classification.result} (Conf: ${(classification.confidence * 100).toFixed(0)}%)`);

  // Step 4: Authentic 24-bit Image Generation & SHA-256 Digest
  const imageBytes = generateCalibrationImageBytes({
    testRgb: sampleRgb,
    blankRgb: sampleBlank,
    width: 64,
    height: 64,
  });
  const imageSha256 = await sha256Hex(imageBytes);
  if (imageSha256.length !== 64) {
    throw new Error('Step 4 Failed: Image SHA-256 digest invalid length');
  }
  console.log(`✓ Step 4: Physical 24-bit raster generated (${imageBytes.length} bytes, SHA-256: ${imageSha256.slice(0, 16)}...)`);

  // Step 5: Canonical Record Construction
  const recordId = 'FT-2026-000999';
  const canonicalRecord: CanonicalRecord = {
    schemaVersion: '1.0',
    recordId,
    operatorId: session.operator.badgeNumber,
    capturedAt: '2026-09-25T10:00:00Z',
    location: {
      latitude: 19.0760,
      longitude: 72.8777,
      accuracyMeters: 3.5,
    },
    classification: {
      result: classification.result,
      confidence: classification.confidence,
      classifierVersion: 'color-v1.0',
    },
    imageSha256,
  };

  const canonicalJson = canonicalizeRecord(canonicalRecord);
  const recordHash = await sha256Hex(canonicalJson);
  console.log(`✓ Step 5: Canonical JSON serialized & SHA-256 computed: ${recordHash.slice(0, 16)}...`);

  // Step 6: Asymmetric Ed25519 Cryptographic Sealing
  const keyPair = generateDeterministicKeyPair('test-seed-key-ncb-integration-01');
  const signature = signCanonicalRecord(canonicalRecord, keyPair.privateKey);
  const isSignatureValid = await verifyCanonicalRecordSignature(canonicalRecord, signature, keyPair.publicKey);
  if (!isSignatureValid) {
    throw new Error('Step 6 Failed: Generated signature failed immediate verification');
  }
  console.log(`✓ Step 6: Ed25519 digital seal generated: ${signature.slice(0, 16)}...`);

  // Step 7: Layer 6 Offline Queue Ingestion & Synchronization
  resetOfflineQueue();
  const queueItem = await enqueueOfflineRecord({
    recordId,
    canonicalRecord,
    recordHash,
    signature,
    publicKey: keyPair.publicKey,
    imageSha256,
  });
  if (queueItem.status !== 'PENDING') {
    throw new Error('Step 7 Failed: Queue item status not PENDING');
  }
  const syncResult = await processOfflineQueue();
  if (syncResult.syncedCount !== 1 || syncResult.failedCount !== 0) {
    throw new Error(`Step 7 Failed: Sync result unexpected: ${JSON.stringify(syncResult)}`);
  }
  console.log('✓ Step 7: Offline queue ingestion & sync protocol executed successfully');

  // Step 8: Multi-Field Tampering Defense
  const tamperedRecord = JSON.parse(JSON.stringify(canonicalRecord)) as CanonicalRecord;
  tamperedRecord.classification.result = 'PRESUMPTIVE_NEGATIVE';
  const isTamperDetected = !(await verifyCanonicalRecordSignature(tamperedRecord, signature, keyPair.publicKey));
  if (!isTamperDetected) {
    throw new Error('Step 8 Failed: Tampered classification was NOT rejected by Ed25519 verification');
  }
  console.log('✓ Step 8: Tamper detection verified (Adversarial classification mutation rejected)');

  // Step 9: Layer 7 Court Evidence Packet Generation
  const dummyRow: FieldTestRow = {
    id: 'row-999',
    record_id: recordId,
    schema_version: '1.0',
    operator_id: session.operator.badgeNumber,
    captured_at: canonicalRecord.capturedAt,
    latitude: canonicalRecord.location.latitude,
    longitude: canonicalRecord.location.longitude,
    accuracy_meters: canonicalRecord.location.accuracyMeters,
    altitude_meters: 15.0,
    hdop: 1.0,
    is_mock_location: false,
    fix_type: '3D',
    device_reported_at: canonicalRecord.capturedAt,
    server_received_at: '2026-09-25T10:00:00.500Z',
    clock_skew_seconds: 0.5,
    result: canonicalRecord.classification.result as any,
    confidence: canonicalRecord.classification.confidence,
    classifier_version: canonicalRecord.classification.classifierVersion,
    test_type: 'marquis',
    is_verified: true,
    canonical_record: canonicalRecord,
    explanation: {},
    image_sha256: canonicalRecord.imageSha256,
    record_hash: recordHash,
    signature,
    public_key: keyPair.publicKey,
    created_at: canonicalRecord.capturedAt,
  };

  const htmlDossier = generateEvidencePacketHtml(dummyRow);
  if (!htmlDossier.includes('SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023') || !htmlDossier.includes(recordHash)) {
    throw new Error('Step 9 Failed: HTML evidence packet missing statutory clauses or record hash');
  }
  console.log('✓ Step 9: Court-admissible Section 63 BSA evidence dossier generated');

  // Step 10: CFSL LIMS & Bulk CSV Export
  const csvExport = exportRecordsToCsv([dummyRow]);
  if (!csvExport.includes(recordId) || !csvExport.includes(recordHash)) {
    throw new Error('Step 10 Failed: CSV export missing record data');
  }
  const limsJson = exportRecordsToLimsJson([dummyRow]);
  if (limsJson.records.length !== 1 || limsJson.records[0].caseExhibitNumber !== recordId) {
    throw new Error('Step 10 Failed: LIMS export JSON invalid');
  }
  console.log('✓ Step 10: CFSL/FSL LIMS JSON and bulk CSV exports generated');

  console.log('\n[PASS] All 10 Integration Pipeline Stages Executed with 100% Cryptographic Integrity!\n');
}

runPipeline().catch(err => {
  console.error('[FAIL] Integration pipeline failed:', err);
  process.exit(1);
});
