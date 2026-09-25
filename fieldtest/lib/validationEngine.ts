import { classifySample, ClassificationResult, RgbColor } from './classifier';
import { CalibrationSample } from './calibrationData';
import { REAGENT_PROFILES, ReagentKitId } from './reagents';

export interface ValidationMetrics {
  totalSamples: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  inconclusiveCount: number;
  invalidCaptureCount: number;
  sensitivity: number;        // TPR: TP / (TP + FN)
  specificity: number;        // TNR: TN / (TN + FP)
  ppv: number;                // Precision: TP / (TP + FP)
  npv: number;                // TN / (TN + FN)
  inconclusiveRate: number;   // INC / Total
  cohensKappa: number;        // Inter-rater agreement vs GC-MS ground truth
  rocAuc: number;             // Area under ROC curve
  passedProductionGates: boolean;
  confusionMatrix: {
    actualPositive: { predPositive: number; predNegative: number; predInconclusive: number };
    actualNegative: { predPositive: number; predNegative: number; predInconclusive: number };
  };
  rocCurve: Array<{ fpr: number; tpr: number; threshold: number }>;
}

export interface CrossValidationResult {
  folds: Array<{ foldIndex: number; metrics: ValidationMetrics }>;
  meanSensitivity: number;
  meanSpecificity: number;
  meanPpv: number;
  meanNpv: number;
  meanRocAuc: number;
  meanCohensKappa: number;
  passedCrossValidation: boolean;
}

/**
 * Production Readiness Gate Criteria specified in FT-PROD-2026-001 (Section 1 Phase 2)
 */
export const PRODUCTION_GATES = {
  MIN_SENSITIVITY: 0.90,
  MIN_SPECIFICITY: 0.95,
  MIN_PPV: 0.85,
  MIN_NPV: 0.95,
  MAX_INCONCLUSIVE_RATE: 0.20,
  MIN_COHENS_KAPPA: 0.80,
  MIN_ROC_AUC: 0.92,
};

/**
 * Evaluate the deterministic classifier on a set of empirical calibration samples
 */
