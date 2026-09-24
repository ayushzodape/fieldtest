import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../../constants/colors';
import { Config } from '../../constants/config';
import { getFieldTests, FieldTestRow } from '../../lib/records';

type FilterType = 'all' | 'positive' | 'negative' | 'inconclusive';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Results' },
  { key: 'positive', label: 'Positive' },
  { key: 'negative', label: 'Negative' },
  { key: 'inconclusive', label: 'Inconclusive' },
];

export default function TestsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<FieldTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    const data = await getFieldTests();
    setRecords(data);
    setLoading(false);
  };

  const filteredRecords = records.filter((record) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !record.record_id.toLowerCase().includes(query) &&
        !record.operator_id.toLowerCase().includes(query) &&
        !record.result.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Result type filter
    if (activeFilter === 'positive') return record.result === 'PRESUMPTIVE_POSITIVE';
    if (activeFilter === 'negative') return record.result === 'PRESUMPTIVE_NEGATIVE';
    if (activeFilter === 'inconclusive') return record.result === 'INCONCLUSIVE';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              activeFilter === filter.key && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Records list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRecords.map((record) => (
          <RecordCard
            key={record.record_id}
            record={record}
            onPress={() => router.push(`/verify/${record.record_id}`)}
          />
        ))}

        {filteredRecords.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyStateText}>
              {loading ? 'Loading field test records...' : 'No records found'}
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color={Colors.warning} />
          <Text style={styles.disclaimerText}>{Config.disclaimer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function RecordCard({
  record,
  onPress,
}: {
  record: FieldTestRow;
  onPress: () => void;
}) {
  const resultColor =
    record.result === 'PRESUMPTIVE_POSITIVE'
      ? Colors.danger
      : record.result === 'PRESUMPTIVE_NEGATIVE'
        ? Colors.success
        : Colors.warning;

  const resultBgColor =
    record.result === 'PRESUMPTIVE_POSITIVE'
      ? Colors.dangerLight
      : record.result === 'PRESUMPTIVE_NEGATIVE'
        ? Colors.successLight
        : Colors.warningLight;

  const resultLabel = record.result
    .replace('PRESUMPTIVE_', 'Presumptive ')
    .replace('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  const dateObj = new Date(record.captured_at);
  const dateFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Unknown Date';
  const timeFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const locationText = record.latitude && record.longitude
    ? `${record.latitude.toFixed(3)}, ${record.longitude.toFixed(3)} (±${record.accuracy_meters || 8}m)`
    : 'GPS Logged';

  return (
    <TouchableOpacity style={styles.recordCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordId}>{record.record_id}</Text>
        <View style={[styles.resultBadge, { backgroundColor: resultBgColor }]}>
          <View style={[styles.resultDot, { backgroundColor: resultColor }]} />
          <Text style={[styles.resultBadgeText, { color: resultColor }]}>
            {resultLabel}
          </Text>
        </View>
      </View>

      <View style={styles.recordMeta}>
        <View style={styles.recordMetaItem}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.recordMetaText}>
            {dateFormatted} {timeFormatted ? `· ${timeFormatted}` : ''}
          </Text>
        </View>
        <View style={styles.recordMetaItem}>
          <Ionicons name="person-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.recordMetaText}>{record.operator_id}</Text>
        </View>
        <View style={styles.recordMetaItem}>
          <Ionicons name="location-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.recordMetaText}>{locationText}</Text>
        </View>
      </View>

      <View style={styles.recordFooter}>
        <View style={styles.signatureStatus}>
          <Ionicons
            name={record.is_verified ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={record.is_verified ? Colors.success : Colors.danger}
          />
          <Text
            style={[
              styles.signatureText,
              { color: record.is_verified ? Colors.success : Colors.danger },
            ]}
          >
            Signature {record.is_verified ? 'VALID' : 'INVALID'}
          </Text>
        </View>
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  filterContainer: {
    backgroundColor: Colors.surface,
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.accent,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recordId: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  resultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  recordMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  recordMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordMetaText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  signatureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signatureText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.md,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
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
