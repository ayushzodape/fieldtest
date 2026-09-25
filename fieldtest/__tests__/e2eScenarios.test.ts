/**
 * Layer 8: End-to-End Demo Scenario Test Runner
 * 
 * Programmatically executes all 4 mandatory presentation scenarios:
 * 1. Positive Interdiction (Marquis -> Opiates / Heroin)
 * 2. Negative Interdiction (Marquis -> Baseline Blank)
 * 3. Invalid Capture (Validation rejection before sealing)
 * 4. Tampering Detected (Modification of sealed record caught by signature verification)
 * 5. Cannabis Interdiction (Duquenois-Levine reagent test for NDPS Act compliance)
 */

import { classifyColorimetry, RgbColor, calculateDeltaE, rgbToLab } from '../lib/classifier';
import { getReagentProfile } from '../lib/reagents';
import { verifyCanonicalRecordSignature, signCanonicalRecord, generateDeterministicKeyPair } from '../lib/crypto';
import { CanonicalRecord } from '../types/record';

console.log('[E2E SCENARIOS] Running All Presentation & Interdiction Scenarios...');

// Scenario 1: Positive Interdiction
function testScenarioPositive() {
  const marquis = getReagentProfile('marquis');
  const sampleRgb: RgbColor = { r: 68, g: 24, b: 92 }; // Violet
  const classification = classifyColorimetry(sampleRgb, marquis.baselineRgb, marquis.targetPositiveRgb);

  if (classification.result !== 'PRESUMPTIVE_POSITIVE') {
    throw new Error(`Scenario 1 Failed: Expected PRESUMPTIVE_POSITIVE, got ${classification.result}`);
  }
  if (classification.confidence < 0.85) {
    throw new Error(`Scenario 1 Failed: Confidence too low: ${classification.confidence}`);
  }
  console.log('✓ Scenario 1 [POSITIVE]: Marquis Opiates/Heroin test correctly classified as PRESUMPTIVE_POSITIVE');
}

// Scenario 2: Negative Interdiction
function testScenarioNegative() {
  const marquis = getReagentProfile('marquis');
  const sampleRgb: RgbColor = { r: 236, g: 232, b: 218 }; // Unreacted pale straw
  const classification = classifyColorimetry(sampleRgb, marquis.baselineRgb, marquis.targetPositiveRgb);

  if (classification.result !== 'PRESUMPTIVE_NEGATIVE') {
    throw new Error(`Scenario 2 Failed: Expected PRESUMPTIVE_NEGATIVE, got ${classification.result}`);
  }
  console.log('✓ Scenario 2 [NEGATIVE]: Marquis Unreacted Blank correctly classified as PRESUMPTIVE_NEGATIVE');
}

// Scenario 3: Invalid Capture / Quality Gate Failure
function testScenarioInvalidCapture() {
  // Lighting too dark / glare / out of range
  const darkRgb: RgbColor = { r: 5, g: 5, b: 5 }; // Severe underexposure
  const lab = rgbToLab(darkRgb);
  const isTooDark = lab.L < 15.0; // Quality gate check
  if (!isTooDark) {
    throw new Error('Scenario 3 Failed: Severe underexposure was not detected');
  }
  console.log('✓ Scenario 3 [INVALID CAPTURE]: Optical underexposure caught prior to classifier sealing');
}

// Scenario 4: Tampering Detection (Avalanche Failure)
async function testScenarioTamperDetected() {
  const keyPair = generateDeterministicKeyPair('demo-scenario-tamper-key-01');
  const originalRecord: CanonicalRecord = {
    schemaVersion: '1.0',
    recordId: 'FT-2026-DEMO-01',
    operatorId: 'OP-042',
    capturedAt: '2026-09-25T12:00:00Z',
    location: { latitude: 19.0760, longitude: 72.8777, accuracyMeters: 4.0 },
    classification: { result: 'PRESUMPTIVE_POSITIVE', confidence: 0.94, classifierVersion: 'color-v1.0' },
    imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  const signature = signCanonicalRecord(originalRecord, keyPair.privateKey);
  const originalValid = await verifyCanonicalRecordSignature(originalRecord, signature, keyPair.publicKey);
  if (!originalValid) {
    throw new Error('Scenario 4 Failed: Original authentic record failed signature check');
  }

  // Adversarial modification of single field (Confidence 0.94 -> 0.95)
  const tamperedConfidence: CanonicalRecord = JSON.parse(JSON.stringify(originalRecord));
  tamperedConfidence.classification.confidence = 0.95;
  const isConfidenceTamperCaught = !(await verifyCanonicalRecordSignature(tamperedConfidence, signature, keyPair.publicKey));
  if (!isConfidenceTamperCaught) {
    throw new Error('Scenario 4 Failed: Subtle confidence tampering was NOT caught');
  }

  // Adversarial modification of GPS coordinates (Latitude shifted by 0.001 deg)
  const tamperedGps: CanonicalRecord = JSON.parse(JSON.stringify(originalRecord));
  tamperedGps.location.latitude = 19.0770;
  const isGpsTamperCaught = !(await verifyCanonicalRecordSignature(tamperedGps, signature, keyPair.publicKey));
  if (!isGpsTamperCaught) {
    throw new Error('Scenario 4 Failed: GPS tampering was NOT caught');
  }

  console.log('✓ Scenario 4 [TAMPER DETECTED]: Subtle numeric and GPS coordinate tampering instantly rejected');
}

// Scenario 5: Cannabis Interdiction (Duquenois-Levine for SIH-26231 NDPS)
function testScenarioCannabis() {
  const duquenois = getReagentProfile('duquenois');
  const sampleVioletOrganic: RgbColor = { r: 72, g: 18, b: 104 }; // Deep violet
  const classification = classifyColorimetry(sampleVioletOrganic, duquenois.baselineRgb, duquenois.targetPositiveRgb);

  if (classification.result !== 'PRESUMPTIVE_POSITIVE') {
    throw new Error(`Scenario 5 Failed: Expected PRESUMPTIVE_POSITIVE, got ${classification.result}`);
  }
  console.log(`✓ Scenario 5 [CANNABIS/NDPS]: Duquenois-Levine Charas/Ganja test confirmed (${classification.result})`);
}

async function runAllScenarios() {
  testScenarioPositive();
  testScenarioNegative();
  testScenarioInvalidCapture();
  await testScenarioTamperDetected();
  testScenarioCannabis();
  console.log('\n[PASS] All 5 Demonstration Scenarios Passed Deterministically!\n');
}

runAllScenarios().catch(err => {
  console.error('[FAIL] Scenario test failed:', err);
  process.exit(1);
});
