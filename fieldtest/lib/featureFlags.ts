/**
 * Layer 9: Feature Flags & Dynamic Runtime Configuration
 * 
 * Enables gradual rollouts, A/B testing of classifier thresholds,
 * and emergency kill-switches for government field operations.
 */

export interface AppFeatureFlags {
  enableDuquenoisCannabis: boolean;
  enforceBiometricGate: boolean;
  enforceStrictClockSkew: boolean;
  enforceAntiSpoofGps: boolean;
  enableOfflineAutoSync: boolean;
  enableSection63BsaExport: boolean;
  enableExternalWebVerifier: boolean;
  maxClockSkewToleranceSeconds: number;
}

const DEFAULT_FLAGS: AppFeatureFlags = {
  enableDuquenoisCannabis: true,
  enforceBiometricGate: true,
  enforceStrictClockSkew: true,
  enforceAntiSpoofGps: true,
  enableOfflineAutoSync: true,
  enableSection63BsaExport: true,
  enableExternalWebVerifier: true,
  maxClockSkewToleranceSeconds: 120,
};

let currentFlags: AppFeatureFlags = { ...DEFAULT_FLAGS };

/**
 * Get active feature flags
 */
export function getFeatureFlags(): AppFeatureFlags {
  return { ...currentFlags };
}

/**
 * Check if a specific boolean feature is active
 */
export function isFeatureActive(flagName: keyof AppFeatureFlags): boolean {
  return Boolean(currentFlags[flagName]);
}

/**
 * Update feature flags (for admin configuration or test harnesses)
 */
export function updateFeatureFlags(overrides: Partial<AppFeatureFlags>): AppFeatureFlags {
  currentFlags = {
    ...currentFlags,
    ...overrides,
  };
  return { ...currentFlags };
}

/**
 * Reset feature flags to institutional production defaults
 */
export function resetFeatureFlags(): void {
  currentFlags = { ...DEFAULT_FLAGS };
}
