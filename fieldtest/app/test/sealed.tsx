import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { Config } from '../../constants/config';

/**
 * Sealed record screen — the chain-of-custody timeline view.
 *
 * This is the visual heart of the product. It shows every step of the
 * evidence pipeline as a timeline, demonstrating that the capture,
 * validation, classification, and sealing all happened in sequence
 * with cryptographic integrity.
 */
export default function SealedScreen() {
  const router = useRouter();

  const recordId = 'FT-2026-000184';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Record header */}
      <View style={styles.recordHeader}>
        <Text style={styles.recordIdLabel}>FIELD TEST RECORD</Text>
        <Text style={styles.recordId}>{recordId}</Text>

        {/* Status badge */}
        <View style={styles.sealedBadge}>
          <Ionicons name="lock-closed" size={14} color={Colors.success} />
          <Text style={styles.sealedBadgeText}>RECORD SEALED</Text>
        </View>
      </View>

      {/* Chain of custody timeline */}
      <View style={styles.timeline}>
        <TimelineEvent
          time="22:41:02"
          icon="person"
          title="Test initiated"
          description="Operator OP-042"
          isFirst
        />
        <TimelineEvent
          time="22:41:11"
          icon="camera"
          title="Image captured"
          description="SHA-256: 8e4a...91bf"
          mono
        />
        <TimelineEvent
          time="22:41:12"
          icon="checkmark-circle"
          title="Reference card validated"
          description="Lighting: GOOD"
        />
        <TimelineEvent
          time="22:41:13"
          icon="analytics"
          title="Classification completed"
          description="PRESUMPTIVE POSITIVE"
          descriptionColor={Colors.danger}
          extra="Confidence: 94%"
        />
        <TimelineEvent
          time="22:41:14"
          icon="lock-closed"
          title="Record sealed"
          description="Signature: VALID"
          descriptionColor={Colors.success}
          isLast
        />
      </View>

      {/* Evidence summary */}
      <View style={styles.evidenceCard}>
        <Text style={styles.sectionTitle}>EVIDENCE SUMMARY</Text>

        <EvidenceRow label="Image captured" status="pass" />
        <EvidenceRow label="Reference card detected" status="pass" />
        <EvidenceRow label="Lighting check" status="pass" />
        <EvidenceRow label="GPS captured" status="pass" />
        <EvidenceRow label="Timestamp recorded" status="pass" />
        <EvidenceRow label="Image SHA-256" value="8e4a...91bf" />
        <EvidenceRow label="Digital signature" status="pass" value="VALID" />
      </View>

      {/* Location */}
      <View style={styles.locationCard}>
        <Text style={styles.sectionTitle}>LOCATION</Text>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Coordinates</Text>
          <Text style={styles.locationValue}>19.0760, 72.8777</Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Accuracy</Text>
          <Text style={styles.locationValue}>±8.4 m</Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Source</Text>
          <Text style={styles.locationValue}>Device GPS</Text>
        </View>
      </View>

      {/* Record integrity */}
      <View style={styles.integrityCard}>
        <Ionicons name="shield-checkmark" size={24} color={Colors.success} />
        <Text style={styles.integrityTitle}>RECORD INTEGRITY: VERIFIED</Text>
        <Text style={styles.integrityDescription}>
          This record's digital signature has been verified.
          The contents have not been modified since signing.
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="warning" size={16} color={Colors.warning} />
        <Text style={styles.disclaimerText}>{Config.disclaimerFull}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => router.push(`/verify/${recordId}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark" size={18} color={Colors.accent} />
          <Text style={styles.verifyButtonText}>Verify Record</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function TimelineEvent({
  time,
  icon,
  title,
  description,
  descriptionColor,
  extra,
  mono,
  isFirst,
  isLast,
}: {
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  descriptionColor?: string;
  extra?: string;
  mono?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={styles.timelineEvent}>
      {/* Time */}
      <Text style={styles.timelineTime}>{time}</Text>

      {/* Line + dot */}
      <View style={styles.timelineLine}>
        {!isFirst && <View style={styles.timelineLineTop} />}
        <View style={styles.timelineDot}>
          <Ionicons name={icon} size={14} color={Colors.accent} />
        </View>
        {!isLast && <View style={styles.timelineLineBottom} />}
      </View>

      {/* Content */}
      <View style={styles.timelineContent}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text
          style={[
            styles.timelineDescription,
            mono && styles.mono,
            descriptionColor ? { color: descriptionColor } : {},
          ]}
        >
          {description}
        </Text>
        {extra && <Text style={styles.timelineExtra}>{extra}</Text>}
      </View>
    </View>
  );
}

function EvidenceRow({
  label,
  status,
  value,
}: {
  label: string;
  status?: 'pass' | 'fail';
  value?: string;
}) {
  return (
    <View style={styles.evidenceRow}>
      <Text style={styles.evidenceLabel}>{label}</Text>
      <View style={styles.evidenceRight}>
        {value && <Text style={styles.evidenceValue}>{value}</Text>}
        {status && (
          <Ionicons
            name={status === 'pass' ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={status === 'pass' ? Colors.success : Colors.danger}
          />
        )}
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
  recordHeader: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  recordIdLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  recordId: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    fontFamily: 'monospace',
    marginBottom: Spacing.md,
  },
  sealedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  sealedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    letterSpacing: 0.5,
  },

  // Timeline
  timeline: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineEvent: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineTime: {
    width: 60,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
    paddingTop: 4,
  },
  timelineLine: {
    width: 32,
    alignItems: 'center',
  },
  timelineLineTop: {
    width: 1,
    flex: 1,
    backgroundColor: Colors.border,
    position: 'absolute',
    top: 0,
    bottom: '50%',
  },
  timelineLineBottom: {
    width: 1,
    flex: 1,
    backgroundColor: Colors.border,
    position: 'absolute',
    top: '50%',
    bottom: 0,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  timelineTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  timelineDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  timelineExtra: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  mono: {
    fontFamily: 'monospace',
  },

  // Evidence
  evidenceCard: {
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
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  evidenceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  evidenceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  evidenceValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },

  // Location
  locationCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  locationLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  locationValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },

  // Integrity
  integrityCard: {
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  integrityTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  integrityDescription: {
    fontSize: FontSize.sm,
    color: Colors.success,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
    lineHeight: 16,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  verifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  verifyButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  doneButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  doneButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
});
