/**
 * Layer 8: Performance Latency Benchmarks
 * 
 * Verifies that the system meets strict operational performance SLAs under field conditions:
 * 1. Sealing Latency: < 2000 ms (Target: < 500 ms)
 * 2. Verification Latency: < 500 ms (Target: < 50 ms)
 * 3. Classifier CIEDE2000 Latency: < 100 ms (Target: < 5 ms)
 * 4. Canonical JSON Serialization: < 50 ms (Target: < 1 ms)
 */

import { performance } from 'perf_hooks';
import { classifyColorimetry, RgbColor } from '../lib/classifier';
import { canonicalizeRecord, sha256Hex, generateDeterministicKeyPair, signCanonicalRecord, verifyCanonicalRecordSignature } from '../lib/crypto';
import { CanonicalRecord } from '../types/record';
import { generateCalibrationImageBytes } from '../lib/imageGenerator';

console.log('[BENCHMARKS] Starting Performance & SLA Validation Suite...\n');

const SLA = {
  maxSealingMs: 2000,
  maxVerificationMs: 500,
  maxClassifierMs: 100,
  maxCanonicalizationMs: 50,
};

async function runBenchmarks() {
  const keyPair = generateDeterministicKeyPair('benchmark-eval-seed-01');

  // Benchmark 1: Classifier CIEDE2000 Latency (100 iterations)
  const sampleRgb: RgbColor = { r: 68, g: 24, b: 92 };
  const baselineRgb: RgbColor = { r: 236, g: 232, b: 218 };
  const targetRgb: RgbColor = { r: 68, g: 24, b: 92 };

  const startClassifier = performance.now();
  const iterationsClassifier = 100;
  for (let i = 0; i < iterationsClassifier; i++) {
    classifyColorimetry(sampleRgb, baselineRgb, targetRgb);
  }
  const endClassifier = performance.now();
  const totalClassifierTime = endClassifier - startClassifier;
  const avgClassifierMs = totalClassifierTime / iterationsClassifier;

  console.log(`1. Classifier Latency (CIEDE2000 Two-Vector):`);
  console.log(`   Total (${iterationsClassifier} runs): ${totalClassifierTime.toFixed(2)} ms`);
  console.log(`   Average per test: ${avgClassifierMs.toFixed(3)} ms (SLA Limit: < ${SLA.maxClassifierMs} ms)`);
  if (avgClassifierMs >= SLA.maxClassifierMs) {
    throw new Error(`Classifier latency exceeded SLA: ${avgClassifierMs} ms >= ${SLA.maxClassifierMs} ms`);
  }
  console.log(`   ✓ STATUS: PASSED (${(SLA.maxClassifierMs / avgClassifierMs).toFixed(0)}x faster than SLA requirement)\n`);

  // Benchmark 2: Canonical JSON Serialization & Hashing (500 iterations)
  const record: CanonicalRecord = {
    schemaVersion: '1.0',
    recordId: 'FT-2026-BENCH-01',
    operatorId: 'OP-042',
    capturedAt: '2026-09-25T14:00:00Z',
    location: { latitude: 19.0760, longitude: 72.8777, accuracyMeters: 3.5 },
    classification: { result: 'PRESUMPTIVE_POSITIVE', confidence: 0.94, classifierVersion: 'color-v1.0' },
    imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  const startCanonical = performance.now();
  const iterationsCanonical = 500;
  for (let i = 0; i < iterationsCanonical; i++) {
    canonicalizeRecord(record);
  }
  const endCanonical = performance.now();
  const totalCanonicalTime = endCanonical - startCanonical;
  const avgCanonicalMs = totalCanonicalTime / iterationsCanonical;

  console.log(`2. RFC 8785 Canonical Serialization:`);
  console.log(`   Total (${iterationsCanonical} runs): ${totalCanonicalTime.toFixed(2)} ms`);
  console.log(`   Average per record: ${avgCanonicalMs.toFixed(3)} ms (SLA Limit: < ${SLA.maxCanonicalizationMs} ms)`);
  if (avgCanonicalMs >= SLA.maxCanonicalizationMs) {
    throw new Error(`Canonicalization latency exceeded SLA: ${avgCanonicalMs} ms >= ${SLA.maxCanonicalizationMs} ms`);
  }
  console.log(`   ✓ STATUS: PASSED\n`);

  // Benchmark 3: Full End-to-End Sealing Latency
  // Generates 24-bit image bytes, hashes image, creates canonical record, signs with Ed25519
  const startSealing = performance.now();
  const imageBytes = generateCalibrationImageBytes({ testRgb: sampleRgb, blankRgb: baselineRgb, width: 64, height: 64 });
  const imageSha256 = await sha256Hex(imageBytes);
  const benchmarkRecord: CanonicalRecord = { ...record, imageSha256 };
  const signature = signCanonicalRecord(benchmarkRecord, keyPair.privateKey);
  const endSealing = performance.now();
  const sealingDurationMs = endSealing - startSealing;

  console.log(`3. End-to-End Sealing Pipeline Latency:`);
  console.log(`   Measured Latency: ${sealingDurationMs.toFixed(2)} ms (SLA Limit: < ${SLA.maxSealingMs} ms)`);
  if (sealingDurationMs >= SLA.maxSealingMs) {
    throw new Error(`Sealing latency exceeded SLA: ${sealingDurationMs} ms >= ${SLA.maxSealingMs} ms`);
  }
  console.log(`   ✓ STATUS: PASSED (${(SLA.maxSealingMs / sealingDurationMs).toFixed(0)}x faster than SLA requirement)\n`);

  // Benchmark 4: Verification Latency (Canonical hash check + Ed25519 signature check)
  const startVerification = performance.now();
  const iterationsVerification = 50;
  for (let i = 0; i < iterationsVerification; i++) {
    const valid = await verifyCanonicalRecordSignature(benchmarkRecord, signature, keyPair.publicKey);
    if (!valid) throw new Error('Verification failed in benchmark loop');
  }
  const endVerification = performance.now();
  const totalVerificationTime = endVerification - startVerification;
  const avgVerificationMs = totalVerificationTime / iterationsVerification;

  console.log(`4. Full Verification Latency:`);
  console.log(`   Total (${iterationsVerification} runs): ${totalVerificationTime.toFixed(2)} ms`);
  console.log(`   Average per verification: ${avgVerificationMs.toFixed(2)} ms (SLA Limit: < ${SLA.maxVerificationMs} ms)`);
  if (avgVerificationMs >= SLA.maxVerificationMs) {
    throw new Error(`Verification latency exceeded SLA: ${avgVerificationMs} ms >= ${SLA.maxVerificationMs} ms`);
  }
  console.log(`   ✓ STATUS: PASSED (${(SLA.maxVerificationMs / avgVerificationMs).toFixed(0)}x faster than SLA requirement)\n`);

  console.log('================================================================================');
  console.log('   ALL PERFORMANCE BENCHMARKS SATISFY PRODUCTION SLA THRESHOLDS');
  console.log('================================================================================\n');
}

runBenchmarks().catch(err => {
  console.error('[FAIL] Benchmark execution failed:', err);
  process.exit(1);
});
