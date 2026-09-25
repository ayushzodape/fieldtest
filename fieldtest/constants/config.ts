/**
 * Application configuration constants
 */

export const Config = {
  // App identity
  appName: 'FieldTest',
  appDescription: 'Digital Field Test Record System',

  // Schema
  schemaVersion: '1.0',

  // Classifier
  classifierVersion: 'color-v1.0',

  // Classification thresholds
  classification: {
    positiveThreshold: 15.0,    // Delta E >= this → PRESUMPTIVE_POSITIVE
    negativeThreshold: 5.0,     // Delta E <= this → PRESUMPTIVE_NEGATIVE
    confidenceThreshold: 0.75,  // Below this → INCONCLUSIVE
  },

  // Image quality
  imageQuality: {
    minLaplacianVariance: 100,  // Focus quality threshold
    minBrightness: 40,          // Minimum acceptable brightness (0-255)
    maxBrightness: 220,         // Maximum acceptable brightness (0-255)
  },

  // Record ID format
  recordIdPrefix: 'FT',

  // SIH 2026 Problem Statement Specification
  sihProblemStatement: 'SIH-26231 (Digital Companion for Field Drug Testing)',
  statutoryReference: 'NDPS Act 1985 · Sec 63 BSA 2023 / Sec 65B(4) IEA',
  authorityAgency: 'Narcotics Control Bureau (NCB) / State Police Forensics',

  // Disclaimer text — displayed prominently throughout the app
  disclaimer:
    'PRESUMPTIVE FIELD RESULT — This record does not constitute laboratory confirmation.',

  disclaimerFull:
    'This is a presumptive field-test result. It does not constitute laboratory confirmation. ' +
    'Laboratory confirmation is always required for definitive results pursuant to NDPS Act guidelines.',
} as const;
