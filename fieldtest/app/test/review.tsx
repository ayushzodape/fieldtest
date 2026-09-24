import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';

/**
 * Review screen — displays captured image with quality validation results.
 * Operator confirms or retakes before classification proceeds.
 */
export default function ReviewScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Captured image placeholder */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image" size={48} color={Colors.textTertiary} />
          <Text style={styles.imagePlaceholderText}>Captured Image</Text>
        </View>
      </View>

      {/* Quality checks */}
      <View style={styles.qualityCard}>
        <Text style={styles.sectionTitle}>IMAGE QUALITY</Text>

        <QualityRow label="Reference card" value="Detected" status="pass" />
        <QualityRow label="Focus" value="Sharp" status="pass" />
        <QualityRow label="Exposure" value="Good" status="pass" />
        <QualityRow label="Test region" value="Detected" status="pass" />
        <QualityRow label="Lighting" value="GOOD" status="pass" />
        <QualityRow label="Glare" value="None" status="pass" />
      </View>

      {/* Metadata */}
      <View style={styles.metadataCard}>
        <Text style={styles.sectionTitle}>CAPTURE METADATA</Text>

        <MetadataRow label="Timestamp" value="24 Sep 2026 · 22:41:32 IST" />
        <MetadataRow label="Location" value="19.0760, 72.8777" />
        <MetadataRow label="GPS accuracy" value="±8.4 m" />
        <MetadataRow label="Operator" value="OP-042" />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-reverse" size={20} color={Colors.accent} />
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.proceedButton}
          onPress={() => router.push('/test/result')}
          activeOpacity={0.85}
        >
          <Text style={styles.proceedButtonText}>Classify Result</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function QualityRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'pass' | 'warn' | 'fail';
}) {
  const statusColor =
    status === 'pass' ? Colors.success : status === 'warn' ? Colors.warning : Colors.danger;
  const statusIcon =
    status === 'pass'
      ? 'checkmark-circle'
      : status === 'warn'
        ? 'warning'
        : 'close-circle';

  return (
    <View style={styles.qualityRow}>
      <Ionicons name={statusIcon as any} size={16} color={statusColor} />
      <Text style={styles.qualityLabel}>{label}</Text>
      <Text style={[styles.qualityValue, { color: statusColor }]}>{value}</Text>
    </View>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metadataRow}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue}>{value}</Text>
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
  imageContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  imagePlaceholder: {
    height: 240,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  imagePlaceholderText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  qualityCard: {
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
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  qualityLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  qualityValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  metadataCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  metadataLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  metadataValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  retakeButton: {
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
  retakeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  proceedButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent,
  },
  proceedButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
});
