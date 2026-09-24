/**
 * FieldTest Deterministic Color Classifier (v1.0)
 * 
 * Non-Negotiable Rules:
 * 1. Deterministic color transformation pipeline, NOT an opaque neural net.
 * 2. Reference-card normalization with Delta E color difference calculation.
 * 3. INCONCLUSIVE is a legitimate first-class result, not an error.
 * 4. Presumptive terminology only.
 * 5. Strict version tracking: 'color-v1.0'.
 */

export const CLASSIFIER_VERSION = 'color-v1.0';

export type ClassificationResult =
  | 'PRESUMPTIVE_POSITIVE'
  | 'PRESUMPTIVE_NEGATIVE'
  | 'INCONCLUSIVE'
  | 'INVALID_CAPTURE';

export interface RgbColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface LabColor {
  L: number; // 0-100
  a: number; // -128 to 127
  b: number; // -128 to 127
}

export interface ClassificationExplanation {
  lightingQuality: 'GOOD' | 'FAIR' | 'POOR';
  focusQuality: 'GOOD' | 'FAIR' | 'POOR';
  referenceCardDetected: boolean;
  testRegionDetected: boolean;
  colorDifference: number; // CIE Delta E
  observedColor: RgbColor;
  normalizedTestColor: RgbColor;
  referenceBaselineColor: RgbColor;
}

export interface Classification {
  result: ClassificationResult;
  confidence: number; // 0.0 - 1.0
  classifierVersion: string;
  explanation: ClassificationExplanation;
}

/**
 * Standard sRGB to CIELAB conversion
 */
export function rgbToLab(rgb: RgbColor): LabColor {
  // 1. Normalize sRGB to [0, 1] and apply gamma expansion
  const rNorm = rgb.r / 255;
  const gNorm = rgb.g / 255;
  const bNorm = rgb.b / 255;

  const rLinear = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  const gLinear = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  const bLinear = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  // 2. RGB to XYZ (D65 illuminant standard observer)
  const X = (rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805) * 100;
  const Y = (rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722) * 100;
  const Z = (rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505) * 100;

  // Reference white D65
  const Xn = 95.047;
  const Yn = 100.0;
  const Zn = 108.883;

  const fx = f(X / Xn);
  const fy = f(Y / Yn);
  const fz = f(Z / Zn);

  const L = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { L, a, b };
}

function f(t: number): number {
  const delta = 6 / 29;
  return t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * Math.pow(delta, 2)) + 4 / 29;
}

/**
 * CIE76 / Euclidean Delta E in LAB color space
 */
