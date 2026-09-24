import nacl from 'tweetnacl';

/**
 * FieldTest Cryptographic Module
 * 
 * Non-Negotiable Rules:
 * 1. Standard battle-tested crypto only (TweetNaCl for Ed25519, SubtleCrypto for SHA-256).
 * 2. Deterministic canonical JSON serialization before any hashing.
 * 3. Terminology: "tamper-evident", never "tamper-proof".
 */

// Hex conversion utilities
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i].toString(16).padStart(2, '0');
    hex += byte;
  }
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().toLowerCase().replace(/^0x/, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Deterministic Canonical JSON Serialization
 * Sorts object keys recursively and strips non-essential whitespace.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJson(item)).join(',') + ']';
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys.map((key) => {
    return JSON.stringify(key) + ':' + canonicalizeJson(record[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Compute SHA-256 hash using Web Crypto API
 */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
    return bytesToHex(new Uint8Array(hashBuffer));
  }

  // Fallback for environments where crypto.subtle is unavailable
  throw new Error('Web Crypto API (crypto.subtle) is required for SHA-256 computation');
}

/**
 * Generate Ed25519 Key Pair
 */
export function generateEd25519KeyPair(): { publicKey: string; secretKey: string } {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: bytesToHex(keyPair.publicKey),
    secretKey: bytesToHex(keyPair.secretKey),
  };
}

/**
 * Server-side / Demo signing helper
 * Produces a 64-byte Ed25519 detached signature formatted as hex
 */
export function signCanonicalString(canonicalString: string, secretKeyHex: string): string {
  const messageBytes = new TextEncoder().encode(canonicalString);
  const secretKeyBytes = hexToBytes(secretKeyHex);
  const signatureBytes = nacl.sign.detached(messageBytes, secretKeyBytes);
  return bytesToHex(signatureBytes);
}

/**
 * Verify Ed25519 Detached Signature
 */
export function verifyEd25519Signature(
  message: string | Uint8Array,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const signatureBytes = hexToBytes(signatureHex);
    const publicKeyBytes = hexToBytes(publicKeyHex);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (err) {
    console.error('[FieldTest Crypto] Signature verification error:', err);
    return false;
  }
}

/**
 * Full Evidence Verification Result
 */
export interface VerificationResult {
  isValid: boolean;
  hashMatch: boolean;
  signatureValid: boolean;
  expectedHash: string;
  computedHash: string;
  reason: string;
}

/**
 * Verify a canonical record's integrity against expected hash and signature
 */
export async function verifyRecordIntegrity(
  canonicalRecord: unknown,
  expectedHash: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<VerificationResult> {
  const canonicalString = canonicalizeJson(canonicalRecord);
  const computedHash = await sha256Hex(canonicalString);

  const hashMatch = computedHash.toLowerCase() === expectedHash.toLowerCase();
  const signatureValid = verifyEd25519Signature(canonicalString, signatureHex, publicKeyHex);

  const isValid = hashMatch && signatureValid;

  let reason = 'Record integrity verified. Signature and content match.';
  if (!hashMatch) {
    reason = `Hash mismatch! Content has been modified after sealing. Expected: ${expectedHash.slice(0, 12)}..., Actual: ${computedHash.slice(0, 12)}...`;
  } else if (!signatureValid) {
    reason = 'Invalid cryptographic signature! Verification key does not match signer.';
  }

  return {
    isValid,
    hashMatch,
    signatureValid,
    expectedHash,
    computedHash,
    reason,
  };
}
