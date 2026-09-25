export type GpsFixType = '3D' | '2D' | 'CELL_TOWER' | 'NONE';

export interface DualTimestamp {
  deviceReportedAt: string; // ISO 8601 UTC from mobile hardware clock
  serverReceivedAt: string; // ISO 8601 UTC from trusted server NTP clock
  clockSkewSeconds: number; // Absolute difference in seconds
  isSkewWithinTolerance: boolean; // True if <= 120 seconds
}

export interface GeospatialProvenance {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters?: number;
  fixType: GpsFixType;
  isMocked: boolean;
  hdop?: number; // Horizontal Dilution of Precision
  satellitesTracked?: number;
  integrityStatus: 'VERIFIED_GNSS' | 'COARSE_CELL_FALLBACK' | 'SPOOF_MOCK_DETECTED' | 'INVALID_NO_FIX';
}

/**
 * Maximum permissible clock skew between device and trusted server clock
 * Specified in FT-PROD-2026-001 (Layer 4: Temporal & Geospatial Integrity)
 */
export const MAX_CLOCK_SKEW_SECONDS = 120;

/**
 * Evaluate clock skew between device timestamp and server timestamp
 */
export function evaluateClockSkew(
  deviceReportedAt: string,
  serverReceivedAt: string = new Date().toISOString()
): {
  isValid: boolean;
  skewSeconds: number;
  direction: 'AHEAD_OF_SERVER' | 'BEHIND_SERVER' | 'SYNCHRONIZED';
  reason?: string;
} {
  const deviceTime = new Date(deviceReportedAt).getTime();
  const serverTime = new Date(serverReceivedAt).getTime();

  if (isNaN(deviceTime) || isNaN(serverTime)) {
    return {
      isValid: false,
      skewSeconds: Infinity,
      direction: 'SYNCHRONIZED',
      reason: 'Invalid timestamp format (must be valid ISO 8601)',
    };
  }

  const deltaMs = deviceTime - serverTime;
  const skewSeconds = parseFloat((Math.abs(deltaMs) / 1000).toFixed(2));
  const direction = deltaMs > 1000 ? 'AHEAD_OF_SERVER' : deltaMs < -1000 ? 'BEHIND_SERVER' : 'SYNCHRONIZED';

  // Clock skew exceeding 120 seconds indicates compromised device clock, deliberate backdating, or NTP desync
  const isValid = skewSeconds <= MAX_CLOCK_SKEW_SECONDS;

  return {
    isValid,
    skewSeconds,
    direction,
    reason: isValid
      ? undefined
      : `Clock skew violation: Device clock deviates from server time by ${skewSeconds}s (max allowed: ${MAX_CLOCK_SKEW_SECONDS}s). Possible temporal backdating attempt.`,
  };
}

/**
 * Evaluate geospatial coordinates and sensor provenance
 */
export function evaluateGeospatialIntegrity(params: {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters?: number;
  mocked?: boolean;
  fixType?: GpsFixType;
  hdop?: number;
  satellitesTracked?: number;
}): GeospatialProvenance {
  const isMocked = params.mocked === true;
  let fixType = params.fixType || (params.accuracyMeters <= 50 ? '3D' : params.accuracyMeters <= 200 ? '2D' : 'CELL_TOWER');

  let integrityStatus: GeospatialProvenance['integrityStatus'];

  if (isMocked) {
    integrityStatus = 'SPOOF_MOCK_DETECTED';
  } else if ((params.latitude === 0 && params.longitude === 0) || fixType === 'NONE') {
    integrityStatus = 'INVALID_NO_FIX';
    fixType = 'NONE';
  } else if (params.accuracyMeters > 300 || fixType === 'CELL_TOWER') {
    integrityStatus = 'COARSE_CELL_FALLBACK';
  } else {
    integrityStatus = 'VERIFIED_GNSS';
  }

  return {
    latitude: params.latitude,
    longitude: params.longitude,
    accuracyMeters: params.accuracyMeters,
    altitudeMeters: params.altitudeMeters,
    fixType,
    isMocked,
    hdop: params.hdop,
    satellitesTracked: params.satellitesTracked,
    integrityStatus,
  };
}

/**
 * Generate a cryptographically secure Record ID utilizing UUID v4
 * Replaces non-secure Math.random() with standard RFC 4122 UUID v4 entropy
 */
export function generateSecureRecordId(year: number = new Date().getUTCFullYear()): {
  recordId: string;
  uuid: string;
} {
  let uuid: string;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } else {
    // Fallback pseudo-random RFC 4122
    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const shortPrefix = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  const recordId = `FT-${year}-${shortPrefix}`;

  return { recordId, uuid };
}
