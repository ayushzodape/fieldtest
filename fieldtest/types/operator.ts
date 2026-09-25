/**
 * Operator and Identity type definitions — Layer 5 Production Readiness
 */

export type OperatorRole = 'operator' | 'supervisor' | 'auditor' | 'admin';
export type OperatorStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
export type ClearanceLevel = 'LEVEL_1_FIELD' | 'LEVEL_2_SUPERVISOR' | 'LEVEL_3_AUDITOR';

export interface OperatorProfile {
  id: string;
  badgeNumber: string;         // e.g., "OP-042"
  fullName: string;
  agency: string;
  division: string;
  role: OperatorRole;
  status: OperatorStatus;
  badgeExpiresAt: string;      // ISO 8601 UTC
  clearanceLevel: ClearanceLevel;
  mfaEnforced: boolean;
  assignedPinHash: string;     // SHA-256 hash of operator PIN for biometric fallback
}

export interface OperatorSession {
  sessionId: string;
  operator: OperatorProfile;
  state: 'AUTHENTICATED' | 'LOCKED' | 'EXPIRED' | 'LOGGED_OUT';
  authenticatedAt: string;     // ISO 8601 UTC
  lastActiveAt: string;        // ISO 8601 UTC
  expiresAt: string;           // ISO 8601 UTC (inactivity timeout)
  inactivityTimeoutMinutes: number; // 15 minutes by default
  mfaVerified: boolean;
}

export type AuthEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_BADGE_VERIFIED'
  | 'AUTH_BADGE_REJECTED'
  | 'AUTH_BIOMETRIC_SUCCESS'
  | 'AUTH_BIOMETRIC_FAILED'
  | 'AUTH_MFA_CHALLENGE_VERIFIED'
  | 'AUTH_MFA_CHALLENGE_FAILED'
  | 'AUTH_SESSION_LOCKED'
  | 'AUTH_SESSION_TIMEOUT'
  | 'AUTH_LOGOUT';

export interface AuthAuditEvent {
  eventId: string;
  eventType: AuthEventType;
  badgeNumber: string;
  timestamp: string;
  details: Record<string, unknown>;
}
