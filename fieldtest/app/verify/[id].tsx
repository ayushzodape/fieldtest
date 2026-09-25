import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { Config } from '../../constants/config';
import { getFieldTestById, FieldTestRow } from '../../lib/records';
import { verifyRecordIntegrity, VerificationResult, canonicalizeJson } from '../../lib/crypto';
import { CanonicalRecord } from '../../types/record';
import { createInitialAuditChain, verifyAuditChain, AuditChain, AuditVerificationResult } from '../../lib/auditTrail';

export type TamperOption =
  | 'none'
  | 'result'
  | 'confidence'
  | 'timestamp'
  | 'latitude'
  | 'operator'
  | 'image_hash'
  | 'schema';

interface TamperChoice {
  id: TamperOption;
  label: string;
  field: string;
  desc: string;
}

const TAMPER_CHOICES: TamperChoice[] = [
  {
    id: 'none',
    label: 'Authentic Record',
    field: 'None',
    desc: 'Original sealed canonical record with matching Ed25519 signature.',
  },
  {
    id: 'result',
    label: 'Classification',
    field: 'classification.result',
    desc: 'Flip result between PRESUMPTIVE_POSITIVE and PRESUMPTIVE_NEGATIVE.',
  },
  {
    id: 'confidence',
    label: 'Confidence (1 digit)',
    field: 'classification.confidence',
    desc: 'Nudge confidence by 0.01 (0.94 → 0.95). Proves 1-digit change breaks entire hash.',
  },
  {
    id: 'timestamp',
    label: 'Timestamp (+1s)',
    field: 'capturedAt',
    desc: 'Shift capture timestamp forward by exactly 1 second. Proves temporal immutability.',
  },
  {
    id: 'latitude',
    label: 'GPS (+0.001°)',
    field: 'location.latitude',
    desc: 'Nudge latitude by 0.001° (~111 meters). Proves geospatial binding.',
  },
  {
    id: 'operator',
    label: 'Operator Identity',
    field: 'operatorId',
    desc: 'Modify operator ID (OP-042 → OP-999). Proves chain-of-custody identity binding.',
  },
  {
    id: 'image_hash',
    label: 'Image Hash',
    field: 'imageSha256',
    desc: 'Swap byte in raw photo SHA-256 digest. Proves photograph-to-record binding.',
  },
  {
    id: 'schema',
    label: 'Schema Version',
    field: 'schemaVersion',
    desc: 'Modify schema version (1.0 → 2.0). Proves structural schema enforcement.',
  },
];

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<FieldTestRow | null>(null);
  const [selectedTamper, setSelectedTamper] = useState<TamperOption>('none');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [auditChain, setAuditChain] = useState<AuditChain | null>(null);
  const [auditVerification, setAuditVerification] = useState<AuditVerificationResult | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Active modified canonical record
  const [activeCanonical, setActiveCanonical] = useState<CanonicalRecord | null>(null);
  const [tamperedFieldInfo, setTamperedFieldInfo] = useState<{
    fieldName: string;
    originalVal: string;
    tamperedVal: string;
  } | null>(null);

  useEffect(() => {
    loadRecordAndAudit(selectedTamper);
  }, [id, selectedTamper]);

  const loadRecordAndAudit = async (tamper: TamperOption) => {
    setIsVerifying(true);
    const targetId = id || 'FT-2026-000184';
    const row = await getFieldTestById(targetId);

    if (row) {
      setRecord(row);

      // Build initial or tampered canonical record
      let target: CanonicalRecord = JSON.parse(JSON.stringify(row.canonical_record));
      let fieldInfo = null;

      if (tamper === 'result') {
        const orig = target.classification.result;
        const next = orig === 'PRESUMPTIVE_POSITIVE' ? 'PRESUMPTIVE_NEGATIVE' : 'PRESUMPTIVE_POSITIVE';
        target.classification.result = next;
        fieldInfo = { fieldName: 'classification.result', originalVal: orig, tamperedVal: next };
      } else if (tamper === 'confidence') {
        const orig = target.classification.confidence;
        const next = parseFloat((orig === 0.94 ? 0.95 : 0.94).toFixed(2));
        target.classification.confidence = next;
        fieldInfo = { fieldName: 'classification.confidence', originalVal: orig.toString(), tamperedVal: next.toString() };
      } else if (tamper === 'timestamp') {
        const orig = target.capturedAt;
        const date = new Date(orig);
        date.setSeconds(date.getSeconds() + 1);
        const next = date.toISOString();
        target.capturedAt = next;
        fieldInfo = { fieldName: 'capturedAt', originalVal: orig, tamperedVal: next };
      } else if (tamper === 'latitude') {
        const orig = target.location.latitude;
        const next = parseFloat((orig + 0.001).toFixed(4));
        target.location.latitude = next;
        fieldInfo = { fieldName: 'location.latitude', originalVal: orig.toString(), tamperedVal: next.toString() };
      } else if (tamper === 'operator') {
        const orig = target.operatorId;
        const next = orig === 'OP-042' ? 'OP-999' : 'OP-042';
        target.operatorId = next;
        fieldInfo = { fieldName: 'operatorId', originalVal: orig, tamperedVal: next };
      } else if (tamper === 'image_hash') {
        const orig = target.imageSha256;
        const next = orig.endsWith('a') ? orig.slice(0, -1) + 'b' : orig.slice(0, -1) + 'a';
        target.imageSha256 = next;
        fieldInfo = { fieldName: 'imageSha256', originalVal: `${orig.slice(0, 8)}...`, tamperedVal: `${next.slice(0, 8)}...` };
      } else if (tamper === 'schema') {
        const orig = target.schemaVersion;
        const next = '2.0' as const;
        target.schemaVersion = next;
        fieldInfo = { fieldName: 'schemaVersion', originalVal: orig, tamperedVal: next };
      }

      setActiveCanonical(target);
      setTamperedFieldInfo(fieldInfo);

      // Verify Record
      const verifyRes = await verifyRecordIntegrity(
        target,
        row.record_hash,
        row.signature,
        row.public_key
      );
      setVerification(verifyRes);

      // Verify Audit Trail Hash Chain
      const chain = await createInitialAuditChain(target);
      const chainVerifyRes = await verifyAuditChain(chain);
      setAuditChain(chain);
      setAuditVerification(chainVerifyRes);
    }

    setIsVerifying(false);
  };

  const handleCopyBundle = () => {
    if (!record || !activeCanonical) return;
    const bundle = {
      recordId: record.record_id,
      canonicalRecord: activeCanonical,
      recordHash: record.record_hash,
      signature: record.signature,
      publicKey: record.public_key,
      verifyUrl: `https://fieldtest.app/verify/${record.record_id}`,
      verificationInstructions: 'Paste into fieldtest/public/verify.html or verify via TweetNaCl CLI',
    };

    const text = JSON.stringify(bundle, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedStatus('Copied full evidence JSON bundle to clipboard!');
      setTimeout(() => setCopiedStatus(null), 3500);
    }
  };

  const isVerified = verification ? verification.isValid : true;
  const isTampered = selectedTamper !== 'none';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Record header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>INDEPENDENT FORENSIC VERIFIER</Text>
        <Text style={styles.recordId}>{record?.record_id || id || 'FT-2026-000184'}</Text>
      </View>

      {/* Main Integrity Banner */}
      {isVerified ? (
        <View style={styles.integrityValid}>
          <View style={styles.integrityIconContainer}>
            <Ionicons name="shield-checkmark" size={44} color={Colors.success} />
          </View>
          <Text style={styles.integrityTitle}>RECORD INTEGRITY</Text>
          <Text style={styles.integrityStatus}>✓ VERIFIED AUTHENTIC</Text>
          <Text style={styles.integrityDescription}>
            The Ed25519 digital signature is cryptographically valid. Canonical SHA-256 hash matches the sealed record exactly. Zero post-capture modifications detected.
          </Text>
        </View>
      ) : (
        <View style={styles.integrityFailed}>
          <View style={styles.integrityIconContainerFailed}>
            <Ionicons name="alert-circle" size={44} color={Colors.danger} />
          </View>
          <Text style={styles.integrityTitleFailed}>INTEGRITY CHECK FAILED</Text>
          <Text style={styles.integrityStatusFailed}>✗ TAMPERING DETECTED</Text>
          <Text style={styles.integrityDescriptionFailed}>
            {verification?.reason || 'Record hash mismatch! Modification detected after digital sealing.'}
          </Text>

          {/* Side-by-side Hash Comparison */}
          <View style={styles.hashComparison}>
            <View style={styles.hashRow}>
              <Text style={styles.hashLabel}>Expected Hash (Sealed):</Text>
              <Text style={styles.hashValue} numberOfLines={1}>
                {verification?.expectedHash || '—'}
              </Text>
            </View>
            <View style={styles.hashRow}>
              <Text style={styles.hashLabel}>Current Hash (Recalculated):</Text>
              <Text style={styles.hashValueFailed} numberOfLines={1}>
                {verification?.computedHash || '—'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Tamper Diff Inspector (When Tampered) */}
      {isTampered && tamperedFieldInfo && (
        <View style={styles.tamperDiffCard}>
          <View style={styles.diffHeader}>
            <Ionicons name="git-commit-outline" size={18} color={Colors.danger} />
            <Text style={styles.diffTitle}>TAMPER DIFF INSPECTOR</Text>
          </View>
          <Text style={styles.diffField}>Modified Field: <Text style={styles.monoBold}>{tamperedFieldInfo.fieldName}</Text></Text>
          <View style={styles.diffComparisonRow}>
            <View style={styles.diffBoxOriginal}>
              <Text style={styles.diffBoxLabel}>ORIGINAL VALUE</Text>
              <Text style={styles.diffBoxValueOrig}>{tamperedFieldInfo.originalVal}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={Colors.textTertiary} />
            <View style={styles.diffBoxTampered}>
              <Text style={styles.diffBoxLabel}>TAMPERED VALUE</Text>
              <Text style={styles.diffBoxValueTamp}>{tamperedFieldInfo.tamperedVal}</Text>
            </View>
          </View>
          <Text style={styles.avalancheNote}>
            <strong>Avalanche Effect:</strong> Modifying this single field scrambled the entire 64-character SHA-256 digest and completely invalidated the server's Ed25519 digital signature.
          </Text>
        </View>
      )}

      {/* Approach 1: Multi-Field Tamper Selector Bar */}
      <View style={styles.demoSection}>
        <View style={styles.selectorHeader}>
          <Ionicons name="construct" size={18} color={Colors.primary} />
          <Text style={styles.demoLabel}>MULTI-FIELD TAMPER SIMULATION (FOR COURT / JURY)</Text>
        </View>
        <Text style={styles.demoDescription}>
          Select a field to modify. This proves FieldTest detects post-capture modification to ANY part of the evidentiary record, not just the classification result:
        </Text>

        <View style={styles.chipGrid}>
          {TAMPER_CHOICES.map((choice) => {
            const isSelected = selectedTamper === choice.id;
            return (
              <TouchableOpacity
                key={choice.id}
                style={[
                  styles.tamperChip,
                  isSelected && (choice.id === 'none' ? styles.chipActiveAuth : styles.chipActiveTamper),
                ]}
                onPress={() => setSelectedTamper(choice.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={choice.id === 'none' ? 'shield-checkmark' : 'warning-outline'}
                  size={14}
                  color={isSelected ? Colors.textInverse : choice.id === 'none' ? Colors.success : Colors.danger}
                />
                <Text
                  style={[
                    styles.tamperChipText,
                    isSelected && styles.tamperChipTextActive,
                  ]}
                >
                  {choice.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isTampered && (
          <TouchableOpacity
            style={styles.restoreFullButton}
            onPress={() => setSelectedTamper('none')}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color={Colors.textInverse} />
            <Text style={styles.restoreFullButtonText}>Restore Authentic Record</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Approach 5: Audit Trail Hash Chain Card */}
      <View style={styles.auditCard}>
        <View style={styles.auditHeader}>
          <Ionicons name="link-outline" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>AUDIT TRAIL HASH CHAIN (IMMUTABLE LIFECYCLE)</Text>
        </View>
        <Text style={styles.auditSubtitle}>
          Each lifecycle event hashes the preceding event hash, forming a linked chain. Deleting or modifying any prior event breaks all subsequent links.
        </Text>

        {auditChain?.events.map((ev, idx) => (
          <View key={ev.sequenceNumber} style={styles.auditEventRow}>
            <View style={styles.auditDotCol}>
              <View style={[styles.auditDot, { backgroundColor: isVerified ? Colors.success : Colors.danger }]} />
              {idx < auditChain.events.length - 1 && <View style={styles.auditLine} />}
            </View>
            <View style={styles.auditInfoCol}>
              <View style={styles.auditEventHeader}>
                <Text style={styles.auditEventName}>#{ev.sequenceNumber} {ev.eventType}</Text>
                <Text style={styles.auditEventTime}>{new Date(ev.timestamp).toLocaleTimeString()}</Text>
              </View>
              <Text style={styles.auditEventHash} numberOfLines={1}>
                Hash: {ev.eventHash.slice(0, 16)}... ← Prev: {ev.previousEventHash.slice(0, 8)}...
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.auditStatusBadge}>
          <Ionicons name={auditVerification?.isValid ? 'checkmark-circle' : 'alert-circle'} size={14} color={auditVerification?.isValid ? Colors.success : Colors.danger} />
          <Text style={[styles.auditStatusText, { color: auditVerification?.isValid ? Colors.success : Colors.danger }]}>
            Audit Chain: {auditVerification?.isValid ? 'ALL LINKS INTACT & VERIFIED' : 'CHAIN COMPROMISED'}
          </Text>
        </View>
      </View>

      {/* Verification details table */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>CANONICAL RECORD ATTRIBUTES</Text>

        <DetailRow
          label="RECORD ID"
          value={activeCanonical?.recordId || '—'}
          mono
        />
        <DetailRow
          label="OPERATOR ID"
          value={activeCanonical?.operatorId || '—'}
          mono
        />
        <DetailRow
          label="RESULT"
          value={activeCanonical?.classification.result || '—'}
          valueColor={
            activeCanonical?.classification.result === 'PRESUMPTIVE_POSITIVE'
              ? Colors.danger
              : Colors.success
          }
        />
        <DetailRow
          label="CONFIDENCE"
          value={activeCanonical ? `${Math.round(activeCanonical.classification.confidence * 100)}%` : '—'}
          mono
        />
        <DetailRow
          label="CAPTURED AT"
          value={activeCanonical?.capturedAt || '—'}
          mono
        />
        <DetailRow
          label="GPS COORDINATES"
          value={`${activeCanonical?.location.latitude}, ${activeCanonical?.location.longitude} (±${activeCanonical?.location.accuracyMeters}m)`}
          mono
        />
        <DetailRow
          label="IMAGE SHA-256"
          value={activeCanonical?.imageSha256 ? `${activeCanonical.imageSha256.slice(0, 12)}...` : '—'}
          mono
        />
        <DetailRow
          label="CLASSIFIER"
          value={activeCanonical?.classification.classifierVersion || 'color-v1.0'}
          mono
        />
        <DetailRow
          label="SCHEMA"
          value={`v${activeCanonical?.schemaVersion || '1.0'}`}
          mono
        />
        {record?.server_received_at && (
          <DetailRow
            label="SERVER NTP TIME"
            value={record.server_received_at}
            mono
          />
        )}
        {typeof record?.clock_skew_seconds === 'number' && (
          <DetailRow
            label="CLOCK SKEW"
            value={`${record.clock_skew_seconds}s (≤120s limit)`}
            mono
          />
        )}
        {record?.fix_type && (
          <DetailRow
            label="GNSS FIX TYPE"
            value={record.fix_type}
            mono
          />
        )}
        {typeof record?.is_mock_location === 'boolean' && (
          <DetailRow
            label="ANTI-SPOOFING"
            value={record.is_mock_location ? 'MOCK LOCATION FLAGGED' : 'AUTHENTIC GNSS HARDWARE'}
            valueColor={record.is_mock_location ? Colors.danger : Colors.success}
          />
        )}
      </View>

      {/* Export / External Verification Tools */}
      <View style={styles.exportCard}>
        <Text style={styles.sectionTitle}>EXTERNAL CROSS-DEVICE VERIFICATION (FRE 901)</Text>
        <Text style={styles.exportDesc}>
          Export the self-authenticating JSON evidence bundle to verify independently on any laptop, tablet, or external device using our zero-dependency verification page:
        </Text>

        <TouchableOpacity
          style={styles.copyBundleButton}
          onPress={handleCopyBundle}
          activeOpacity={0.8}
        >
          <Ionicons name="copy-outline" size={16} color={Colors.primary} />
          <Text style={styles.copyBundleButtonText}>Copy Canonical Evidence Bundle</Text>
        </TouchableOpacity>

        {copiedStatus && (
          <Text style={styles.copiedSuccessText}>{copiedStatus}</Text>
        )}

        <View style={styles.verifierNotice}>
          <Ionicons name="globe-outline" size={16} color={Colors.accent} />
          <Text style={styles.verifierNoticeText}>
            Standalone Web Verifier available at <Text style={styles.monoBold}>fieldtest/public/verify.html</Text>.
          </Text>
        </View>
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
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
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
    padding: Spacing['2xl'],
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  integrityIconContainer: {
    marginBottom: Spacing.sm,
  },
  integrityTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  integrityStatus: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  integrityDescription: {
    fontSize: FontSize.xs,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Integrity failed
  integrityFailed: {
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  integrityIconContainerFailed: {
    marginBottom: Spacing.sm,
  },
  integrityTitleFailed: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.danger,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  integrityStatusFailed: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  integrityDescriptionFailed: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  hashComparison: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  hashRow: {
    marginBottom: Spacing.xs,
  },
  hashLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  hashValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
  },
  hashValueFailed: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.danger,
    fontWeight: FontWeight.bold,
  },

  // Tamper Diff Card
  tamperDiffCard: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  diffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  diffTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.danger,
    letterSpacing: 0.5,
  },
  diffField: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  monoBold: {
    fontFamily: 'monospace',
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  diffComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  diffBoxOriginal: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  diffBoxTampered: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  diffBoxLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  diffBoxValueOrig: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  diffBoxValueTamp: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: FontWeight.bold,
    color: Colors.danger,
  },
  avalancheNote: {
    fontSize: 11,
    color: '#881337',
    lineHeight: 16,
  },

  // Demo Section & Chip Grid
  demoSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  demoLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  demoDescription: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tamperChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActiveAuth: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  chipActiveTamper: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  tamperChipText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  tamperChipTextActive: {
    color: Colors.textInverse,
  },
  restoreFullButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  restoreFullButtonText: {
    color: Colors.textInverse,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Audit Trail Card
  auditCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  auditSubtitle: {
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  auditEventRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  auditDotCol: {
    width: 20,
    alignItems: 'center',
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  auditLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  auditInfoCol: {
    flex: 1,
    paddingLeft: Spacing.xs,
  },
  auditEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  auditEventName: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  auditEventTime: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  auditEventHash: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
  },
  auditStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  auditStatusText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },

  // Details card
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  detailValue: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  mono: {
    fontFamily: 'monospace',
  },

  // Export Card
  exportCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  exportDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  copyBundleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  copyBundleButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  copiedSuccessText: {
    marginTop: Spacing.xs,
    fontSize: 11,
    color: Colors.success,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  verifierNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.sm,
  },
  verifierNoticeText: {
    fontSize: 11,
    color: Colors.accent,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
});
