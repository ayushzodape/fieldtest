/**
 * Test and classification type definitions
 */

/** The four possible classification outcomes */
export type ClassificationResult =
  | 'PRESUMPTIVE_POSITIVE'
  | 'PRESUMPTIVE_NEGATIVE'
  | 'INCONCLUSIVE'
  | 'INVALID_CAPTURE';

/** Lighting quality assessment */
export type LightingQuality = 'GOOD' | 'FAIR' | 'POOR';

/** Status of a field test through its lifecycle */
export type TestStatus =
  | 'capturing'
  | 'validating'
  | 'classifying'
  | 'sealing'
  | 'sealed'
  | 'failed';

/** Classification output from the color analysis pipeline */
export interface Classification {
  result: ClassificationResult;
  confidence: number; // 0.0 – 1.0
  classifierVersion: string;
  explanation: {
    lightingQuality: LightingQuality;
    referenceCardDetected: boolean;
    testRegionDetected: boolean;
    colorDifference: number; // CIE Delta E
    normalizedTestColor: {
      r: number;
      g: number;
      b: number;
    };
    referenceColor: {
      r: number;
      g: number;
      b: number;
    };
  };
}

/** Image quality validation checks */
export interface CaptureValidation {
  referenceCardDetected: boolean;
  testRegionDetected: boolean;
  focusQuality: boolean;
  lightingQuality: LightingQuality;
  overallValid: boolean;
}

/** GPS location with accuracy */
export interface Location {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

/** A field test record */
export interface FieldTest {
  id: string;
  operatorId: string;
  status: TestStatus;
  result: ClassificationResult | null;
  confidence: number | null;
  classifierVersion: string;
  capturedAt: string; // ISO 8601
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  imageSha256: string | null;
  recordHash: string | null;
  signature: string | null;
  schemaVersion: string;
  createdAt: string; // ISO 8601
}

/** An audit event in the chain-of-custody timeline */
export interface AuditEvent {
  id: string;
  testId: string;
  eventType: AuditEventType;
  actorId: string;
  timestamp: string; // ISO 8601
  metadata: Record<string, unknown>;
}

export type AuditEventType =
  | 'test_initiated'
  | 'image_captured'
  | 'reference_card_validated'
  | 'classification_completed'
  | 'record_sealed'
  | 'verification_attempted'
  | 'integrity_check_passed'
  | 'integrity_check_failed';
