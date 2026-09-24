/**
 * Digital record type definitions — the canonical signed record
 */

/** The canonical record that gets hashed and signed */
export interface CanonicalRecord {
  schemaVersion: string;
  recordId: string;
  operatorId: string;
  capturedAt: string; // ISO 8601 UTC
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  classification: {
    result: string;
    confidence: number;
    classifierVersion: string;
  };
  imageSha256: string;
}

/** A sealed record with cryptographic integrity */
export interface SealedRecord {
  record: CanonicalRecord;
  recordHash: string;       // SHA-256 of canonical JSON
  signature: string;         // Ed25519 signature (base64)
  publicKey: string;         // Ed25519 public key (base64)
  signedAt: string;          // ISO 8601 UTC
}

/** Result of a verification check */
export interface VerificationResult {
  isValid: boolean;
  recordId: string;
  checks: {
    recordHashMatch: boolean;
    signatureValid: boolean;
    expectedHash: string;
    currentHash: string;
  };
  verifiedAt: string; // ISO 8601 UTC
}
