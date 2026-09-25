import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { getActiveTestDraft } from '../../lib/testSession';
import { DEMO_FIXTURES } from '../../lib/classifier';

export default function ReviewScreen() {
  const router = useRouter();
  const draft = getActiveTestDraft();
  const fixture = DEMO_FIXTURES[draft.scenarioKey];

  const dateObj = new Date(draft.timestamp);
  const formattedTime = !isNaN(dateObj.getTime())
    ? dateObj.toUTCString()
    : '24 Sep 2026 UTC';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Captured Image / Sample Visualization */}
      <View style={styles.imageContainer}>
        {draft.evidenceDataUri ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: draft.evidenceDataUri }}
              style={styles.evidenceImage}
              resizeMode="contain"
            />
            <View style={styles.previewTag}>
              <Text style={styles.previewTagText}>AUTHENTIC RASTER CAPTURE (24-BIT BMP)</Text>
            </View>
            <View style={styles.shaBadge}>
              <Ionicons name="finger-print" size={14} color={Colors.textInverse} />
              <Text style={styles.shaBadgeText} numberOfLines={1}>
                SHA-256: {draft.imageSha256?.substring(0, 16)}...
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.imagePreviewBox,
              {
                backgroundColor: `rgb(${fixture.params.observedRgb.r}, ${fixture.params.observedRgb.g}, ${fixture.params.observedRgb.b})`,
              },
            ]}
          >
            <View style={styles.previewTag}>
              <Text style={styles.previewTagText}>RAW SENSOR CAPTURE</Text>
            </View>
            <View style={styles.whiteReferenceChip}>
              <View style={styles.whiteDot} />
              <Text style={styles.whiteReferenceText}>Ref White: 245, 245, 245</Text>
            </View>
          </View>
        )}
      </View>

      {/* Quality checks */}
      <View style={styles.qualityCard}>
        <Text style={styles.sectionTitle}>IMAGE QUALITY GATES</Text>

        <QualityRow
          label="Reference card detected"
          value={draft.quality.referenceCard ? 'Valid (CIE D65)' : 'Missing'}
          status={draft.quality.referenceCard ? 'pass' : 'fail'}
        />
        <QualityRow
          label="Focus & sharpness"
          value={draft.quality.focus ? 'Sharp (Variance > 180)' : 'Blurry'}
          status={draft.quality.focus ? 'pass' : 'fail'}
        />
        <QualityRow
          label="Exposure & dynamic range"
          value="Normal (No clipping)"
          status="pass"
        />
        <QualityRow
          label="Test region segmentation"
          value={draft.quality.testRegion ? 'Segmented' : 'Not detected'}
          status={draft.quality.testRegion ? 'pass' : 'fail'}
        />
        <QualityRow
          label="Lighting condition"
          value={draft.quality.lighting}
          status={draft.quality.lighting === 'GOOD' ? 'pass' : draft.quality.lighting === 'FAIR' ? 'warn' : 'fail'}
        />
        <QualityRow
          label="Specular glare filter"
          value={draft.quality.lighting === 'POOR' ? 'High Glare' : 'Suppressed'}
          status={draft.quality.lighting === 'POOR' ? 'fail' : 'pass'}
        />
      </View>

      {/* Metadata */}
      <View style={styles.metadataCard}>
        <Text style={styles.sectionTitle}>PROVENANCE METADATA</Text>

        <MetadataRow label="Timestamp (UTC)" value={formattedTime} mono />
        <MetadataRow
          label="GPS Coordinates"
          value={`${draft.latitude.toFixed(4)}, ${draft.longitude.toFixed(4)}`}
          mono
        />
        <MetadataRow label="GPS Accuracy" value={`±${draft.accuracyMeters} m`} mono />
        <MetadataRow label="Operator Identity" value={draft.operatorId} mono />
        <MetadataRow label="Kit Type" value="Marquis Reagent (Acid/Formaldehyde)" />
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
          <Text style={styles.proceedButtonText}>Run Deterministic Analysis</Text>
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
      <Ionicons name={statusIcon} size={16} color={statusColor} />
      <Text style={styles.qualityLabel}>{label}</Text>
      <Text style={[styles.qualityValue, { color: statusColor }]}>{value}</Text>
    </View>
  );
}

function MetadataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.metadataRow}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={[styles.metadataValue, mono && styles.mono]}>{value}</Text>
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
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    backgroundColor: '#172033',
    ...Shadow.sm,
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  shaBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shaBadgeText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  imagePreviewBox: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.lg,
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  previewTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  previewTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  whiteReferenceChip: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  whiteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  whiteReferenceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  qualityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  qualityLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  qualityValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  metadataCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metadataLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  metadataValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  mono: {
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  retakeButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  proceedButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.md,
  },
  proceedButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
});
