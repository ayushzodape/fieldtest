import assert from 'node:assert';
import {
  classifySample,
  calculateDeltaE2000,
  calculateDeltaE,
  normalizeColor,
  rgbToLab,
  DEMO_FIXTURES,
} from '../lib/classifier.ts';

console.log('[TEST] Running classifier.test.ts...');

// 1. Test Authentic Positive (Marquis Violet)
const posResult = classifySample(DEMO_FIXTURES.positive.params);
assert.strictEqual(posResult.result, 'PRESUMPTIVE_POSITIVE', 'Marquis violet must classify as PRESUMPTIVE_POSITIVE');
assert.ok(posResult.confidence >= 0.75, 'Confidence must be >= 0.75');
assert.ok((posResult.explanation.colorDifference ?? 0) >= 15.0, 'Baseline deltaE must be >= 15');
assert.ok((posResult.explanation.targetDifference ?? 100) <= 14.0, 'Target violet deltaE must be <= 14');

// 2. Test Authentic Negative (Marquis Blank / Straw)
const negResult = classifySample(DEMO_FIXTURES.negative.params);
assert.strictEqual(negResult.result, 'PRESUMPTIVE_NEGATIVE', 'Blank reagent must classify as PRESUMPTIVE_NEGATIVE');
assert.ok(negResult.confidence >= 0.75, 'Confidence must be >= 0.75');
assert.ok((negResult.explanation.colorDifference ?? 100) <= 5.0, 'Baseline deltaE must be <= 5');

// 3. Test Ambiguous Trace Faint Reaction
const incResult = classifySample(DEMO_FIXTURES.inconclusive.params);
assert.strictEqual(incResult.result, 'INCONCLUSIVE', 'Faint trace must classify as INCONCLUSIVE');

// 4. Test Invalid Capture (Missing Card / Poor Light)
const invResult = classifySample(DEMO_FIXTURES.invalid.params);
assert.strictEqual(invResult.result, 'INVALID_CAPTURE', 'Missing reference card must classify as INVALID_CAPTURE');
assert.strictEqual(invResult.confidence, 0, 'Invalid capture confidence must be 0');

// 5. Test Contaminant & Adulterant Defense (Crucial Daubert Test Cases from FT-AUDIT-01)
const contaminants = [
  { name: 'Instant Coffee / Brown Liquid', rgb: { r: 111, g: 78, b: 55 } },
  { name: 'Green Plant Matter / Chlorophyll', rgb: { r: 34, g: 139, b: 34 } },
  { name: 'Red Cough Syrup / Dye', rgb: { r: 215, g: 25, b: 35 } },
  { name: 'Motor Oil / Black Tar', rgb: { r: 25, g: 25, b: 25 } },
  { name: 'Soy Sauce', rgb: { r: 45, g: 25, b: 15 } },
  { name: 'Yellow Turmeric', rgb: { r: 235, g: 185, b: 20 } },
];

for (const c of contaminants) {
  const result = classifySample({
    observedRgb: c.rgb,
    measuredWhiteRgb: { r: 245, g: 245, b: 245 },
    baselineRgb: { r: 235, g: 230, b: 215 },
    targetPositiveRgb: { r: 68, g: 24, b: 92 },
    referenceCardDetected: true,
    testRegionDetected: true,
    lightingQuality: 'GOOD',
    focusQuality: 'GOOD',
  });

  console.log(`Contaminant test [${c.name}]: deltaE_blank=${result.explanation.colorDifference}, deltaE_target=${result.explanation.targetDifference} -> ${result.result}`);
  
  assert.notStrictEqual(
    result.result,
    'PRESUMPTIVE_POSITIVE',
    `CRITICAL FAIL: Contaminant '${c.name}' must NOT produce false positive!`
  );
  assert.strictEqual(
    result.result,
    'INCONCLUSIVE',
    `Contaminant '${c.name}' must be flagged as INCONCLUSIVE foreign reaction`
  );
}

// 6. Test CIEDE2000 Properties
// Identical colors must have deltaE = 0
const lab1 = rgbToLab({ r: 120, g: 50, b: 200 });
const deltaZero = calculateDeltaE2000(lab1, lab1);
assert.strictEqual(deltaZero, 0, 'Distance between identical colors must be 0');

// 7. Test Linear Sensor RGB Normalization
const origColor = { r: 100, g: 150, b: 200 };
const normIdentical = normalizeColor(origColor, { r: 245, g: 245, b: 245 }, { r: 245, g: 245, b: 245 });
assert.deepStrictEqual(normIdentical, origColor, 'Normalizing with ideal white must preserve original color');

console.log('[PASS] All colorimeter, CIEDE2000, and adulterant defense tests passed successfully!');