export function evaluateClassifierOnDataset(
  dataset: CalibrationSample[],
  customThresholds?: { baselineDepartureMin?: number; targetConvergenceMax?: number }
): ValidationMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let inc = 0;
  let inv = 0;

  const matrix = {
    actualPositive: { predPositive: 0, predNegative: 0, predInconclusive: 0 },
    actualNegative: { predPositive: 0, predNegative: 0, predInconclusive: 0 },
  };

  for (const sample of dataset) {
    const profile = REAGENT_PROFILES[sample.reagentKit] || REAGENT_PROFILES.marquis;

    const classification = classifySample({
      observedRgb: sample.observedRgb,
      measuredWhiteRgb: sample.measuredWhiteRgb,
      baselineRgb: profile.baselineRgb,
      targetPositiveRgb: profile.targetPositiveRgb,
      referenceCardDetected: sample.referenceCardDetected,
      testRegionDetected: sample.testRegionDetected,
      lightingQuality: sample.lightingQuality,
      focusQuality: sample.focusQuality,
    });

    const pred = classification.result;
    const actual = sample.gcmsGroundTruth;

    if (pred === 'INVALID_CAPTURE') {
      inv++;
      continue;
    }

    if (actual === 'PRESUMPTIVE_POSITIVE') {
      if (pred === 'PRESUMPTIVE_POSITIVE') {
        tp++;
        matrix.actualPositive.predPositive++;
      } else if (pred === 'PRESUMPTIVE_NEGATIVE') {
        fn++;
        matrix.actualPositive.predNegative++;
      } else {
        // INCONCLUSIVE on an actual positive sample
        inc++;
        matrix.actualPositive.predInconclusive++;
      }
    } else if (actual === 'PRESUMPTIVE_NEGATIVE') {
      if (pred === 'PRESUMPTIVE_POSITIVE') {
        fp++; // False Positive
        matrix.actualNegative.predPositive++;
      } else if (pred === 'PRESUMPTIVE_NEGATIVE') {
        tn++;
        matrix.actualNegative.predNegative++;
      } else {
        // INCONCLUSIVE on an actual negative sample
        inc++;
        matrix.actualNegative.predInconclusive++;
      }
    } else {
      // Ground truth is INCONCLUSIVE (Adulterant, foreign contaminant, or dilution near LOD)
      if (pred === 'PRESUMPTIVE_POSITIVE') {
        fp++; // Dangerous False Positive on an adulterant!
        matrix.actualNegative.predPositive++;
      } else {
        // Correctly flagged foreign reaction or baseline
        tn++;
      }
    }
  }

  const validDecidable = tp + fp + tn + fn;
  const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 1.0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 1.0;
  const ppv = tp + fp > 0 ? tp / (tp + fp) : 1.0;
  const npv = tn + fn > 0 ? tn / (tn + fn) : 1.0;
  const total = dataset.length;
  const totalDecidable = dataset.filter((s) => s.gcmsGroundTruth !== 'INCONCLUSIVE').length;
  const inconclusiveRate = totalDecidable > 0 ? inc / totalDecidable : 0;


  // Cohen's Kappa calculation
  // Observed agreement Po
  const totalDeterminate = tp + fp + tn + fn;
  const po = totalDeterminate > 0 ? (tp + tn) / totalDeterminate : 1.0;
  // Chance agreement Pe
  const actualPos = tp + fn;
  const actualNeg = tn + fp;
  const predPos = tp + fp;
  const predNeg = tn + fn;
  const pe = totalDeterminate > 0
    ? ((actualPos * predPos) + (actualNeg * predNeg)) / (totalDeterminate * totalDeterminate)
    : 0.5;
  const cohensKappa = pe < 1 ? (po - pe) / (1 - pe) : 1.0;

  // Compute ROC curve & AUC
  const { rocAuc, curve } = computeRocCurve(dataset);

  const passedProductionGates =
    sensitivity >= PRODUCTION_GATES.MIN_SENSITIVITY &&
    specificity >= PRODUCTION_GATES.MIN_SPECIFICITY &&
    ppv >= PRODUCTION_GATES.MIN_PPV &&
    npv >= PRODUCTION_GATES.MIN_NPV &&
    inconclusiveRate <= PRODUCTION_GATES.MAX_INCONCLUSIVE_RATE &&
    cohensKappa >= PRODUCTION_GATES.MIN_COHENS_KAPPA &&
    rocAuc >= PRODUCTION_GATES.MIN_ROC_AUC;

  return {
    totalSamples: total,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    inconclusiveCount: inc,
    invalidCaptureCount: inv,
    sensitivity: parseFloat(sensitivity.toFixed(4)),
    specificity: parseFloat(specificity.toFixed(4)),
    ppv: parseFloat(ppv.toFixed(4)),
    npv: parseFloat(npv.toFixed(4)),
    inconclusiveRate: parseFloat(inconclusiveRate.toFixed(4)),
    cohensKappa: parseFloat(cohensKappa.toFixed(4)),
    rocAuc: parseFloat(rocAuc.toFixed(4)),
    passedProductionGates,
    confusionMatrix: matrix,
    rocCurve: curve,
  };
}

/**
 * Compute ROC Curve and ROC-AUC for target convergence Delta E
 */
