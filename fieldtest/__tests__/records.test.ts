import assert from 'node:assert';
import { SEED_DEMO_RECORDS, getFieldTestById, TRUSTED_PUBLIC_KEY } from '../lib/records.ts';
import { verifyRecordIntegrity } from '../lib/crypto.ts';
import { CanonicalRecord } from '../types/record.ts';

console.log('[TEST] Running records.test.ts...');

async function testSeedRecordsIntegrity() {
  // Test all 3 seed records
  assert.strictEqual(SEED_DEMO_RECORDS.length, 3, 'Must have 3 seed records');

  for (const row of SEED_DEMO_RECORDS) {
    console.log(`Checking integrity of seed record: ${row.record_id} (${row.result})...`);
    
    // 1. Untampered record verification
    const validCheck = await verifyRecordIntegrity(
      row.canonical_record,
      row.record_hash,
      row.signature,
      row.public_key
    );

    assert.strictEqual(validCheck.isValid, true, `Record ${row.record_id} must be valid out of the box! Reason: ${validCheck.reason}`);
    assert.strictEqual(validCheck.hashMatch, true, `Record ${row.record_id} hash must match`);
    assert.strictEqual(validCheck.signatureValid, true, `Record ${row.record_id} signature must be valid`);

    // 2. Tampered record verification (The "Money Shot" simulation)
    const tamperedRecord: CanonicalRecord = {
      ...row.canonical_record,
      classification: {
        ...row.canonical_record.classification,
        result: row.canonical_record.classification.result === 'PRESUMPTIVE_POSITIVE'
          ? 'PRESUMPTIVE_NEGATIVE'
          : 'PRESUMPTIVE_POSITIVE',
      },
    };

    const tamperCheck = await verifyRecordIntegrity(
      tamperedRecord,
      row.record_hash,
      row.signature,
      row.public_key
    );

    assert.strictEqual(tamperCheck.isValid, false, `Tampered record ${row.record_id} must fail verification`);
    assert.strictEqual(tamperCheck.hashMatch, false, `Tampered record ${row.record_id} hash must not match`);
    assert.ok(tamperCheck.reason.includes('Hash mismatch'), 'Reason must indicate hash mismatch');
  }

  // 3. Test getFieldTestById fallback
  const fetched = await getFieldTestById('FT-2026-000184');
  assert.ok(fetched !== null, 'Must retrieve FT-2026-000184 from seed fallback');
  assert.strictEqual(fetched?.record_id, 'FT-2026-000184');

  // 4. Test sealAndSaveFieldTest binding image byte stream digest
  const { sealAndSaveFieldTest } = await import('../lib/records.ts');
  const mockImageBytes = 'data:image/jpeg;base64,forensic_test_evidence_image_raw_bytes';
  const sealedNew = await sealAndSaveFieldTest({
    operatorId: 'OP-042',
    result: 'PRESUMPTIVE_POSITIVE',
    confidence: 0.95,
    latitude: 19.076,
    longitude: 72.8777,
    accuracyMeters: 4.2,
    imageBytesOrHash: mockImageBytes,
  });

  assert.ok(sealedNew.record_id.startsWith('FT-'), 'Record ID must start with FT-');
  assert.strictEqual(sealedNew.image_sha256.length, 64, 'Image SHA-256 must be 64-char hex');
  assert.strictEqual(sealedNew.canonical_record.imageSha256, sealedNew.image_sha256, 'Canonical record must bind imageSha256');

  // Verify the newly sealed record
  const newVerification = await verifyRecordIntegrity(
    sealedNew.canonical_record,
    sealedNew.record_hash,
    sealedNew.signature,
    sealedNew.public_key
  );
  assert.strictEqual(newVerification.isValid, true, 'Newly sealed record must pass cryptographic verification');

  // Tampering with the image hash in canonical record must fail verification
  const tamperedImageCanonical = {
    ...sealedNew.canonical_record,
    imageSha256: '0000000000000000000000000000000000000000000000000000000000000000',
  };
  const tamperedImgCheck = await verifyRecordIntegrity(
    tamperedImageCanonical,
    sealedNew.record_hash,
    sealedNew.signature,
    sealedNew.public_key
  );
  assert.strictEqual(tamperedImgCheck.isValid, false, 'Tampered image digest must fail verification');

  console.log('[PASS] All seed records verified authentic, and tampering detection verified!');
}

testSeedRecordsIntegrity().catch((err) => {
  console.error('[FAIL] records.test.ts failed:', err);
  process.exit(1);
});
