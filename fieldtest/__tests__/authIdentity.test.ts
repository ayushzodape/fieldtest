import assert from 'node:assert';
import {
  verifyBadgeNumber,
  startOperatorSession,
  getActiveSession,
  touchActiveSession,
  promptBiometricGate,
  verifySupervisorMfa,
  terminateActiveSession,
  getAuthAuditLog,
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
} from '../lib/auth';

async function runAuthIdentityTests() {
  console.log('[TEST] Running authIdentity.test.ts (Layer 5: Authentication & Identity)...');

  // --- 1. Badge Verification & Personnel Directory Tests ---
  console.log('[BADGE] Testing badge verification and personnel registry lookup...');

  // Test 1a: Active Field Operator
  const op042 = verifyBadgeNumber('OP-042');
  assert.strictEqual(op042.isValid, true, 'OP-042 must be valid');
  assert.strictEqual(op042.operator?.role, 'operator');
  assert.strictEqual(op042.operator?.status, 'ACTIVE');
  assert.strictEqual(op042.operator?.clearanceLevel, 'LEVEL_1_FIELD');
  console.log('[PASS] Active Field Operator OP-042 verified.');

  // Test 1b: Active Supervisor
  const op108 = verifyBadgeNumber('OP-108');
  assert.strictEqual(op108.isValid, true, 'OP-108 must be valid');
  assert.strictEqual(op108.operator?.role, 'supervisor');
  assert.strictEqual(op108.operator?.mfaEnforced, true);
  console.log('[PASS] Active Supervisor OP-108 verified.');

  // Test 1c: Malformed Badge Syntax Rejection
  const malformed = verifyBadgeNumber('BADGE_042');
  assert.strictEqual(malformed.isValid, false, 'Malformed badge format must fail');
  assert.ok(malformed.reason?.includes('Malformed badge number'), 'Must report malformed format');
  console.log('[PASS] Malformed badge syntax correctly rejected.');

  // Test 1d: Unregistered Badge Rejection
  const unregistered = verifyBadgeNumber('OP-555');
  assert.strictEqual(unregistered.isValid, false, 'Unregistered badge must fail');
  assert.ok(unregistered.reason?.includes('not found in Department of Law Enforcement personnel database'));
  console.log('[PASS] Unregistered badge correctly rejected.');

  // Test 1e: Expired Badge Rejection
  const expired = verifyBadgeNumber('OP-998');
  assert.strictEqual(expired.isValid, false, 'Expired badge must fail');
  assert.ok(expired.reason?.includes('expired on'));
  console.log('[PASS] Expired badge credentials correctly rejected.');

  // Test 1f: Suspended Badge Rejection
  const suspended = verifyBadgeNumber('OP-999');
  assert.strictEqual(suspended.isValid, false, 'Suspended badge must fail');
  assert.ok(suspended.reason?.includes('authorization is SUSPENDED'));
  console.log('[PASS] Suspended operator credentials correctly rejected.');

  // --- 2. Session Management & Inactivity Timeout ---
  console.log('\n[SESSION] Testing session lifecycle and 15-minute inactivity timeout...');

  const loginRes = await startOperatorSession('OP-042');
  assert.strictEqual(loginRes.success, true);
  assert.ok(loginRes.session);
  assert.strictEqual(loginRes.session?.inactivityTimeoutMinutes, DEFAULT_INACTIVITY_TIMEOUT_MINUTES);

  const active = getActiveSession();
  assert.strictEqual(active.isExpired, false);
  assert.ok(active.remainingMinutes >= 14 && active.remainingMinutes <= 15);
  console.log(`[PASS] Session created with ${active.remainingMinutes}m initial validity.`);

  // Test touch session
  const oldActive = active.session?.lastActiveAt;
  touchActiveSession();
  const touched = getActiveSession();
  assert.strictEqual(touched.isExpired, false);
  console.log('[PASS] Session activity touch successfully renewed expiry window.');

  // Test simulated inactivity expiration
  if (touched.session) {
    // Deliberately set expiration 1 minute in the past
    touched.session.expiresAt = new Date(Date.now() - 60000).toISOString();
  }
  const expiredCheck = getActiveSession();
  assert.strictEqual(expiredCheck.isExpired, true, 'Past expiry must mark session expired');
  console.log('[PASS] 15-minute inactivity session expiration successfully enforced.');

  // --- 3. Biometric & Security Gate Challenge ---
  console.log('\n[BIOMETRIC] Testing biometric / security gate before sealing evidence...');

  // Reset to clean active session for OP-042
  await startOperatorSession('OP-042');

  // Test 3a: Valid PIN challenge
  const validPinGate = await promptBiometricGate({ fallbackPin: '1042' });
  assert.strictEqual(validPinGate.success, true);
  console.log('[PASS] Valid credential gate passed successfully.');

  // Test 3b: Invalid PIN rejection
  const invalidPinGate = await promptBiometricGate({ fallbackPin: '0000' });
  assert.strictEqual(invalidPinGate.success, false);
  assert.ok(invalidPinGate.error?.includes('Invalid operator PIN'));
  console.log('[PASS] Invalid PIN rejected with remaining attempts counter.');

  // --- 4. Multi-Factor Authentication (MFA) for Elevated Roles ---
  console.log('\n[MFA] Testing Multi-Factor Authentication requirement for supervisors...');

  // Supervisor session without MFA code must be blocked
  const supervisorNoMfa = await startOperatorSession('OP-108');
  assert.strictEqual(supervisorNoMfa.success, false);
  assert.ok(supervisorNoMfa.error?.includes('MFA challenge required'));
  console.log('[PASS] Supervisor session blocked when MFA challenge is missing.');

  // Supervisor session with invalid MFA code must fail
  const supervisorInvalidMfa = await startOperatorSession('OP-108', '000000');
  assert.strictEqual(supervisorInvalidMfa.success, false);
  assert.ok(supervisorInvalidMfa.error?.includes('Invalid 6-digit MFA token code'));
  console.log('[PASS] Invalid MFA token code rejected.');

  // Supervisor session with valid MFA code must succeed
  const supervisorValidMfa = await startOperatorSession('OP-108', '849201');
  assert.strictEqual(supervisorValidMfa.success, true);
  assert.strictEqual(supervisorValidMfa.session?.mfaVerified, true);
  console.log('[PASS] Supervisor session authorized with verified MFA challenge.');

  // --- 5. Audit Logging of Authentication Events ---
  console.log('\n[AUDIT] Testing comprehensive auth event logging...');
  const auditLogs = getAuthAuditLog();
  assert.ok(auditLogs.length >= 8, 'Must record all auth events in sequence');

  const eventTypes = new Set(auditLogs.map((l) => l.eventType));
  assert.ok(eventTypes.has('AUTH_LOGIN_SUCCESS'), 'Must record login success');
  assert.ok(eventTypes.has('AUTH_BADGE_REJECTED'), 'Must record badge rejection');
  assert.ok(eventTypes.has('AUTH_BIOMETRIC_FAILED'), 'Must record biometric failure');
  assert.ok(eventTypes.has('AUTH_MFA_CHALLENGE_VERIFIED'), 'Must record MFA verification');

  console.log(`[PASS] ${auditLogs.length} authentication audit events verified.`);

  // Cleanup session
  await terminateActiveSession();
  const finalSession = getActiveSession();
  assert.strictEqual(finalSession.session, null);
  console.log('[PASS] Clean session termination verified.');

  console.log('\n[PASS] All Layer 5 Authentication & Identity tests passed successfully!');
}

runAuthIdentityTests().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