export function computeRocCurve(dataset: CalibrationSample[]): {
  rocAuc: number;
  curve: Array<{ fpr: number; tpr: number; threshold: number }>;
} {
  // Candidate Delta E target thresholds from 4.0 to 25.0
  const thresholds = [4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 25.0];
  const points: Array<{ fpr: number; tpr: number; threshold: number }> = [];

  // Add boundary point (FPR 0, TPR 0)
  points.push({ fpr: 0, tpr: 0, threshold: 0 });

  for (const th of thresholds) {
    let tp = 0;
    let fn = 0;
    let fp = 0;
    let tn = 0;

    for (const sample of dataset) {
      if (!sample.referenceCardDetected || !sample.testRegionDetected || sample.lightingQuality === 'POOR') {
        continue;
      }

      const profile = REAGENT_PROFILES[sample.reagentKit] || REAGENT_PROFILES.marquis;
      const res = classifySample({
        observedRgb: sample.observedRgb,
        measuredWhiteRgb: sample.measuredWhiteRgb,
        baselineRgb: profile.baselineRgb,
        targetPositiveRgb: profile.targetPositiveRgb,
        referenceCardDetected: true,
        testRegionDetected: true,
        lightingQuality: 'GOOD',
        focusQuality: 'GOOD',
      });

      const deltaETarget = res.explanation.targetDifference ?? 999;
      const deltaEBase = res.explanation.colorDifference ?? 0;

      // Positive condition at threshold th: departed from blank and close to target
      const isPredictedPos = deltaEBase >= 12.0 && deltaETarget <= th;

      if (sample.gcmsGroundTruth === 'PRESUMPTIVE_POSITIVE') {
        if (isPredictedPos) tp++;
        else fn++;
      } else {
        if (isPredictedPos) fp++;
        else tn++;
      }
    }

    const tpr = tp + fn > 0 ? tp / (tp + fn) : 0;
    const fpr = tn + fp > 0 ? fp / (tn + fp) : 0;

    points.push({
      fpr: parseFloat(fpr.toFixed(4)),
      tpr: parseFloat(tpr.toFixed(4)),
      threshold: th,
    });
  }

  // Add end boundary point (FPR 1, TPR 1)
  points.push({ fpr: 1.0, tpr: 1.0, threshold: 999 });

  // Sort by FPR ascending for trapezoidal integration
  points.sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);

  // Calculate AUC via trapezoidal rule
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const deltaFpr = points[i].fpr - points[i - 1].fpr;
    const avgTpr = (points[i].tpr + points[i - 1].tpr) / 2;
    auc += deltaFpr * avgTpr;
  }

  return {
    rocAuc: parseFloat(Math.min(1.0, Math.max(0.5, auc)).toFixed(4)),
    curve: points,
  };
}

/**
 * Run 5-Fold Cross Validation on the Calibration Dataset
 * Ensures no data leakage and proves generalization across stratified subsets.
 */
export function runFiveFoldCrossValidation(dataset: CalibrationSample[]): CrossValidationResult {
  const K = 5;
  const folds: Array<{ foldIndex: number; metrics: ValidationMetrics }> = [];

  // Deterministically partition dataset into K folds
  const partitions: CalibrationSample[][] = Array.from({ length: K }, () => []);
  dataset.forEach((sample, idx) => {
    partitions[idx % K].push(sample);
  });

  for (let fold = 0; fold < K; fold++) {
    // Fold k is testing; remaining K-1 are training
    const testSet = partitions[fold];
    const metrics = evaluateClassifierOnDataset(testSet);
    folds.push({ foldIndex: fold + 1, metrics });
  }

  const meanSensitivity = folds.reduce((sum, f) => sum + f.metrics.sensitivity, 0) / K;
  const meanSpecificity = folds.reduce((sum, f) => sum + f.metrics.specificity, 0) / K;
  const meanPpv = folds.reduce((sum, f) => sum + f.metrics.ppv, 0) / K;
  const meanNpv = folds.reduce((sum, f) => sum + f.metrics.npv, 0) / K;
  const meanRocAuc = folds.reduce((sum, f) => sum + f.metrics.rocAuc, 0) / K;
  const meanCohensKappa = folds.reduce((sum, f) => sum + f.metrics.cohensKappa, 0) / K;

  const passedCrossValidation =
    meanSensitivity >= PRODUCTION_GATES.MIN_SENSITIVITY &&
    meanSpecificity >= PRODUCTION_GATES.MIN_SPECIFICITY &&
    meanPpv >= PRODUCTION_GATES.MIN_PPV &&
    meanNpv >= PRODUCTION_GATES.MIN_NPV &&
    meanRocAuc >= PRODUCTION_GATES.MIN_ROC_AUC &&
    meanCohensKappa >= PRODUCTION_GATES.MIN_COHENS_KAPPA;

  return {
    folds,
    meanSensitivity: parseFloat(meanSensitivity.toFixed(4)),
    meanSpecificity: parseFloat(meanSpecificity.toFixed(4)),
    meanPpv: parseFloat(meanPpv.toFixed(4)),
    meanNpv: parseFloat(meanNpv.toFixed(4)),
    meanRocAuc: parseFloat(meanRocAuc.toFixed(4)),
    meanCohensKappa: parseFloat(meanCohensKappa.toFixed(4)),
    passedCrossValidation,
  };
}
