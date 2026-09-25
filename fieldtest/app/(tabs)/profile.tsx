import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import {
  getActiveSession,
  startOperatorSession,
  terminateActiveSession,
  verifyBadgeNumber,
  PERSONNEL_REGISTRY,
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
} from '../../lib/auth';
import { updateActiveTestDraft } from '../../lib/testSession';

export default function ProfileScreen() {
  const [sessionData, setSessionData] = useState(getActiveSession());
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Poll remaining session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionData(getActiveSession());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const currentOp = sessionData.session?.operator || PERSONNEL_REGISTRY['OP-042'];

  const handleSwitchOperator = async (badge: string) => {
    setFeedbackMsg(null);
    if (badge === 'OP-999' || badge === 'OP-998') {
      const check = verifyBadgeNumber(badge);
      setFeedbackMsg(`REJECTED: ${check.reason}`);
      return;
    }

    const mfaCode = badge === 'OP-108' || badge === 'OP-007' ? '849201' : undefined;
    const res = await startOperatorSession(badge, mfaCode);
    if (res.success && res.session) {
      setSessionData(getActiveSession());
      updateActiveTestDraft({ operatorId: badge });
      setFeedbackMsg(`Authenticated as ${res.session.operator.fullName} (${badge})`);
    } else {
      setFeedbackMsg(`FAILED: ${res.error}`);
    }
  };

  const handleSignOut = async () => {
    await terminateActiveSession();
    setSessionData(getActiveSession());
    setFeedbackMsg('Session terminated. Re-authentication required to seal records.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Operator identity card */}
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Ionicons name="shield" size={32} color={Colors.textInverse} />
        </View>
        <Text style={styles.operatorName}>{currentOp.fullName}</Text>
        <Text style={styles.operatorRole}>{currentOp.division}</Text>
        <Text style={styles.agencyName}>{currentOp.agency}</Text>

        <View style={styles.identityMeta}>
          <View style={styles.identityMetaItem}>
            <Text style={styles.identityMetaLabel}>Badge Number</Text>
            <Text style={styles.identityMetaValue}>{currentOp.badgeNumber}</Text>
          </View>
          <View style={styles.identityDivider} />
          <View style={styles.identityMetaItem}>
            <Text style={styles.identityMetaLabel}>Clearance</Text>
            <Text style={styles.identityMetaValue}>{currentOp.clearanceLevel.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.identityDivider} />
          <View style={styles.identityMetaItem}>
            <Text style={styles.identityMetaLabel}>Duty Status</Text>
            <Text style={[styles.identityMetaValue, { color: currentOp.status === 'ACTIVE' ? Colors.success : Colors.danger }]}>
              {currentOp.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <View style={[styles.banner, feedbackMsg.includes('REJECTED') ? styles.bannerError : styles.bannerSuccess]}>
          <Ionicons
            name={feedbackMsg.includes('REJECTED') ? 'alert-circle' : 'checkmark-circle'}
            size={16}
            color={feedbackMsg.includes('REJECTED') ? Colors.danger : Colors.success}
          />
          <Text style={[styles.bannerText, { color: feedbackMsg.includes('REJECTED') ? Colors.danger : Colors.success }]}>
            {feedbackMsg}
          </Text>
        </View>
      )}

      {/* Layer 5 Session Lifecycle Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OPERATIONAL SESSION (LAYER 5)</Text>

        <View style={styles.sessionCard}>
          <View style={styles.sessionRow}>
            <Text style={styles.sessionLabel}>Session State</Text>
            <Text style={[styles.sessionValue, { color: sessionData.isExpired ? Colors.danger : Colors.success }]}>
              {sessionData.isExpired ? 'EXPIRED (Re-auth required)' : 'AUTHENTICATED'}
            </Text>
          </View>
          <View style={styles.sessionRow}>
            <Text style={styles.sessionLabel}>Inactivity Window</Text>
            <Text style={styles.sessionValue}>{DEFAULT_INACTIVITY_TIMEOUT_MINUTES} Minutes</Text>
          </View>
          <View style={styles.sessionRow}>
            <Text style={styles.sessionLabel}>Remaining Validity</Text>
            <Text style={styles.sessionValue}>{sessionData.remainingMinutes} Minutes</Text>
          </View>
          <View style={styles.sessionRow}>
            <Text style={styles.sessionLabel}>Biometric Seal Gate</Text>
            <Text style={styles.sessionValue}>ENFORCED (Hardware/PIN)</Text>
          </View>
          <View style={styles.sessionRow}>
            <Text style={styles.sessionLabel}>MFA Enforcement</Text>
            <Text style={styles.sessionValue}>{currentOp.mfaEnforced ? 'REQUIRED (TOTP 6-Digit)' : 'STANDARD'}</Text>
          </View>
        </View>
      </View>

      {/* Personnel Credential Switching & Rejection Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PERSONNEL REGISTRY CROSS-REFERENCE</Text>
        <Text style={styles.sectionSubtitle}>
          Select an identity to test badge verification, role elevation, and security rejection:
        </Text>

        <View style={styles.operatorList}>
          <TouchableOpacity
            style={[styles.operatorButton, currentOp.badgeNumber === 'OP-042' && styles.operatorButtonActive]}
            onPress={() => handleSwitchOperator('OP-042')}
          >
            <Text style={styles.operatorBtnTitle}>OP-042: Officer Vance</Text>
            <Text style={styles.operatorBtnDesc}>Field Operator · Active · Level 1</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.operatorButton, currentOp.badgeNumber === 'OP-108' && styles.operatorButtonActive]}
            onPress={() => handleSwitchOperator('OP-108')}
          >
            <Text style={styles.operatorBtnTitle}>OP-108: Det. Kane (MFA)</Text>
            <Text style={styles.operatorBtnDesc}>Supervisor · Active · 6-Digit TOTP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.operatorButton, currentOp.badgeNumber === 'OP-007' && styles.operatorButtonActive]}
            onPress={() => handleSwitchOperator('OP-007')}
          >
            <Text style={styles.operatorBtnTitle}>OP-007: Insp. Rostova (MFA)</Text>
            <Text style={styles.operatorBtnDesc}>Auditor · Active · Level 3 Clearance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.operatorButton, { borderColor: Colors.dangerLight, backgroundColor: '#FFF5F5' }]}
            onPress={() => handleSwitchOperator('OP-999')}
          >
            <Text style={[styles.operatorBtnTitle, { color: Colors.danger }]}>OP-999: Jordan Hayes</Text>
            <Text style={[styles.operatorBtnDesc, { color: Colors.danger }]}>SUSPENDED · Test Registry Rejection</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SYSTEM CONFIGURATION</Text>
        <SettingsItem icon="shield-checkmark" label="Hardware Biometrics" trailing="ENROLLED" />
        <SettingsItem icon="key" label="Ed25519 Signing Boundary" trailing="HSM / EDGE" />
        <SettingsItem icon="time" label="Inactivity Timeout" trailing="15 MIN" />
        <SettingsItem icon="lock-closed" label="Tamper Evidence Spec" trailing="RFC 8785" />
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.signOutText}>Terminate Active Session</Text>
      </TouchableOpacity>

      {/* App version */}
      <Text style={styles.versionText}>FieldTest v1.0.0 · Schema v1.0 · FRE 901(b)(9) Compliant</Text>
    </ScrollView>
  );
}

function SettingsItem({
  icon,
  label,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: string;
}) {
  return (
    <View style={styles.settingsItem}>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} />
      <Text style={styles.settingsItemLabel}>{label}</Text>
      <View style={styles.settingsItemRight}>
        {trailing && <Text style={styles.settingsItemTrailing}>{trailing}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  identityCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  operatorName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
    marginBottom: 2,
  },
  operatorRole: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
    fontWeight: FontWeight.medium,
  },
  agencyName: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  identityMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  identityMetaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  identityMetaValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  identityDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  bannerError: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.danger,
  },
  bannerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sessionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  sessionValue: {
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  operatorList: {
    gap: 8,
  },
  operatorButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  operatorButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: '#EFF6FF',
  },
  operatorBtnTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 2,
  },
  operatorBtnDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsItemLabel: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemTrailing: {
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
    color: Colors.textTertiary,
    fontWeight: FontWeight.bold,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  signOutText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});
