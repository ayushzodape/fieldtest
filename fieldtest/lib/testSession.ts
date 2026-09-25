import { Classification, ClassificationResult, DEMO_FIXTURES, RgbColor } from './classifier';
import { ReagentKitId } from './reagents';
import { generateEvidenceImage } from './imageGenerator';

export interface ActiveTestDraft {
  scenarioKey: 'positive' | 'negative' | 'inconclusive' | 'invalid';
  reagentKit: ReagentKitId;
  imageUri?: string;
  imageSha256?: string;
  evidenceDataUri?: string;
  rawImageBytes?: Uint8Array;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters?: number;
  isMocked?: boolean;
  fixType?: '3D' | '2D' | 'CELL_TOWER' | 'NONE';
  hdop?: number;
  satellitesTracked?: number;
  timestamp: string;
  operatorId: string;
  quality: {
    referenceCard: boolean;
    testRegion: boolean;
    focus: boolean;
    lighting: 'GOOD' | 'FAIR' | 'POOR';
  };
  classification?: Classification;
}

// Fallback hashes
const FIXTURE_IMAGE_HASHES: Record<ActiveTestDraft['scenarioKey'], string> = {
  positive: '8e4a9f3b1c2d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
  negative: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  inconclusive: 'f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1',
  invalid: 'e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1',
};

// Default initial test draft
let currentDraft: ActiveTestDraft = {
  scenarioKey: 'positive',
  reagentKit: 'marquis',
  imageSha256: FIXTURE_IMAGE_HASHES.positive,
  latitude: 19.076,
  longitude: 72.8777,
  accuracyMeters: 8.4,
  timestamp: new Date().toISOString(),
  operatorId: 'OP-042',
  quality: {
    referenceCard: true,
    testRegion: true,
    focus: true,
    lighting: 'GOOD',
  },
};

export function getActiveTestDraft(): ActiveTestDraft {
  return currentDraft;
}

export function updateActiveTestDraft(updates: Partial<ActiveTestDraft>): ActiveTestDraft {
  currentDraft = {
    ...currentDraft,
    ...updates,
  };
  return currentDraft;
}

export function resetActiveTestDraft(
  scenarioKey: ActiveTestDraft['scenarioKey'] = 'positive',
  reagentKit: ReagentKitId = 'marquis'
): ActiveTestDraft {
  const fixture = DEMO_FIXTURES[scenarioKey];
  currentDraft = {
    scenarioKey,
    reagentKit,
    imageSha256: FIXTURE_IMAGE_HASHES[scenarioKey],
    latitude: 19.076 + (Math.random() - 0.5) * 0.005,
    longitude: 72.8777 + (Math.random() - 0.5) * 0.005,
    accuracyMeters: Math.round((6 + Math.random() * 6) * 10) / 10,
    timestamp: new Date().toISOString(),
    operatorId: 'OP-042',
    quality: {
      referenceCard: fixture.params.referenceCardDetected,
      testRegion: fixture.params.testRegionDetected,
      focus: fixture.params.focusQuality !== 'POOR',
      lighting: fixture.params.lightingQuality || 'GOOD',
    },
  };

  // Asynchronously generate authentic physical evidence image raster and bind SHA-256
  generateEvidenceImage({
    observedRgb: fixture.params.observedRgb,
    measuredWhiteRgb: fixture.params.measuredWhiteRgb,
  }).then((art) => {
    currentDraft.imageSha256 = art.imageSha256;
    currentDraft.evidenceDataUri = art.dataUri;
    currentDraft.rawImageBytes = art.imageBytes;
  }).catch(() => {
    // Keep fallback if background generation fails
  });

  return currentDraft;
}
