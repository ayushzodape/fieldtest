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
  colorDifference: number; // CIE Delta E from baseline blank
  targetDifference?: number; // CIE Delta E from target positive
  observedColor: RgbColor;
  normalizedTestColor: RgbColor;
  referenceBaselineColor: RgbColor;
  targetPositiveColor?: RgbColor;
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
 * CIEDE2000 Color Difference Metric (ISO/CIE 11664-6 / ASTM E2329 compliant)
 * Perceptually uniform metric addressing CIE76 non-uniformity in blue/purple and saturated regions.
 */
export function calculateDeltaE2000(c1: LabColor, c2: LabColor): number {
  const { L: L1, a: a1, b: b1 } = c1;
  const { L: L2, a: a2, b: b2 } = c2;

  const avgL = (L1 + L2) / 2;
  const c1Val = Math.hypot(a1, b1);
  const c2Val = Math.hypot(a2, b2);
  const avgC = (c1Val + c2Val) / 2;

  const pow7 = (x: number) => Math.pow(x, 7);
  const G = 0.5 * (1 - Math.sqrt(pow7(avgC) / (pow7(avgC) + pow7(25))));

  const a1Prime = (1 + G) * a1;
  const a2Prime = (1 + G) * a2;

  const c1Prime = Math.hypot(a1Prime, b1);
  const c2Prime = Math.hypot(a2Prime, b2);
  const avgCPrime = (c1Prime + c2Prime) / 2;

  const radToDeg = (r: number) => (r * 180) / Math.PI;
  const degToRad = (d: number) => (d * Math.PI) / 180;

  const getHPrime = (aP: number, bP: number) => {
    if (aP === 0 && bP === 0) return 0;
    const deg = radToDeg(Math.atan2(bP, aP));
    return deg >= 0 ? deg : deg + 360;
  };

  const h1Prime = getHPrime(a1Prime, b1);
  const h2Prime = getHPrime(a2Prime, b2);

  let deltaHPrimeAngle = 0;
  if (c1Prime !== 0 && c2Prime !== 0) {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) {
      deltaHPrimeAngle = diff;
    } else if (diff > 180) {
      deltaHPrimeAngle = diff - 360;
    } else {
      deltaHPrimeAngle = diff + 360;
    }
  }

  const deltaLPrime = L2 - L1;
  const deltaCPrime = c2Prime - c1Prime;
  const deltaHPrime =
    2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(degToRad(deltaHPrimeAngle / 2));

  let avgHPrime = 0;
  if (c1Prime !== 0 && c2Prime !== 0) {
    const diff = Math.abs(h1Prime - h2Prime);
    const sum = h1Prime + h2Prime;
    if (diff <= 180) {
      avgHPrime = sum / 2;
    } else if (sum < 360) {
      avgHPrime = (sum + 360) / 2;
    } else {
      avgHPrime = (sum - 360) / 2;
    }
  } else {
    avgHPrime = h1Prime + h2Prime;
  }

  const T =
    1 -
    0.17 * Math.cos(degToRad(avgHPrime - 30)) +
    0.24 * Math.cos(degToRad(2 * avgHPrime)) +
    0.32 * Math.cos(degToRad(3 * avgHPrime + 6)) -
    0.2 * Math.cos(degToRad(4 * avgHPrime - 63));

  const deltaTheta = 30 * Math.exp(-Math.pow((avgHPrime - 275) / 25, 2));
  const RC = 2 * Math.sqrt(pow7(avgCPrime) / (pow7(avgCPrime) + pow7(25)));
  const SL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const SC = 1 + 0.045 * avgCPrime;
  const SH = 1 + 0.015 * avgCPrime * T;
  const RT = -Math.sin(degToRad(2 * deltaTheta)) * RC;

  const dL = deltaLPrime / SL;
  const dC = deltaCPrime / SC;
  const dH = deltaHPrime / SH;

  return Math.sqrt(dL * dL + dC * dC + dH * dH + RT * dC * dH);
}

/**
 * CIE76 / Euclidean Delta E in LAB color space
 */
