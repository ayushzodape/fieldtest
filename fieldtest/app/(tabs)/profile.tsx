import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../../constants/colors';

/**
 * Operator profile screen — shows identity and app info.
 */
export default function ProfileScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Operator identity card */}
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={Colors.textInverse} />
        </View>
        <Text style={styles.operatorName}>Officer OP-042</Text>
        <Text style={styles.operatorRole}>Field Operator</Text>
        <View style={styles.identityMeta}>
          <View style={styles.identityMetaItem}>
            <Text style={styles.identityMetaLabel}>Operator Code</Text>
            <Text style={styles.identityMetaValue}>OP-042</Text>
          </View>
          <View style={styles.identityDivider} />
          <View style={styles.identityMetaItem}>
            <Text style={styles.identityMetaLabel}>Tests Today</Text>
            <Text style={styles.identityMetaValue}>5</Text>
          </View>
        </View>
      </View>

      {/* Settings items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <SettingsItem icon="shield-checkmark" label="Verification" />
        <SettingsItem icon="key" label="Signing Key" />
        <SettingsItem icon="information-circle" label="About FieldTest" />
        <SettingsItem icon="document" label="Licenses" />
      </View>

      {/* Demo mode toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development</Text>
        <SettingsItem icon="flask" label="Demo Mode" trailing="ON" />
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App version */}
      <Text style={styles.versionText}>FieldTest v1.0.0 · Schema v1.0</Text>
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
    <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={Colors.textSecondary} />
      <Text style={styles.settingsItemLabel}>{label}</Text>
      <View style={styles.settingsItemRight}>
        {trailing && <Text style={styles.settingsItemTrailing}>{trailing}</Text>}
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
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
  identityCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  operatorName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  operatorRole: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  identityMeta: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  identityMetaItem: {
    alignItems: 'center',
  },
  identityMetaLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  identityMetaValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
    fontFamily: 'monospace',
  },
  identityDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  settingsItemLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsItemTrailing: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.lg,
  },
});
