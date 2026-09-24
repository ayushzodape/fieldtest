import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { Config } from '../../constants/config';

/**
 * Classification result screen — shows the classifier's output with
 * full explanation: color swatches, Delta E, confidence, and quality metrics.
 *
 * This is the "explainable AI" screen that makes the system credible.
 */
export default function ResultScreen() {
  const router = useRouter();

  // Demo classification result
  const result = 'PRESUMPTIVE_POSITIVE';
  const confidence = 0.94;
  const deltaE = 18.4;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Result header */}
      <View style={styles.resultHeader}>
        <View style={styles.resultIconContainer}>
          <Ionicons name="analytics" size={32} color={Colors.danger} />
        </View>
        <Text style={styles.resultTitle}>Presumptive Positive</Text>
        <Text style={styles.confidenceText}>
          {Math.round(confidence * 100)}% classification confidence
        </Text>
      </View>

      {/* Color analysis */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>COLOR ANALYSIS</Text>

        {/* Reference card color */}
        <View style={styles.colorRow}>
          <Text style={styles.colorLabel}>Reference card</Text>
          <View style={styles.colorSwatchContainer}>
            <View style={[styles.colorSwatch, { backgroundColor: '#B8B084' }]} />
            <Text style={styles.colorValues}>R 184 · G 176 · B 132</Text>
          </View>
        </View>

        {/* Observed reaction color */}
        <View style={styles.colorRow}>
          <Text style={styles.colorLabel}>Observed reaction</Text>
          <View style={styles.colorSwatchContainer}>
            <View style={[styles.colorSwatch, { backgroundColor: '#8B5E3C' }]} />
            <Text style={styles.colorValues}>R 139 · G 94 · B 60</Text>
          </View>
        </View>

        {/* Delta E bar */}
        <View style={styles.deltaEContainer}>
          <View style={styles.deltaEHeader}>
            <Text style={styles.deltaELabel}>Color difference (ΔE)</Text>
            <Text style={styles.deltaEValue}>{deltaE}</Text>
          </View>
          <View style={styles.deltaEBar}>
            <View
              style={[
                styles.deltaEFill,
                { width: `${Math.min(100, (deltaE / 30) * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.deltaEScale}>
            <Text style={styles.deltaEScaleLabel}>Negative</Text>
            <Text style={styles.deltaEScaleLabel}>Inconclusive</Text>
            <Text style={styles.deltaEScaleLabel}>Positive</Text>
          </View>
        </View>
      </View>

      {/* Image quality */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>IMAGE QUALITY</Text>

        <QualityBar label="Reference card" value={100} status="pass" />
        <QualityBar label="Focus" value={95} status="pass" />
        <QualityBar label="Exposure" value={88} status="pass" />
        <QualityBar label="Lighting" value={92} status="pass" />
      </View>

      {/* Explanation */}
      <View style={styles.explanationCard}>
        <Ionicons name="information-circle" size={18} color={Colors.accent} />
        <Text style={styles.explanationText}>
          Classification is based on normalized color features relative to the reference
          card. Color difference (ΔE) of {deltaE} exceeds the positive threshold of{' '}
          {Config.classification.positiveThreshold}.
        </Text>
      </View>

      {/* Classifier version */}
      <View style={styles.versionRow}>
        <Text style={styles.versionLabel}>Classifier</Text>
        <Text style={styles.versionValue}>{Config.classifierVersion}</Text>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="warning" size={16} color={Colors.warning} />
        <Text style={styles.disclaimerText}>{Config.disclaimerFull}</Text>
      </View>

      {/* Seal record button */}
      <TouchableOpacity
        style={styles.sealButton}
        onPress={() => router.push('/test/sealed')}
        activeOpacity={0.85}
      >
        <Ionicons name="lock-closed" size={20} color={Colors.textInverse} />
        <Text style={styles.sealButtonText}>Seal Digital Record</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function QualityBar({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: 'pass' | 'warn' | 'fail';
}) {
  const barColor =
    status === 'pass' ? Colors.success : status === 'warn' ? Colors.warning : Colors.danger;

  return (
    <View style={styles.qualityBarContainer}>
      <View style={styles.qualityBarHeader}>
        <Text style={styles.qualityBarLabel}>{label}</Text>
        <Text style={[styles.qualityBarValue, { color: barColor }]}>
          {status === 'pass' ? 'GOOD' : status === 'warn' ? 'FAIR' : 'POOR'}
        </Text>
      </View>
      <View style={styles.qualityBar}>
        <View
          style={[
            styles.qualityBarFill,
            { width: `${value}%`, backgroundColor: barColor },
          ]}
        />
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
  resultHeader: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  resultIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.danger,
    marginBottom: Spacing.xs,
  },
  confidenceText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  card: {
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
  colorRow: {
    marginBottom: Spacing.md,
  },
  colorLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  colorSwatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 40,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorValues: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  deltaEContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  deltaEHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deltaELabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  deltaEValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  deltaEBar: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  deltaEFill: {
    height: '100%',
    backgroundColor: Colors.danger,
    borderRadius: 4,
  },
  deltaEScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  deltaEScaleLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  qualityBarContainer: {
    marginBottom: Spacing.md,
  },
  qualityBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  qualityBarLabel: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  qualityBarValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  qualityBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  qualityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  explanationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  explanationText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.accent,
    lineHeight: 20,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  versionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  versionValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
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
  sealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
  },
  sealButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
});
