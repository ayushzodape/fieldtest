import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../../constants/colors';

/**
 * Capture screen — guided camera experience for capturing field tests.
 *
 * Shows a camera view with framing overlay, reference card detection,
 * and a capture checklist. Capture button only enables when all
 * validation checks pass.
 *
 * NOTE: This is the UI shell. Camera integration comes in Phase 5.
 * For now, it simulates the capture flow for demo purposes.
 */
export default function CaptureScreen() {
  const router = useRouter();
  const [checks, setChecks] = useState({
    referenceCard: false,
    testRegion: false,
    focus: false,
    lighting: 'checking' as 'checking' | 'GOOD' | 'FAIR' | 'POOR',
  });

  // Simulate detection after mounting
  useState(() => {
    const timer = setTimeout(() => {
      setChecks({
        referenceCard: true,
        testRegion: true,
        focus: true,
        lighting: 'GOOD',
      });
    }, 1500);
    return () => clearTimeout(timer);
  });

  const allChecksPassed =
    checks.referenceCard &&
    checks.testRegion &&
    checks.focus &&
    checks.lighting === 'GOOD' || checks.lighting === 'FAIR';

  const handleCapture = () => {
    router.push('/test/review');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={Colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Field Test</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera view placeholder */}
      <View style={styles.cameraView}>
        <Text style={styles.cameraPlaceholder}>CAMERA VIEW</Text>

        {/* Framing overlay */}
        <View style={styles.framingOverlay}>
          <View style={styles.testRegionFrame}>
            <Text style={styles.frameLabel}>TEST SAMPLE</Text>
          </View>
          <View style={styles.referenceCardFrame}>
            <Text style={styles.frameLabel}>REFERENCE CARD</Text>
          </View>
        </View>

        {/* Guide text */}
        <View style={styles.guideContainer}>
          <Text style={styles.guideText}>POSITION TEST WITHIN FRAME</Text>
        </View>
      </View>

      {/* Capture checklist */}
      <View style={styles.checklistContainer}>
        <CheckItem
          label="Reference card detected"
          checked={checks.referenceCard}
          loading={!checks.referenceCard}
        />
        <CheckItem
          label="Test region detected"
          checked={checks.testRegion}
          loading={!checks.testRegion}
        />
        <CheckItem
          label="Image focus"
          checked={checks.focus}
          loading={!checks.focus}
        />
        <CheckItem
          label={`Lighting quality`}
          checked={checks.lighting === 'GOOD' || checks.lighting === 'FAIR'}
          loading={checks.lighting === 'checking'}
          trailing={checks.lighting !== 'checking' ? checks.lighting : undefined}
          trailingColor={
            checks.lighting === 'GOOD'
              ? Colors.success
              : checks.lighting === 'FAIR'
                ? Colors.warning
                : undefined
          }
        />

        {/* Capture button */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            !allChecksPassed && styles.captureButtonDisabled,
          ]}
          onPress={handleCapture}
          activeOpacity={0.8}
          disabled={!allChecksPassed}
        >
          <View style={styles.captureButtonInner}>
            <Ionicons
              name="camera"
              size={28}
              color={allChecksPassed ? Colors.textInverse : Colors.textTertiary}
            />
          </View>
          <Text
            style={[
              styles.captureButtonText,
              !allChecksPassed && styles.captureButtonTextDisabled,
            ]}
          >
            CAPTURE
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CheckItem({
  label,
  checked,
  loading,
  trailing,
  trailingColor,
}: {
  label: string;
  checked: boolean;
  loading?: boolean;
  trailing?: string;
  trailingColor?: string;
}) {
  return (
    <View style={styles.checkItem}>
      {loading ? (
        <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textTertiary} />
      ) : checked ? (
        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
      ) : (
        <Ionicons name="close-circle" size={18} color={Colors.danger} />
      )}
      <Text
        style={[
          styles.checkItemLabel,
          checked && styles.checkItemLabelChecked,
        ]}
      >
        {label}
      </Text>
      {trailing && (
        <Text style={[styles.checkItemTrailing, { color: trailingColor }]}>
          {trailing}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['5xl'],
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
  headerSpacer: {
    width: 40,
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraPlaceholder: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: FontWeight.medium,
    letterSpacing: 2,
    position: 'absolute',
  },
  framingOverlay: {
    width: '80%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  testRegionFrame: {
    width: '90%',
    height: '55%',
    borderWidth: 2,
    borderColor: 'rgba(36, 87, 214, 0.7)',
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referenceCardFrame: {
    width: '90%',
    height: '25%',
    borderWidth: 2,
    borderColor: 'rgba(22, 131, 91, 0.7)',
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FontWeight.medium,
    letterSpacing: 1,
  },
  guideContainer: {
    position: 'absolute',
    top: Spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  guideText: {
    fontSize: FontSize.sm,
    color: Colors.textInverse,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  },
  checklistContainer: {
    backgroundColor: '#111',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  checkItemLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.6)',
  },
  checkItemLabelChecked: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkItemTrailing: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  captureButton: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(36, 87, 214, 0.3)',
  },
  captureButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
    letterSpacing: 1,
  },
  captureButtonTextDisabled: {
    color: Colors.textTertiary,
  },
});
