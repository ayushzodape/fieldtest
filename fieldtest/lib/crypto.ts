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
 * RFC 8785 Compliant JSON Canonicalization Scheme (JCS)
 * Deterministically serializes values with:
 * - Omission of undefined properties in objects
 * - undefined in arrays converted to null
 * - Objects with .toJSON() method properly serialized (e.g. Date)
 * - -0 serialized as 0, validation of finite numbers
 * - Lexicographical UTF-16 code-unit sorting of object keys
 * - No insignificant whitespace
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === undefined) {
    return '';
  }

  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'number') {
      if (!Number.isFinite(obj)) {
        throw new TypeError('Cannot canonicalize non-finite numbers (NaN, Infinity)');
      }
      return Object.is(obj, -0) ? '0' : obj.toString();
    }
    return JSON.stringify(obj);
  }

  // Handle objects with toJSON (e.g. Date)
  if (typeof (obj as { toJSON?: () => unknown }).toJSON === 'function') {
    return canonicalizeJson((obj as { toJSON: () => unknown }).toJSON());
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => (item === undefined ? 'null' : canonicalizeJson(item))).join(',') + ']';
  }

  const record = obj as Record<string, unknown>;
  const validKeys = Object.keys(record)
    .filter((k) => record[k] !== undefined && typeof record[k] !== 'function' && typeof record[k] !== 'symbol')
    .sort();

  const pairs = validKeys.map((key) => {
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

export const sha256Bytes = sha256Hex;

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
 * Generate deterministic Ed25519 keypair from a seed string (ideal for repeatable test fixtures & demo environments)
 */
export function generateDeterministicKeyPair(seed: string): { publicKey: string; secretKey: string; privateKey: string } {
  const seedBytes = new Uint8Array(32);
  const enc = new TextEncoder().encode(seed);
  for (let i = 0; i < 32; i++) {
    seedBytes[i] = (enc[i % enc.length] || 0) ^ ((i * 17) & 0xff);
  }
  const kp = nacl.sign.keyPair.fromSeed(seedBytes);
  const pub = bytesToHex(kp.publicKey);
  const sec = bytesToHex(kp.secretKey);
  return {
    publicKey: pub,
    secretKey: sec,
    privateKey: sec,
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

export const canonicalizeRecord = canonicalizeJson;

export function signCanonicalRecord(record: unknown, secretKeyHex: string): string {
  const canonical = canonicalizeJson(record);
  return signCanonicalString(canonical, secretKeyHex);
}

export async function verifyCanonicalRecordSignature(
  record: unknown,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  const canonical = canonicalizeJson(record);
  return verifyEd25519Signature(canonical, signatureHex, publicKeyHex);
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

/**
 * Temporal integrity validator (NIST SP 800-86 / RFC 3161 clock drift check)
 * Checks whether device clock has drifted beyond allowable tolerance (default: 120s)
 */
export function validateTimestampSkew(
  clientIso: string,
  trustedIso: string = new Date().toISOString(),
  maxSkewSeconds = 120
): { isValid: boolean; skewSeconds: number; reason: string } {
  const clientTime = new Date(clientIso).getTime();
  const trustedTime = new Date(trustedIso).getTime();

  if (isNaN(clientTime) || isNaN(trustedTime)) {
    return { isValid: false, skewSeconds: 0, reason: 'Invalid ISO-8601 timestamp string' };
  }

  const skewSeconds = Math.abs(clientTime - trustedTime) / 1000;
  const isValid = skewSeconds <= maxSkewSeconds;

  return {
    isValid,
    skewSeconds,
    reason: isValid
      ? 'Timestamp within trusted tolerance'
      : `Clock skew violation! Drift of ${Math.round(skewSeconds)}s exceeds maximum allowed threshold of ${maxSkewSeconds}s.`,
  };
}