export function calculateDeltaE76(c1: LabColor, c2: LabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Standard Delta E calculation (defaults to CIEDE2000)
 */
export function calculateDeltaE(c1: LabColor, c2: LabColor): number {
  return calculateDeltaE2000(c1, c2);
}

/**
 * Linear sensor RGB chromatic normalization
 * Converts sRGB to linear, scales relative to reference card white point,
 * and converts back to sRGB, preventing non-linear gamma chromaticity distortion.
 */
export function normalizeColor(
  observedRgb: RgbColor,
  measuredWhite: RgbColor,
  idealWhite: RgbColor = { r: 245, g: 245, b: 245 }
): RgbColor {
  const toLinear = (c: number) => {
    const norm = Math.max(0, Math.min(255, c)) / 255;
    return norm > 0.04045 ? Math.pow((norm + 0.055) / 1.055, 2.4) : norm / 12.92;
  };

  const toSrgb = (lin: number) => {
    const val = lin > 0.0031308 ? 1.055 * Math.pow(lin, 1 / 2.4) - 0.055 : 12.92 * lin;
    return Math.min(255, Math.max(0, Math.round(val * 255)));
  };

  const obsLinearR = toLinear(observedRgb.r);
  const obsLinearG = toLinear(observedRgb.g);
  const obsLinearB = toLinear(observedRgb.b);

  const whiteLinearR = Math.max(toLinear(measuredWhite.r), 0.001);
  const whiteLinearG = Math.max(toLinear(measuredWhite.g), 0.001);
  const whiteLinearB = Math.max(toLinear(measuredWhite.b), 0.001);

  const idealLinearR = toLinear(idealWhite.r);
  const idealLinearG = toLinear(idealWhite.g);
  const idealLinearB = toLinear(idealWhite.b);

  const scaleR = idealLinearR / whiteLinearR;
  const scaleG = idealLinearG / whiteLinearG;
  const scaleB = idealLinearB / whiteLinearB;

  return {
    r: toSrgb(obsLinearR * scaleR),
    g: toSrgb(obsLinearG * scaleG),
    b: toSrgb(obsLinearB * scaleB),
  };
}

/**
 * Deterministic Classification Function
 * Uses two-vector colorimetry: checks departure from reagent blank AND convergence to target analyte chromophore.
 */
export function classifySample(params: {
  observedRgb: RgbColor;
  measuredWhiteRgb?: RgbColor;
  baselineRgb?: RgbColor; // Target baseline (e.g. unreacted reagent)
  targetPositiveRgb?: RgbColor; // Expected analyte reaction product (e.g. violet for Marquis)
  referenceCardDetected: boolean;
  testRegionDetected: boolean;
  lightingQuality?: 'GOOD' | 'FAIR' | 'POOR';
  focusQuality?: 'GOOD' | 'FAIR' | 'POOR';
}): Classification {
  const lightingQuality = params.lightingQuality || 'GOOD';
  const focusQuality = params.focusQuality || 'GOOD';
  const targetPositiveColor = params.targetPositiveRgb || { r: 68, g: 24, b: 92 }; // Marquis violet

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
        targetDifference: 0,
        observedColor: params.observedRgb,
        normalizedTestColor: params.observedRgb,
        referenceBaselineColor: params.baselineRgb || { r: 240, g: 235, b: 220 },
        targetPositiveColor,
      },
    };
  }

  // Step 2: Reference Normalization
  const measuredWhite = params.measuredWhiteRgb || { r: 245, g: 245, b: 245 };
  const normalizedTestColor = normalizeColor(params.observedRgb, measuredWhite);
  const referenceBaselineColor = params.baselineRgb || { r: 240, g: 235, b: 220 }; // Neutral reagent baseline

  // Step 3: Two-Vector Color difference calculation
  const labTest = rgbToLab(normalizedTestColor);
  const labBaseline = rgbToLab(referenceBaselineColor);
  const labTarget = rgbToLab(targetPositiveColor);

  const deltaEBaseline = parseFloat(calculateDeltaE(labTest, labBaseline).toFixed(2));
  const deltaETarget = parseFloat(calculateDeltaE(labTest, labTarget).toFixed(2));

  // Step 4: Decision Boundaries & Confidence Calculation
  let result: ClassificationResult;
  let confidence: number;

  if (deltaEBaseline <= 5.0) {
    // Little to no deviation from baseline -> Presumptive Negative
    confidence = Math.min(1.0, 0.75 + (5.0 - deltaEBaseline) / 20.0);
    result = 'PRESUMPTIVE_NEGATIVE';
  } else if (deltaEBaseline >= 15.0 && deltaETarget <= 14.0) {
    // Deviated from blank AND matches target analyte reaction profile -> Presumptive Positive
    confidence = Math.min(1.0, 0.75 + (14.0 - deltaETarget) / 30.0);
    result = 'PRESUMPTIVE_POSITIVE';
  } else {
    // Either ambiguous transition band (5 < deltaE < 15) OR off-target contaminant (deltaE > 15 but wrong color)
    confidence = deltaEBaseline > 15.0
      ? 0.35 // Contaminant / foreign reaction
      : Math.max(0.2, 0.5 - Math.abs(deltaEBaseline - 10.0) / 20.0);
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
      colorDifference: deltaEBaseline,
      targetDifference: deltaETarget,
      observedColor: params.observedRgb,
      normalizedTestColor,
      referenceBaselineColor,
      targetPositiveColor,
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

/**
 * Convenient two-vector CIEDE2000 colorimetry classification helper
 */
export function classifyColorimetry(
  observedRgb: RgbColor,
  baselineRgb?: RgbColor,
  targetPositiveRgb?: RgbColor
): Classification {
  return classifySample({
    observedRgb,
    baselineRgb,
    targetPositiveRgb,
    referenceCardDetected: true,
    testRegionDetected: true,
    lightingQuality: 'GOOD',
    focusQuality: 'GOOD',
  });
}

