import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { Config } from '../../constants/config';
import { getActiveTestDraft, updateActiveTestDraft } from '../../lib/testSession';
import { classifySample, DEMO_FIXTURES } from '../../lib/classifier';

export default function ResultScreen() {
  const router = useRouter();
  const draft = getActiveTestDraft();
  const fixture = DEMO_FIXTURES[draft.scenarioKey];

  // Run deterministic color classification
  const classification = useMemo(() => {
    const res = classifySample(fixture.params);
    updateActiveTestDraft({ classification: res });
    return res;
  }, [draft.scenarioKey]);

  const result = classification.result;
  const confidence = classification.confidence;
  const deltaE = classification.explanation.colorDifference;

  const resultColor =
    result === 'PRESUMPTIVE_POSITIVE'
      ? Colors.danger
      : result === 'PRESUMPTIVE_NEGATIVE'
        ? Colors.success
        : Colors.warning;

  const resultBg =
    result === 'PRESUMPTIVE_POSITIVE'
      ? Colors.dangerLight
      : result === 'PRESUMPTIVE_NEGATIVE'
        ? Colors.successLight
        : Colors.warningLight;

  const resultTitle =
    result === 'PRESUMPTIVE_POSITIVE'
      ? 'Presumptive Positive'
      : result === 'PRESUMPTIVE_NEGATIVE'
        ? 'Presumptive Negative'
        : result === 'INCONCLUSIVE'
          ? 'Inconclusive Result'
          : 'Invalid Capture';

  const obs = classification.explanation.normalizedTestColor;
  const ref = classification.explanation.referenceBaselineColor;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Result Header Badge */}
      <View style={[styles.resultHeader, { backgroundColor: resultBg, borderColor: resultColor }]}>
        <View style={styles.resultIconContainer}>
          <Ionicons
            name={
              result === 'PRESUMPTIVE_POSITIVE'
                ? 'alert-circle'
                : result === 'PRESUMPTIVE_NEGATIVE'
                  ? 'checkmark-circle'
                  : 'help-circle'
            }
            size={36}
            color={resultColor}
          />
        </View>
        <Text style={[styles.resultTitle, { color: resultColor }]}>{resultTitle}</Text>
        <Text style={styles.confidenceText}>
          {Math.round(confidence * 100)}% Classification Confidence ({classification.classifierVersion})
        </Text>
      </View>

      {/* Color Analysis */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>DETERMINISTIC COLOR PIPELINE</Text>

        {/* Reference Baseline */}
        <View style={styles.colorRow}>
          <Text style={styles.colorLabel}>Reagent Baseline</Text>
          <View style={styles.colorSwatchContainer}>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: `rgb(${ref.r}, ${ref.g}, ${ref.b})` },
              ]}
            />
            <Text style={styles.colorValues}>
              R {ref.r} · G {ref.g} · B {ref.b}
            </Text>
          </View>
        </View>

        {/* Normalized Reaction */}
        <View style={styles.colorRow}>
          <Text style={styles.colorLabel}>Normalized Sample</Text>
          <View style={styles.colorSwatchContainer}>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: `rgb(${obs.r}, ${obs.g}, ${obs.b})` },
              ]}
            />
            <Text style={styles.colorValues}>
              R {obs.r} · G {obs.g} · B {obs.b}
            </Text>
          </View>
        </View>

        {/* Delta E metric */}
        <View style={styles.deltaEContainer}>
          <View style={styles.deltaEHeader}>
            <Text style={styles.deltaELabel}>Color Difference (CIE ΔE)</Text>
            <Text style={[styles.deltaEValue, { color: resultColor }]}>{deltaE.toFixed(1)}</Text>
          </View>
          <View style={styles.deltaEBar}>
            <View
              style={[
                styles.deltaEFill,
                {
                  width: `${Math.min(100, Math.max(5, (deltaE / 30) * 100))}%`,
                  backgroundColor: resultColor,
                },
              ]}
            />
          </View>
          <View style={styles.deltaEScale}>
            <Text style={styles.deltaEScaleLabel}>Negative (≤5.0)</Text>
            <Text style={styles.deltaEScaleLabel}>Inconclusive</Text>
            <Text style={styles.deltaEScaleLabel}>Positive (≥15.0)</Text>
          </View>
        </View>
      </View>

      {/* Explanation */}
      <View style={styles.explanationCard}>
        <Ionicons name="information-circle" size={20} color={Colors.accent} />
        <Text style={styles.explanationText}>
          Classification is calculated via deterministic CIELAB color transformation normalized against the
          captured reference card white point. ΔE of {deltaE.toFixed(1)} {
            deltaE >= 15.0
              ? 'exceeds the presumptive positive threshold (≥15.0).'
              : deltaE <= 5.0
                ? 'is within baseline non-reaction range (≤5.0).'
                : 'falls within the ambiguous band (5.0–15.0) requiring laboratory confirmation.'
          }
        </Text>
      </View>

      {/* Prominent Legal Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="warning" size={16} color={Colors.warning} />
        <Text style={styles.disclaimerText}>{Config.disclaimer}</Text>
      </View>

      {/* Action to Seal */}
      <TouchableOpacity
        style={styles.sealButton}
        onPress={() => router.push('/test/sealed')}
        activeOpacity={0.85}
      >
        <Ionicons name="lock-closed" size={20} color={Colors.textInverse} />
        <Text style={styles.sealButtonText}>Seal & Sign Digital Record</Text>
      </TouchableOpacity>
    </ScrollView>
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
  },
  resultIconContainer: {
    marginBottom: Spacing.xs,
  },
  resultTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  confidenceText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  card: {
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
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colorLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  colorSwatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorValues: {
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
  },
  deltaEContainer: {
    marginTop: Spacing.md,
  },
  deltaEHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  deltaELabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  deltaEValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  deltaEBar: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  deltaEFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  deltaEScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  deltaEScaleLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  explanationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(23, 32, 51, 0.1)',
  },
  explanationText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  sealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  sealButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
});
