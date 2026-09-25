import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/colors';
import { resetActiveTestDraft, updateActiveTestDraft, ActiveTestDraft } from '../../lib/testSession';
import { DEMO_FIXTURES } from '../../lib/classifier';

export default function CaptureScreen() {
  const router = useRouter();
  const [scenario, setScenario] = useState<ActiveTestDraft['scenarioKey']>('positive');
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'fallback'>('acquiring');
  const [coords, setCoords] = useState({ latitude: 19.076, longitude: 72.8777, accuracyMeters: 8.4 });

  // Load GPS coordinates
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const isMock = (loc as { mocked?: boolean }).mocked === true;
          if (isMock) {
            console.warn('[FieldTest GPS] Anti-spoofing alert: Mock location provider detected!');
          }
          setCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracyMeters: loc.coords.accuracy ? Math.round(loc.coords.accuracy * 10) / 10 : 25.0,
          });
          setGpsStatus('locked');
        } else {
          setGpsStatus('fallback');
          setCoords({
            latitude: 19.076,
            longitude: 72.8777,
            accuracyMeters: 500.0,
          });
        }
      } catch (err) {
        setGpsStatus('fallback');
        setCoords({
          latitude: 19.076,
          longitude: 72.8777,
          accuracyMeters: 500.0,
        });
      }
    })();
  }, []);

  // Update session draft when scenario or GPS changes
  useEffect(() => {
    const draft = resetActiveTestDraft(scenario);
    updateActiveTestDraft({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: coords.accuracyMeters,
    });
  }, [scenario, coords]);

  const fixture = DEMO_FIXTURES[scenario];
  const checks = {
    referenceCard: fixture.params.referenceCardDetected,
    testRegion: fixture.params.testRegionDetected,
    focus: fixture.params.focusQuality !== 'POOR',
    lighting: fixture.params.lightingQuality || 'GOOD',
  };

  const allChecksPassed =
    checks.referenceCard &&
    checks.testRegion &&
    checks.focus &&
    (checks.lighting === 'GOOD' || checks.lighting === 'FAIR');

  const handleCapture = () => {
    updateActiveTestDraft({
      timestamp: new Date().toISOString(),
      quality: checks,
    });
    router.push('/test/review');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={Colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Field Test</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scenario Selector for Demo Resilience */}
      <View style={styles.scenarioBar}>
        <Text style={styles.scenarioBarLabel}>DEMO SCENARIO:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenarioList}>
          <TouchableOpacity
            style={[styles.scenarioChip, scenario === 'positive' && styles.scenarioChipActive]}
            onPress={() => setScenario('positive')}
          >
            <Text style={[styles.scenarioChipText, scenario === 'positive' && styles.scenarioChipTextActive]}>
              Positive Control
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scenarioChip, scenario === 'negative' && styles.scenarioChipActive]}
            onPress={() => setScenario('negative')}
          >
            <Text style={[styles.scenarioChipText, scenario === 'negative' && styles.scenarioChipTextActive]}>
              Negative Baseline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scenarioChip, scenario === 'inconclusive' && styles.scenarioChipActive]}
            onPress={() => setScenario('inconclusive')}
          >
            <Text style={[styles.scenarioChipText, scenario === 'inconclusive' && styles.scenarioChipTextActive]}>
              Inconclusive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scenarioChip, scenario === 'invalid' && styles.scenarioChipActive]}
            onPress={() => setScenario('invalid')}
          >
            <Text style={[styles.scenarioChipText, scenario === 'invalid' && styles.scenarioChipTextActive]}>
              Invalid Capture
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Camera Viewfinder */}
      <View style={styles.cameraView}>
        {/* Sample Swatch Preview */}
        <View
          style={[
            styles.samplePreviewBubble,
            {
              backgroundColor: `rgb(${fixture.params.observedRgb.r}, ${fixture.params.observedRgb.g}, ${fixture.params.observedRgb.b})`,
            },
          ]}
        >
          <Text style={styles.samplePreviewText}>TEST REAGENT</Text>
        </View>

        {/* Framing Overlay */}
        <View style={styles.framingOverlay}>
          <View style={[styles.testRegionFrame, !checks.testRegion && styles.frameError]}>
            <Text style={styles.frameLabel}>TEST VIAL REGION</Text>
          </View>
          <View style={[styles.referenceCardFrame, !checks.referenceCard && styles.frameError]}>
            <Text style={styles.frameLabel}>REFERENCE CARD</Text>
          </View>
        </View>

        {/* GPS Indicator Badge */}
        <View style={styles.gpsBadge}>
          <Ionicons
            name={gpsStatus === 'locked' ? 'location' : 'location-outline'}
            size={12}
            color={gpsStatus === 'locked' ? Colors.success : Colors.warning}
          />
          <Text style={styles.gpsBadgeText}>
            GPS: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)} (±{coords.accuracyMeters}m)
          </Text>
        </View>

        {/* Guide text */}
        <View style={styles.guideContainer}>
          <Text style={styles.guideText}>
            {allChecksPassed ? 'READY FOR CAPTURE' : 'ALIGN REFERENCE CARD & VIAL'}
          </Text>
        </View>
      </View>

      {/* Capture checklist */}
      <View style={styles.checklistContainer}>
        <CheckItem
          label="Reference card detected"
          checked={checks.referenceCard}
          loading={false}
        />
        <CheckItem
          label="Test region detected"
          checked={checks.testRegion}
          loading={false}
        />
        <CheckItem
          label="Focus sharpness"
          checked={checks.focus}
          loading={false}
        />
        <CheckItem
          label="Lighting quality"
          checked={checks.lighting === 'GOOD' || checks.lighting === 'FAIR'}
          loading={false}
          trailing={checks.lighting}
          trailingColor={
            checks.lighting === 'GOOD'
              ? Colors.success
              : checks.lighting === 'FAIR'
                ? Colors.warning
                : Colors.danger
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
            <Ionicons name="camera" size={24} color={Colors.textInverse} />
            <Text style={styles.captureButtonText}>
              {allChecksPassed ? 'Capture & Analyze' : 'Capture Blocked (Fix Quality)'}
            </Text>
          </View>
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
  loading: boolean;
  trailing?: string;
  trailingColor?: string;
}) {
  return (
    <View style={styles.checkItem}>
      <View style={[styles.checkIcon, checked && styles.checkIconPassed]}>
        <Ionicons
          name={checked ? 'checkmark' : 'close'}
          size={14}
          color={checked ? Colors.textInverse : Colors.danger}
        />
      </View>
      <Text style={[styles.checkLabel, checked && styles.checkLabelPassed]}>
        {label}
      </Text>
      {trailing && (
        <Text style={[styles.checkTrailing, trailingColor ? { color: trailingColor } : {}]}>
          {trailing}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  headerSpacer: {
    width: 40,
  },

  // Scenario Bar
  scenarioBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scenarioBarLabel: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.sm,
  },
  scenarioList: {
    gap: Spacing.xs,
  },
  scenarioChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scenarioChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  scenarioChipText: {
    color: Colors.textInverse,
    fontSize: FontSize.xs,
  },
  scenarioChipTextActive: {
    fontWeight: FontWeight.bold,
  },

  // Camera Viewfinder
  cameraView: {
    flex: 1,
    backgroundColor: '#0A0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  samplePreviewBubble: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.md,
  },
  samplePreviewText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  framingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  testRegionFrame: {
    width: 140,
    height: 140,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
  },
  referenceCardFrame: {
    width: 180,
    height: 70,
    borderWidth: 2,
    borderColor: Colors.success,
    borderRadius: BorderRadius.sm,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  frameError: {
    borderColor: Colors.danger,
  },
  frameLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  gpsBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  gpsBadgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  guideContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  guideText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
    letterSpacing: 1,
  },

  // Checklist
  checklistContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: Spacing.sm,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconPassed: {
    backgroundColor: Colors.success,
  },
  checkLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  checkLabelPassed: {
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  checkTrailing: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },

  // Capture Button
  captureButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    alignItems: 'center',
    ...Shadow.md,
  },
  captureButtonDisabled: {
    backgroundColor: Colors.borderDark,
    opacity: 0.6,
  },
  captureButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  captureButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
});
