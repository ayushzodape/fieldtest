import assert from 'node:assert';
import {
  evaluateClockSkew,
  evaluateGeospatialIntegrity,
  generateSecureRecordId,
  MAX_CLOCK_SKEW_SECONDS,
} from '../lib/temporalGeospatial';

async function runTemporalGeospatialTests() {
  console.log('[TEST] Running temporalGeospatial.test.ts (Layer 4 Integrity)...');

  // --- 1. Dual Timestamp & Clock Skew Tests ---
  console.log('[TEMPORAL] Testing clock skew detection and dual timestamps...');

  // Test 1a: Synchronized clocks (within 1 second)
  const now = new Date();
  const syncDevice = now.toISOString();
  const syncServer = new Date(now.getTime() + 500).toISOString();
  const syncResult = evaluateClockSkew(syncDevice, syncServer);
  assert.strictEqual(syncResult.isValid, true, 'Synchronized clocks must be valid');
  assert.ok(syncResult.skewSeconds <= 1.0, 'Skew must be <= 1.0s');
  console.log(`[PASS] Synchronized clock verified (skew: ${syncResult.skewSeconds}s)`);

  // Test 1b: Acceptable skew within 120-second tolerance (e.g. 45s delta)
  const acceptableDevice = new Date(now.getTime() - 45000).toISOString();
  const acceptableResult = evaluateClockSkew(acceptableDevice, now.toISOString());
  assert.strictEqual(acceptableResult.isValid, true, 'Skew <= 120s must be valid');
  assert.strictEqual(acceptableResult.skewSeconds, 45, 'Skew must equal 45s');
  assert.strictEqual(acceptableResult.direction, 'BEHIND_SERVER');
  console.log(`[PASS] Acceptable clock skew verified (skew: ${acceptableResult.skewSeconds}s)`);

  // Test 1c: Critical Violation - Future timestamp spoofing (+180s)
  const futureDevice = new Date(now.getTime() + 180000).toISOString();
  const futureResult = evaluateClockSkew(futureDevice, now.toISOString());
  assert.strictEqual(futureResult.isValid, false, 'Future timestamp > 120s must fail');
  assert.strictEqual(futureResult.direction, 'AHEAD_OF_SERVER');
  assert.ok(futureResult.skewSeconds >= 180, 'Skew must be >= 180s');
  assert.ok(futureResult.reason?.includes('Clock skew violation'), 'Must report clock skew violation');
  console.log(`[PASS] Future timestamp violation caught: ${futureResult.reason}`);

  // Test 1d: Critical Violation - Backdating attack (-3600s / 1 hour backdated)
  const backdatedDevice = new Date(now.getTime() - 3600000).toISOString();
  const backdatedResult = evaluateClockSkew(backdatedDevice, now.toISOString());
  assert.strictEqual(backdatedResult.isValid, false, 'Backdated timestamp > 120s must fail');
  assert.strictEqual(backdatedResult.direction, 'BEHIND_SERVER');
  assert.ok(backdatedResult.skewSeconds >= 3600, 'Skew must be >= 3600s');
  assert.ok(backdatedResult.reason?.includes('Possible temporal backdating attempt'), 'Must flag backdating attack');
  console.log(`[PASS] Backdating attack caught: ${backdatedResult.reason}`);

  // --- 2. Geospatial Fix & Anti-Spoofing Tests ---
  console.log('\n[GEOSPATIAL] Testing GNSS fix evaluation and anti-spoofing detection...');

  // Test 2a: High accuracy 3D GNSS fix
  const gnssFix = evaluateGeospatialIntegrity({
    latitude: 19.076,
    longitude: 72.8777,
    accuracyMeters: 6.4,
    altitudeMeters: 14.2,
    mocked: false,
    hdop: 1.1,
    satellitesTracked: 11,
  });
  assert.strictEqual(gnssFix.integrityStatus, 'VERIFIED_GNSS', 'High-accuracy GPS must be VERIFIED_GNSS');
  assert.strictEqual(gnssFix.fixType, '3D', 'Accuracy <= 50m must yield 3D fix');
  assert.strictEqual(gnssFix.isMocked, false);
  console.log('[PASS] Authentic 3D GNSS fix verified.');

  // Test 2b: Anti-Spoofing Alert - Mock Location Provider Detected
  const spoofedFix = evaluateGeospatialIntegrity({
    latitude: 40.7128,
    longitude: -74.006,
    accuracyMeters: 5.0,
    mocked: true, // Operating system reported mock location provider!
  });
  assert.strictEqual(spoofedFix.integrityStatus, 'SPOOF_MOCK_DETECTED', 'Mock provider must trigger SPOOF_MOCK_DETECTED');
  assert.strictEqual(spoofedFix.isMocked, true);
  console.log('[PASS] Mock location provider spoofing detected and rejected.');

  // Test 2c: Coarse Cell Tower fallback (indoor / underground)
  const cellFix = evaluateGeospatialIntegrity({
    latitude: 19.08,
    longitude: 72.88,
    accuracyMeters: 650.0,
    mocked: false,
  });
  assert.strictEqual(cellFix.integrityStatus, 'COARSE_CELL_FALLBACK', 'Accuracy > 300m must be COARSE_CELL_FALLBACK');
  assert.strictEqual(cellFix.fixType, 'CELL_TOWER');
  console.log('[PASS] Coarse cell tower fallback correctly identified.');

  // Test 2d: Missing / Null location
  const noFix = evaluateGeospatialIntegrity({
    latitude: 0,
    longitude: 0,
    accuracyMeters: 5000,
    mocked: false,
  });
  assert.strictEqual(noFix.integrityStatus, 'INVALID_NO_FIX', 'Zero coordinates must yield INVALID_NO_FIX');
  assert.strictEqual(noFix.fixType, 'NONE');
  console.log('[PASS] Missing GPS fix correctly identified.');

  // --- 3. Secure Record ID (UUID v4) Tests ---
  console.log('\n[RECORD ID] Testing cryptographically secure UUID v4 ID generation...');
  const id1 = generateSecureRecordId(2026);
  const id2 = generateSecureRecordId(2026);

  assert.ok(id1.recordId.startsWith('FT-2026-'), 'Record ID must begin with FT-2026-');
  assert.notStrictEqual(id1.recordId, id2.recordId, 'Generated IDs must be unique');
  assert.strictEqual(id1.uuid.length, 36, 'Full UUID must be 36 characters');
  assert.strictEqual(id1.uuid.charAt(14), '4', 'UUID version nibble must be 4 (UUID v4)');

  // Verify zero collisions across 500 generated IDs
  const idSet = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const gen = generateSecureRecordId(2026);
    assert.strictEqual(idSet.has(gen.recordId), false, 'Duplicate record ID detected!');
    idSet.add(gen.recordId);
  }
  console.log('[PASS] 500 secure UUID v4 record IDs generated with zero collisions.');

  console.log('\n[PASS] All Layer 4 Temporal & Geospatial Integrity tests passed successfully!');
}

runTemporalGeospatialTests().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
