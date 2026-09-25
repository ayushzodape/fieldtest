/**
 * Layer 9: Deployment & Operations Test Suite
 * 
 * Verifies production operational components:
 * 1. Schema version migration & historical evidence conformance.
 * 2. Structured telemetry logging, severity levels & sensitive credential redaction.
 * 3. Feature flags dynamic rollout & emergency overrides.
 */

import { validateSchemaConformance, migrateRecord } from '../lib/migrations';
import { logTelemetry, getTelemetryLog, clearTelemetryLog } from '../lib/monitoring';
import { getFeatureFlags, isFeatureActive, updateFeatureFlags, resetFeatureFlags } from '../lib/featureFlags';
import { CanonicalRecord } from '../types/record';
import { generateDeterministicKeyPair, signCanonicalRecord, verifyCanonicalRecordSignature } from '../lib/crypto';

console.log('[TEST] Running operationsLayer9.test.ts (Layer 9: Deployment & Operations)...');

// 1. Test Schema Conformance & Migrations
const sampleRecord: CanonicalRecord = {
  schemaVersion: '1.0',
  recordId: 'FT-2026-MIGRATE-01',
  operatorId: 'OP-042',
  capturedAt: '2026-09-25T14:30:00Z',
  location: { latitude: 19.0760, longitude: 72.8777, accuracyMeters: 3.5 },
  classification: { result: 'PRESUMPTIVE_POSITIVE', confidence: 0.94, classifierVersion: 'color-v1.0' },
  imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};

const conformance = validateSchemaConformance(sampleRecord);
if (!conformance.isValid) {
  throw new Error(`Schema conformance failed: ${conformance.errors.join(', ')}`);
}
console.log('✓ Valid Schema 1.0 record conformance verified.');

// Test migration to 1.1
const keyPair = generateDeterministicKeyPair('ops-key-01');
const sig = signCanonicalRecord(sampleRecord, keyPair.privateKey);

migrateRecord(sampleRecord, '1.1', sig, keyPair.publicKey).then(result => {
  if (!result.success || result.toVersion !== '1.1') {
    throw new Error('Migration to 1.1 failed');
  }
  console.log('✓ Schema version migration (1.0 -> 1.1) verified.');

  // 2. Test Telemetry & Sensitive Key Redaction
  clearTelemetryLog();
  logTelemetry('INFO', 'SYSTEM', 'App initialized');
  logTelemetry('WARN', 'SECURITY', 'Clock drift detected', { skew: 45, secretKey: 'super-secret-hex-key' });
  logTelemetry('ERROR', 'SYNC', 'Sync failure attempt', { retryCount: 3, pin: '1234' });

  const logs = getTelemetryLog();
  if (logs.length !== 3) {
    throw new Error(`Expected 3 telemetry events, got ${logs.length}`);
  }

  const warnLog = logs.find(l => l.level === 'WARN');
  if (!warnLog || warnLog.metadata?.secretKey !== '[REDACTED]') {
    throw new Error('Sensitive secretKey was NOT properly redacted in telemetry log');
  }

  const errorLog = logs.find(l => l.level === 'ERROR');
  if (!errorLog || errorLog.metadata?.pin !== '[REDACTED]') {
    throw new Error('Sensitive PIN was NOT properly redacted in telemetry log');
  }
  console.log('✓ Structured telemetry logging & sensitive credential redaction verified.');

  // 3. Test Feature Flags Engine
  resetFeatureFlags();
  if (!isFeatureActive('enableDuquenoisCannabis')) {
    throw new Error('Expected enableDuquenoisCannabis to be active by default');
  }

  updateFeatureFlags({ enableDuquenoisCannabis: false });
  if (isFeatureActive('enableDuquenoisCannabis')) {
    throw new Error('Expected enableDuquenoisCannabis to be deactivated after update');
  }

  resetFeatureFlags();
  if (!isFeatureActive('enableDuquenoisCannabis')) {
    throw new Error('Expected enableDuquenoisCannabis to reset to active');
  }
  console.log('✓ Dynamic feature flags engine verified.');

  console.log('\n[PASS] All Layer 9 Deployment & Operations tests passed successfully!\n');
}).catch(err => {
  console.error('[FAIL] Operations test failed:', err);
  process.exit(1);
});
