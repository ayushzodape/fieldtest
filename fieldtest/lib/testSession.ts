import { Classification, ClassificationResult, DEMO_FIXTURES } from './classifier';

export interface ActiveTestDraft {
  scenarioKey: 'positive' | 'negative' | 'inconclusive' | 'invalid';
  imageUri?: string;
  imageSha256?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
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

// Default initial test draft
let currentDraft: ActiveTestDraft = {
  scenarioKey: 'positive',
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

export function resetActiveTestDraft(scenarioKey: ActiveTestDraft['scenarioKey'] = 'positive'): ActiveTestDraft {
  const fixture = DEMO_FIXTURES[scenarioKey];
  currentDraft = {
    scenarioKey,
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
  return currentDraft;
}
