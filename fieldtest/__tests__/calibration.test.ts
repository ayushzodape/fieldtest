import assert from 'node:assert';
import { generateLaboratoryCalibrationDataset } from '../lib/calibrationData';
import {
  evaluateClassifierOnDataset,
  runFiveFoldCrossValidation,
  PRODUCTION_GATES,
} from '../lib/validationEngine';
import { generateEvidenceImage } from '../lib/imageGenerator';
import { sha256Bytes } from '../lib/crypto';

async function runTests() {
  console.log('[TEST] Running calibration.test.ts (Empirical Forensic Validation)...');

  // 1. Generate the calibration dataset
  const dataset = generateLaboratoryCalibrationDataset();
  console.log(`[DATASET] Generated ${dataset.length} empirical laboratory calibration samples.`);
  assert.ok(dataset.length >= 350, `Calibration dataset must contain >= 350 samples (got ${dataset.length})`);

  // 2. Evaluate overall statistical metrics
  const metrics = evaluateClassifierOnDataset(dataset);
  console.log('\n--- STATISTICAL VALIDATION METRICS ---');
  console.log(`Total Samples Evaluated: ${metrics.totalSamples}`);
  console.log(`True Positives (TP):     ${metrics.truePositives}`);
  console.log(`True Negatives (TN):     ${metrics.trueNegatives}`);
  console.log(`False Positives (FP):    ${metrics.falsePositives} (Must be 0)`);
  console.log(`False Negatives (FN):    ${metrics.falseNegatives}`);
  console.log(`Inconclusive (INC):      ${metrics.inconclusiveCount} (Rate: ${(metrics.inconclusiveRate * 100).toFixed(1)}%)`);
  console.log(`Invalid Captures:        ${metrics.invalidCaptureCount}`);
  console.log('--------------------------------------');
  console.log(`Sensitivity (TPR):       ${(metrics.sensitivity * 100).toFixed(2)}% (Required: >= ${(PRODUCTION_GATES.MIN_SENSITIVITY * 100)}%)`);
  console.log(`Specificity (TNR):       ${(metrics.specificity * 100).toFixed(2)}% (Required: >= ${(PRODUCTION_GATES.MIN_SPECIFICITY * 100)}%)`);
  console.log(`Positive Predictive Val: ${(metrics.ppv * 100).toFixed(2)}% (Required: >= ${(PRODUCTION_GATES.MIN_PPV * 100)}%)`);
  console.log(`Negative Predictive Val: ${(metrics.npv * 100).toFixed(2)}% (Required: >= ${(PRODUCTION_GATES.MIN_NPV * 100)}%)`);
  console.log(`Cohen's Kappa (κ):       ${metrics.cohensKappa.toFixed(3)} (Required: >= ${PRODUCTION_GATES.MIN_COHENS_KAPPA})`);
  console.log(`ROC-AUC:                 ${metrics.rocAuc.toFixed(3)} (Required: >= ${PRODUCTION_GATES.MIN_ROC_AUC})`);
  console.log('--------------------------------------\n');

  // Assertions on production gates
  assert.strictEqual(metrics.falsePositives, 0, 'CRITICAL: Zero false positives allowed (no false accusations)');
  assert.ok(metrics.sensitivity >= PRODUCTION_GATES.MIN_SENSITIVITY, `Sensitivity must be >= ${PRODUCTION_GATES.MIN_SENSITIVITY}`);
  assert.ok(metrics.specificity >= PRODUCTION_GATES.MIN_SPECIFICITY, `Specificity must be >= ${PRODUCTION_GATES.MIN_SPECIFICITY}`);
  assert.ok(metrics.ppv >= PRODUCTION_GATES.MIN_PPV, `PPV must be >= ${PRODUCTION_GATES.MIN_PPV}`);
  assert.ok(metrics.npv >= PRODUCTION_GATES.MIN_NPV, `NPV must be >= ${PRODUCTION_GATES.MIN_NPV}`);
  assert.ok(metrics.inconclusiveRate <= PRODUCTION_GATES.MAX_INCONCLUSIVE_RATE, `Inconclusive rate must be <= ${PRODUCTION_GATES.MAX_INCONCLUSIVE_RATE}`);
  assert.ok(metrics.cohensKappa >= PRODUCTION_GATES.MIN_COHENS_KAPPA, `Cohen's Kappa must be >= ${PRODUCTION_GATES.MIN_COHENS_KAPPA}`);
  assert.ok(metrics.rocAuc >= PRODUCTION_GATES.MIN_ROC_AUC, `ROC-AUC must be >= ${PRODUCTION_GATES.MIN_ROC_AUC}`);

  // 3. Run 5-Fold Cross Validation
  console.log('[CROSS-VALIDATION] Running 5-fold cross validation...');
  const cvResult = runFiveFoldCrossValidation(dataset);
  console.log(`Mean CV Sensitivity: ${(cvResult.meanSensitivity * 100).toFixed(2)}%`);
  console.log(`Mean CV Specificity: ${(cvResult.meanSpecificity * 100).toFixed(2)}%`);
  console.log(`Mean CV ROC-AUC:     ${cvResult.meanRocAuc.toFixed(3)}`);
  console.log(`Mean CV Cohen's κ:   ${cvResult.meanCohensKappa.toFixed(3)}`);
  assert.ok(cvResult.passedCrossValidation, 'Cross-validation must pass all statistical quality gates across all folds');

  // 4. Test Authentic Image Generation & Cryptographic Byte Binding
  console.log('\n[IMAGE BYTES] Testing authentic evidence image byte generation & SHA-256 binding...');
  const testObserved = { r: 68, g: 24, b: 92 }; // Heroin violet
  const imageArtifact = await generateEvidenceImage({
    observedRgb: testObserved,
    measuredWhiteRgb: { r: 245, g: 245, b: 245 },
    recordId: 'FT-2026-CAL-TEST',
  });

  // Verify BMP header
  assert.strictEqual(imageArtifact.imageBytes[0], 0x42, 'BMP Header must start with 0x42 (B)');
  assert.strictEqual(imageArtifact.imageBytes[1], 0x4d, 'BMP Header must continue with 0x4D (M)');
  assert.strictEqual(imageArtifact.width, 240, 'Width must be 240px');
  assert.strictEqual(imageArtifact.height, 180, 'Height must be 180px');
  assert.ok(imageArtifact.imageBytes.byteLength > 54, 'Image bytes must include headers and pixel array');
  assert.ok(imageArtifact.dataUri.startsWith('data:image/bmp;base64,'), 'Data URI must be valid base64 BMP');

  // Recompute SHA-256 independently and verify bit-for-bit equivalence
  const recalculatedSha = await sha256Bytes(imageArtifact.imageBytes);
  assert.strictEqual(
    imageArtifact.imageSha256,
    recalculatedSha,
    'Cryptographic binding error: imageSha256 must exactly equal SHA-256 of raw image bytes!'
  );
  console.log(`[PASS] Image bytes generated (${imageArtifact.imageBytes.byteLength} bytes) with bound SHA-256: ${imageArtifact.imageSha256.substring(0, 16)}...`);

  console.log('\n[PASS] All laboratory calibration, ROC-AUC, 5-fold cross validation, and image binding tests passed successfully!');
}

runTests().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
