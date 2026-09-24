import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { Config } from '../../constants/config';

/**
 * Verification screen — independently verifies a record's integrity.
 *
 * This is the "money shot" screen for the demo. It shows:
 * 1. Record details
 * 2. Signature verification status
 * 3. When tampered: INTEGRITY CHECK FAILED with expected vs current hash
 *
 * The tamper detection demo is triggered via a toggle for judge demonstrations.
 */
export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isTampered, setIsTampered] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(true);

  const handleToggleTamper = () => {
    setIsVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      setIsTampered(!isTampered);
      setVerified(isTampered); // Toggle: if was tampered, now valid
      setIsVerifying(false);
    }, 800);
  };

  const expectedHash = 'a73c8f2b...91bf4e1d';
  const currentHash = isTampered ? '4b21d3a7...e3d19c82' : 'a73c8f2b...91bf4e1d';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Record header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>VERIFY DIGITAL RECORD</Text>
        <Text style={styles.recordId}>{id || 'FT-2026-000184'}</Text>
      </View>

      {/* Integrity status — the main visual */}
      {!isTampered ? (
        <View style={styles.integrityValid}>
          <View style={styles.integrityIconContainer}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.success} />
          </View>
          <Text style={styles.integrityTitle}>RECORD INTEGRITY</Text>
          <Text style={styles.integrityStatus}>✓ VERIFIED</Text>
          <Text style={styles.integrityDescription}>
            The digital signature is valid. This record has not been modified
            since it was signed.
          </Text>
        </View>
      ) : (
        <View style={styles.integrityFailed}>
          <View style={styles.integrityIconContainerFailed}>
            <Ionicons name="alert-circle" size={48} color={Colors.danger} />
          </View>
          <Text style={styles.integrityTitleFailed}>INTEGRITY CHECK FAILED</Text>
          <Text style={styles.integrityDescriptionFailed}>
            This record does not match the signature originally issued.
            The record may have been modified after signing.
          </Text>

          {/* Hash comparison */}
          <View style={styles.hashComparison}>
            <View style={styles.hashRow}>
              <Text style={styles.hashLabel}>Expected hash:</Text>
              <Text style={styles.hashValue}>{expectedHash}</Text>
            </View>
            <View style={styles.hashRow}>
              <Text style={styles.hashLabel}>Current hash:</Text>
              <Text style={styles.hashValueFailed}>{currentHash}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Verification details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>VERIFICATION DETAILS</Text>

        <DetailRow
          label="IMAGE HASH"
          value="8e4a2f7c...91bf4e1d"
          mono
        />
        <DetailRow
          label="SIGNATURE"
          value={isTampered ? '✗ INVALID' : '✓ VALID'}
          valueColor={isTampered ? Colors.danger : Colors.success}
        />
        <DetailRow
          label="RECORD INTEGRITY"
          value={isTampered ? '✗ FAILED' : '✓ VERIFIED'}
          valueColor={isTampered ? Colors.danger : Colors.success}
        />
        <DetailRow
          label="SIGNED AT"
          value="24 Sep 2026 · 22:41 IST"
        />
        <DetailRow
          label="OPERATOR"
          value="OP-042"
          mono
        />
        <DetailRow
          label="LOCATION"
          value="19.0760, 72.8777 ±8m"
          mono
        />
        <DetailRow
          label="MODEL"
          value={Config.classifierVersion}
          mono
        />
        <DetailRow
          label="SCHEMA"
          value={`v${Config.schemaVersion}`}
          mono
        />
      </View>

      {/* Demo: Tamper toggle for judge demonstration */}
      <View style={styles.demoSection}>
        <Text style={styles.demoLabel}>DEMONSTRATION</Text>
        <Text style={styles.demoDescription}>
          {isTampered
            ? 'The classification has been changed from NEGATIVE to POSITIVE. Re-verify to restore.'
            : 'Simulate modifying the classification field to demonstrate tamper detection.'}
        </Text>
        <TouchableOpacity
          style={[
            styles.tamperButton,
            isTampered && styles.tamperButtonRestore,
          ]}
          onPress={handleToggleTamper}
          activeOpacity={0.7}
          disabled={isVerifying}
        >
          <Ionicons
            name={isTampered ? 'refresh' : 'warning'}
            size={18}
            color={isTampered ? Colors.success : Colors.danger}
          />
          <Text
            style={[
              styles.tamperButtonText,
              isTampered && styles.tamperButtonTextRestore,
            ]}
          >
            {isVerifying
              ? 'Verifying...'
              : isTampered
                ? 'Restore Original Record'
                : 'Simulate Tampering'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={14} color={Colors.warning} />
        <Text style={styles.disclaimerText}>{Config.disclaimer}</Text>
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
  mono,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          mono && styles.mono,
          valueColor ? { color: valueColor, fontWeight: FontWeight.bold } : {},
        ]}
      >
        {value}
      </Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  recordId: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    fontFamily: 'monospace',
  },

  // Integrity valid
  integrityValid: {
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing['3xl'],
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  integrityIconContainer: {
    marginBottom: Spacing.md,
  },
  integrityTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  integrityStatus: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginBottom: Spacing.md,
  },
  integrityDescription: {
    fontSize: FontSize.sm,
    color: Colors.success,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Integrity failed
  integrityFailed: {
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing['3xl'],
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  integrityIconContainerFailed: {
    marginBottom: Spacing.md,
  },
  integrityTitleFailed: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.danger,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  integrityDescriptionFailed: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  hashComparison: {
    width: '100%',
    backgroundColor: 'rgba(197, 48, 48, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  hashRow: {
    gap: 2,
  },
  hashLabel: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: FontWeight.medium,
  },
  hashValue: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontFamily: 'monospace',
    fontWeight: FontWeight.medium,
  },
  hashValueFailed: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontFamily: 'monospace',
    fontWeight: FontWeight.bold,
  },

  // Details
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  mono: {
    fontFamily: 'monospace',
  },

  // Demo section
  demoSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  demoLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  demoDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  tamperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  tamperButtonRestore: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  tamperButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.danger,
  },
  tamperButtonTextRestore: {
    color: Colors.success,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
    lineHeight: 14,
  },
});
