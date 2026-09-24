import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { Config } from '../../constants/config';
import { getFieldTests, FieldTestRow } from '../../lib/records';

export default function HomeScreen() {
  const router = useRouter();
  const [recentTests, setRecentTests] = useState<FieldTestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const records = await getFieldTests();
      setRecentTests(records.slice(0, 4));
      setLoading(false);
    })();
  }, []);

  const totalCount = recentTests.length;
  const positiveCount = recentTests.filter((r) => r.result === 'PRESUMPTIVE_POSITIVE').length;
  const inconclusiveCount = recentTests.filter((r) => r.result === 'INCONCLUSIVE').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting Header */}
      <View style={styles.greeting}>
        <View>
          <Text style={styles.greetingLabel}>FIELD OPERATIONS · AUDIT TRAIL</Text>
          <Text style={styles.greetingName}>Officer OP-042</Text>
        </View>
        <View style={styles.agencyBadge}>
          <Text style={styles.agencyBadgeText}>FORENSIC UNIT</Text>
        </View>
      </View>

      {/* Primary CTA: New Field Test */}
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
            Capture, classify, and seal a digital evidence record
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textInverse} />
      </TouchableOpacity>

      {/* Evidence Stats Bar */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Sealed Records</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.danger }]}>{positiveCount}</Text>
          <Text style={styles.statLabel}>Presumptive Pos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{inconclusiveCount}</Text>
          <Text style={styles.statLabel}>Inconclusive</Text>
        </View>
      </View>

      {/* Workflow steps */}
      <View style={styles.workflowCard}>
        <Text style={styles.sectionTitle}>EVIDENCE PIPELINE</Text>
        <WorkflowStep number={1} label="Identify operator" icon="person" />
        <WorkflowStep number={2} label="Guided capture + card framing" icon="camera" />
        <WorkflowStep number={3} label="Quality checks (Focus/Lighting)" icon="checkmark-circle" />
        <WorkflowStep number={4} label="Deterministic CIELAB ΔE classification" icon="analytics" />
        <WorkflowStep number={5} label="SHA-256 + Ed25519 cryptographic seal" icon="lock-closed" />
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push(`/verify/${recentTests[0]?.record_id || 'FT-2026-000184'}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark" size={22} color={Colors.accent} />
          <Text style={styles.quickActionLabel}>Verify Integrity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/(tabs)/tests')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text" size={22} color={Colors.accent} />
          <Text style={styles.quickActionLabel}>Evidence Registry</Text>
        </TouchableOpacity>
      </View>

      {/* Recent tests */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>RECENT AUDIT RECORDS</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tests')}>
            <Text style={styles.viewAllText}>View all →</Text>
          </TouchableOpacity>
        </View>

        {recentTests.map((item) => {
          const dateObj = new Date(item.captured_at);
          const time = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '22:41';

          return (
            <RecentTestItem
              key={item.record_id}
              recordId={item.record_id}
              result={item.result}
              time={time}
              verified={item.is_verified}
              onPress={() => router.push(`/verify/${item.record_id}`)}
            />
          );
        })}
      </View>

      {/* Mandatory Disclaimer */}
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
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} style={styles.stepIcon} />
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

function RecentTestItem({
  recordId,
  result,
  time,
  verified,
  onPress,
}: {
  recordId: string;
  result: string;
  time: string;
  verified: boolean;
  onPress: () => void;
}) {
  const resultColor =
    result === 'PRESUMPTIVE_POSITIVE'
      ? Colors.danger
      : result === 'PRESUMPTIVE_NEGATIVE'
        ? Colors.success
        : Colors.warning;

  const resultLabel = result
    .replace('PRESUMPTIVE_', '')
    .replace('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <TouchableOpacity style={styles.recentItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.recentLeft}>
        <View style={[styles.resultIndicator, { backgroundColor: resultColor }]} />
        <View>
          <Text style={styles.recentRecordId}>{recordId}</Text>
          <Text style={styles.recentTime}>{time} · OP-042</Text>
        </View>
      </View>
      <View style={styles.recentRight}>
        <Text style={[styles.recentResult, { color: resultColor }]}>
          {resultLabel}
        </Text>
        {verified && (
          <View style={styles.verifiedTag}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
            <Text style={styles.verifiedTagText}>SEALED</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  greetingLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
  },
  greetingName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  agencyBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  agencyBadgeText: {
    color: Colors.textInverse,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  newTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  newTestIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: FontWeight.medium,
  },
  workflowCard: {
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
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  stepNumberText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  stepIcon: {
    marginRight: Spacing.sm,
  },
  stepLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  quickActionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  recentSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewAllText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentRecordId: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  recentTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  recentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recentResult: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginRight: 4,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    gap: 2,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
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
});
