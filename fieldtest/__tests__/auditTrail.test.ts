import assert from 'node:assert';
import {
  createInitialAuditChain,
  verifyAuditChain,
  appendAuditEvent,
  AuditChain,
} from '../lib/auditTrail';
import { CanonicalRecord } from '../types/record';

async function runAuditTests() {
  console.log('[TEST] Running auditTrail.test.ts (Cryptographic Hash Chain Integrity)...');

  const testRecord: CanonicalRecord = {
    schemaVersion: '1.0',
    recordId: 'FT-2026-AUDIT-001',
    operatorId: 'OP-042',
    capturedAt: '2026-09-25T12:00:00Z',
    location: {
      latitude: 19.076,
      longitude: 72.8777,
      accuracyMeters: 8.4,
    },
    classification: {
      result: 'PRESUMPTIVE_POSITIVE',
      confidence: 0.95,
      classifierVersion: 'color-v1.0',
    },
    imageSha256: '8e4a9f3b1c2d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
  };

  // 1. Create and verify valid audit chain
  const chain = await createInitialAuditChain(testRecord);
  assert.strictEqual(chain.events.length, 4, 'Initial chain must contain 4 events');
  assert.strictEqual(chain.events[0].eventType, 'RECORD_CREATED');
  assert.strictEqual(chain.events[1].eventType, 'SAMPLE_CAPTURED');
  assert.strictEqual(chain.events[2].eventType, 'COLOR_CLASSIFIED');
  assert.strictEqual(chain.events[3].eventType, 'RECORD_SEALED');

  const initialVerification = await verifyAuditChain(chain);
  assert.strictEqual(initialVerification.isValid, true, 'Original chain must be valid');
  assert.strictEqual(initialVerification.totalEvents, 4);
  console.log('[PASS] Initial audit chain verified with 4 linked events.');

  // 2. Append Event 5: RECORD_VERIFIED
  await appendAuditEvent(chain, {
    eventType: 'RECORD_VERIFIED',
    operatorId: 'AUDITOR-01',
    eventData: { verificationMethod: 'Ed25519_STANDALONE', result: 'VERIFIED' },
  });
  const extendedVerification = await verifyAuditChain(chain);
  assert.strictEqual(extendedVerification.isValid, true, 'Extended chain must be valid');
  assert.strictEqual(chain.events.length, 5);
  console.log('[PASS] Appended Event 5 (RECORD_VERIFIED) correctly linked.');

  // 3. Test Tampering Scenario A: Modifying an event's data payload (e.g. classification result)
  const tamperedChain: AuditChain = JSON.parse(JSON.stringify(chain));
  // Tamper with Event 3: change result from PRESUMPTIVE_POSITIVE to PRESUMPTIVE_NEGATIVE
  tamperedChain.events[2].eventData = {
    ...tamperedChain.events[2].eventData,
    classification: {
      ...testRecord.classification,
      result: 'PRESUMPTIVE_NEGATIVE',
    },
  };

  const payloadTamperCheck = await verifyAuditChain(tamperedChain);
  assert.strictEqual(payloadTamperCheck.isValid, false, 'Tampered payload must fail verification');
  assert.strictEqual(payloadTamperCheck.brokenAtIndex, 2, 'Must pinpoint tampering at event index 2');
  console.log(`[PASS] Tamper detection verified: ${payloadTamperCheck.reason}`);

  // 4. Test Tampering Scenario B: Modifying an event hash and updating it without updating successor
  const linkTamperChain: AuditChain = JSON.parse(JSON.stringify(chain));
  linkTamperChain.events[1].eventHash = 'f'.repeat(64); // Fake hash
  const linkTamperCheck = await verifyAuditChain(linkTamperChain);
  assert.strictEqual(linkTamperCheck.isValid, false, 'Tampered hash link must fail verification');
  console.log(`[PASS] Link breakage detected: ${linkTamperCheck.reason}`);

  // 5. Test Tampering Scenario C: Deleting an event in the middle (Attempt to conceal evidence)
  const deletedEventChain: AuditChain = JSON.parse(JSON.stringify(chain));
  deletedEventChain.events.splice(1, 1); // Delete Event 2 (SAMPLE_CAPTURED)
  const deletionCheck = await verifyAuditChain(deletedEventChain);
  assert.strictEqual(deletionCheck.isValid, false, 'Event deletion must fail verification');
  console.log(`[PASS] Event deletion detected: ${deletionCheck.reason}`);

  console.log('[PASS] All audit trail hash chain integrity tests passed successfully!');
}

runAuditTests().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