export function calculateDeltaE(c1: LabColor, c2: LabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Normalize test color against measured reference card white point
 */
export function normalizeColor(
  observedRgb: RgbColor,
  measuredWhite: RgbColor,
  idealWhite: RgbColor = { r: 245, g: 245, b: 245 }
): RgbColor {
  const scaleR = idealWhite.r / Math.max(measuredWhite.r, 1);
  const scaleG = idealWhite.g / Math.max(measuredWhite.g, 1);
  const scaleB = idealWhite.b / Math.max(measuredWhite.b, 1);

  return {
    r: Math.min(255, Math.max(0, Math.round(observedRgb.r * scaleR))),
    g: Math.min(255, Math.max(0, Math.round(observedRgb.g * scaleG))),
    b: Math.min(255, Math.max(0, Math.round(observedRgb.b * scaleB))),
  };
}

/**
 * Deterministic Classification Function
 */
export function classifySample(params: {
  observedRgb: RgbColor;
  measuredWhiteRgb?: RgbColor;
  baselineRgb?: RgbColor; // Target baseline (e.g. unreacted reagent)
  referenceCardDetected: boolean;
  testRegionDetected: boolean;
  lightingQuality?: 'GOOD' | 'FAIR' | 'POOR';
  focusQuality?: 'GOOD' | 'FAIR' | 'POOR';
}): Classification {
  const lightingQuality = params.lightingQuality || 'GOOD';
  const focusQuality = params.focusQuality || 'GOOD';

  // Step 1: Validation Gates
  if (!params.referenceCardDetected || !params.testRegionDetected || lightingQuality === 'POOR' || focusQuality === 'POOR') {
    return {
      result: 'INVALID_CAPTURE',
      confidence: 0,
      classifierVersion: CLASSIFIER_VERSION,
      explanation: {
        lightingQuality,
        focusQuality,
        referenceCardDetected: params.referenceCardDetected,
        testRegionDetected: params.testRegionDetected,
        colorDifference: 0,
        observedColor: params.observedRgb,
        normalizedTestColor: params.observedRgb,
        referenceBaselineColor: params.baselineRgb || { r: 240, g: 235, b: 220 },
      },
    };
  }

  // Step 2: Reference Normalization
  const measuredWhite = params.measuredWhiteRgb || { r: 245, g: 245, b: 245 };
  const normalizedTestColor = normalizeColor(params.observedRgb, measuredWhite);
  const referenceBaselineColor = params.baselineRgb || { r: 240, g: 235, b: 220 }; // Neutral reagent baseline

  // Step 3: Color difference calculation
  const labTest = rgbToLab(normalizedTestColor);
  const labBaseline = rgbToLab(referenceBaselineColor);
  const deltaE = parseFloat(calculateDeltaE(labTest, labBaseline).toFixed(2));

  // Step 4: Decision Boundaries & Confidence Calculation
  let result: ClassificationResult;
  let confidence: number;

  if (deltaE >= 15.0) {
    // Distinct color shift (e.g. purple/violet reaction)
    confidence = Math.min(1.0, 0.75 + (deltaE - 15.0) / 40.0);
    result = 'PRESUMPTIVE_POSITIVE';
  } else if (deltaE <= 5.0) {
    // Little to no deviation from baseline
    confidence = Math.min(1.0, 0.75 + (5.0 - deltaE) / 20.0);
    result = 'PRESUMPTIVE_NEGATIVE';
  } else {
    // Ambiguous middle band -> First class INCONCLUSIVE result!
    confidence = Math.max(0.2, 0.5 - Math.abs(deltaE - 10.0) / 20.0);
    result = 'INCONCLUSIVE';
  }

  return {
    result,
    confidence: parseFloat(confidence.toFixed(2)),
    classifierVersion: CLASSIFIER_VERSION,
    explanation: {
      lightingQuality,
      focusQuality,
      referenceCardDetected: true,
      testRegionDetected: true,
      colorDifference: deltaE,
      observedColor: params.observedRgb,
      normalizedTestColor,
      referenceBaselineColor,
    },
  };
}

/**
 * Pre-scripted Demo Fixtures for deterministic presentation resilience
 */
export const DEMO_FIXTURES: Record<
  string,
  {
    name: string;
    params: Parameters<typeof classifySample>[0];
  }
> = {
  positive: {
    name: 'Marquis Reagent Positive (Alkaloid / Heroin violet shift)',
    params: {
      observedRgb: { r: 68, g: 24, b: 92 }, // Deep violet
      measuredWhiteRgb: { r: 242, g: 240, b: 244 },
      baselineRgb: { r: 235, g: 230, b: 215 },
      referenceCardDetected: true,
      testRegionDetected: true,
      lightingQuality: 'GOOD',
      focusQuality: 'GOOD',
    },
  },
  negative: {
    name: 'Marquis Reagent Negative (No color reaction)',
    params: {
      observedRgb: { r: 232, g: 228, b: 216 }, // Pale amber/straw baseline
      measuredWhiteRgb: { r: 245, g: 245, b: 245 },
      baselineRgb: { r: 235, g: 230, b: 215 },
      referenceCardDetected: true,
      testRegionDetected: true,
      lightingQuality: 'GOOD',
      focusQuality: 'GOOD',
    },
  },
  inconclusive: {
    name: 'Ambiguous Band (Trace faint reaction / Inconclusive)',
    params: {
      observedRgb: { r: 185, g: 165, b: 180 }, // Faint grey-violet
      measuredWhiteRgb: { r: 245, g: 245, b: 245 },
      baselineRgb: { r: 235, g: 230, b: 215 },
      referenceCardDetected: true,
      testRegionDetected: true,
      lightingQuality: 'FAIR',
      focusQuality: 'GOOD',
    },
  },
  invalid: {
    name: 'Invalid Capture (Glare / Reference card missing)',
    params: {
      observedRgb: { r: 255, g: 255, b: 255 },
      referenceCardDetected: false,
      testRegionDetected: true,
      lightingQuality: 'POOR',
      focusQuality: 'POOR',
    },
  },
};
