import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { Config } from '../../constants/config';

/**
 * Home screen — the operator's primary view.
 *
 * Shows:
 * - Operator greeting
 * - New Field Test button (primary action)
 * - Recent tests summary
 * - Prominent disclaimer
 */
export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingLabel}>Good evening,</Text>
        <Text style={styles.greetingName}>Officer OP-042</Text>
      </View>

      {/* Primary action */}
      <TouchableOpacity
        style={styles.newTestButton}
        onPress={() => router.push('/test/capture')}
        activeOpacity={0.85}
      >
        <View style={styles.newTestIcon}>
          <Ionicons name="add" size={28} color={Colors.textInverse} />
        </View>
        <View style={styles.newTestContent}>
          <Text style={styles.newTestTitle}>New Field Test</Text>
          <Text style={styles.newTestDescription}>
            Capture, classify, and seal a digital record
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textInverse} />
      </TouchableOpacity>

      {/* Workflow steps */}
      <View style={styles.workflowCard}>
        <Text style={styles.sectionTitle}>Workflow</Text>
        <WorkflowStep number={1} label="Identify operator" icon="person" />
        <WorkflowStep number={2} label="Capture test" icon="camera" />
        <WorkflowStep number={3} label="Verify image" icon="checkmark-circle" />
        <WorkflowStep number={4} label="Classify result" icon="analytics" />
        <WorkflowStep number={5} label="Seal digital record" icon="lock-closed" />
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/verify/demo')}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark" size={24} color={Colors.accent} />
          <Text style={styles.quickActionLabel}>Verify Record</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/(tabs)/tests')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text" size={24} color={Colors.accent} />
          <Text style={styles.quickActionLabel}>View Records</Text>
        </TouchableOpacity>
      </View>

      {/* Recent tests */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Tests</Text>

        <RecentTestItem
          recordId="FT-2026-000184"
          result="PRESUMPTIVE_POSITIVE"
          time="22:41"
          verified
        />
        <RecentTestItem
          recordId="FT-2026-000183"
          result="PRESUMPTIVE_NEGATIVE"
          time="22:18"
          verified
        />
        <RecentTestItem
          recordId="FT-2026-000182"
          result="INCONCLUSIVE"
          time="21:55"
          verified
        />
      </View>

      {/* Disclaimer — always visible */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color={Colors.warning} />
        <Text style={styles.disclaimerText}>{Config.disclaimer}</Text>
      </View>
    </ScrollView>
  );
}

function WorkflowStep({
  number,
  label,
  icon,
}: {
  number: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.workflowStep}>
      <View style={styles.workflowStepNumber}>
        <Text style={styles.workflowStepNumberText}>{number}</Text>
      </View>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} />
      <Text style={styles.workflowStepLabel}>{label}</Text>
    </View>
  );
}

function RecentTestItem({
  recordId,
  result,
  time,
  verified,
}: {
  recordId: string;
  result: string;
  time: string;
  verified: boolean;
}) {
  const resultColor =
    result === 'PRESUMPTIVE_POSITIVE'
      ? Colors.danger
      : result === 'PRESUMPTIVE_NEGATIVE'
        ? Colors.success
        : Colors.warning;

  const resultLabel = result
    .replace('PRESUMPTIVE_', 'Presumptive ')
    .replace('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <TouchableOpacity style={styles.recentItem} activeOpacity={0.7}>
      <View style={styles.recentItemLeft}>
        <Text style={styles.recentItemId}>{recordId}</Text>
        <View style={styles.recentItemResultRow}>
          <View style={[styles.resultDot, { backgroundColor: resultColor }]} />
          <Text style={[styles.recentItemResult, { color: resultColor }]}>
            {resultLabel}
          </Text>
        </View>
      </View>
      <View style={styles.recentItemRight}>
        <Text style={styles.recentItemTime}>{time}</Text>
        {verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={10} color={Colors.success} />
            <Text style={styles.verifiedText}>VERIFIED</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  greeting: {
    marginBottom: Spacing['2xl'],
  },
  greetingLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.regular,
  },
  greetingName: {
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
  },
  newTestButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    ...Shadow.md,
  },
  newTestIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  newTestContent: {
    flex: 1,
  },
  newTestTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  newTestDescription: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  workflowCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  workflowStepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  workflowStepNumberText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  workflowStepLabel: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  recentSection: {
    marginBottom: Spacing['2xl'],
  },
  recentItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentItemLeft: {
    flex: 1,
  },
  recentItemId: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  recentItemResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  recentItemResult: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  recentItemRight: {
    alignItems: 'flex-end',
  },
  recentItemTime: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  verifiedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
    letterSpacing: 0.5,
  },
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
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
    lineHeight: 16,
  },
});
