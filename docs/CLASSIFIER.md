# Classifier Specification

## Overview

The classifier is a deterministic color analysis pipeline that produces a presumptive classification of a colorimetric field test result. It is **one service inside a deterministic evidence pipeline** — the classifier does not own the application.

## Version

Current: `color-v1.0`

Every record stores the classifier version used. This enables reproducibility and audit.

## Inputs

| Input | Source | Required |
|---|---|---|
| Captured image | Device camera | Yes |
| Reference card region | Detected from image | Yes |
| Test region | Detected from image | Yes |

## Outputs

```typescript
type ClassificationResult =
  | "PRESUMPTIVE_POSITIVE"
  | "PRESUMPTIVE_NEGATIVE"
  | "INCONCLUSIVE"
  | "INVALID_CAPTURE"

type Classification = {
  result: ClassificationResult
  confidence: number          // 0.0 – 1.0
  classifierVersion: string   // e.g., "color-v1.0"
  explanation: {
    lightingQuality: "GOOD" | "FAIR" | "POOR"
    referenceCardDetected: boolean
    testRegionDetected: boolean
    colorDifference: number   // CIE Delta E value
    normalizedTestColor: {
      r: number
      g: number
      b: number
    }
    referenceColor: {
      r: number
      g: number
      b: number
    }
  }
}
```

## Pipeline

```
Image
  |
  v
1. Reference card detection
  |
  v
2. Lighting quality assessment
  |
  v
3. Test region detection
  |
  v
4. Color extraction (RGB)
  |
  v
5. Color normalization against reference card
  |
  v
6. Color space conversion (RGB -> LAB)
  |
  v
7. Delta E calculation
  |
  v
8. Decision boundary comparison
  |
  v
9. Result + Confidence
```

## Decision Logic

### Step 1: Validation Gates

Before classification, the following must pass:

| Check | Criteria | On Failure |
|---|---|---|
| Reference card detected | Card region identified in image | INVALID_CAPTURE |
| Test region detected | Test area identified in image | INVALID_CAPTURE |
| Focus quality | Laplacian variance above threshold | INVALID_CAPTURE |
| Lighting quality | Reference card colors within expected range | Warning if FAIR; INVALID_CAPTURE if POOR |

### Step 2: Color Normalization

1. Extract known reference colors from the detected card
2. Compare measured reference colors against expected values
3. Compute color correction transform
4. Apply transform to test region colors

This compensates for varying lighting conditions.

### Step 3: Classification

Using the CIE Delta E (CIEDE2000) color difference:

| Delta E Range | Classification | Confidence Basis |
|---|---|---|
| deltaE >= 15.0 | PRESUMPTIVE_POSITIVE | High (mapped from deltaE) |
| deltaE <= 5.0 | PRESUMPTIVE_NEGATIVE | High (mapped from inverse deltaE) |
| 5.0 < deltaE < 15.0 | INCONCLUSIVE | Low (proportional to distance from boundaries) |

### Step 4: Confidence Calculation

```
if deltaE >= 15.0:
  confidence = min(1.0, 0.75 + (deltaE - 15.0) / 40.0)
  result = PRESUMPTIVE_POSITIVE

elif deltaE <= 5.0:
  confidence = min(1.0, 0.75 + (5.0 - deltaE) / 20.0)
  result = PRESUMPTIVE_NEGATIVE

else:
  confidence = 0.5 - abs(deltaE - 10.0) / 20.0
  result = INCONCLUSIVE
```

Confidence is always in [0.0, 1.0].

## Display

The classifier result should always be shown with its explanation:

```
Presumptive Positive

Confidence: 94%

Reference card
[color swatch]

Observed reaction
[color swatch]

Color difference (Delta E)
[progress bar] 18.4

Image quality
[progress bar] GOOD

Classification is based on normalized color features
relative to the reference card.
```

## Demo Mode

In demo mode, the classifier uses pre-loaded fixture images with known classifications:

| Fixture | Expected Result | Expected Confidence |
|---|---|---|
| positive_01 | PRESUMPTIVE_POSITIVE | 0.94 |
| positive_02 | PRESUMPTIVE_POSITIVE | 0.87 |
| negative_01 | PRESUMPTIVE_NEGATIVE | 0.91 |
| negative_02 | PRESUMPTIVE_NEGATIVE | 0.96 |
| inconclusive_01 | INCONCLUSIVE | 0.51 |
| blurry_01 | INVALID_CAPTURE | N/A |
| glare_01 | INVALID_CAPTURE | N/A |
| missing_card_01 | INVALID_CAPTURE | N/A |

## Versioning

When the classifier logic changes:
1. Increment the version string (e.g., `color-v1.0` -> `color-v1.1`)
2. All new records store the new version
3. Old records retain their original classifier version
4. This enables reproducibility auditing

## Limitations

- The classifier operates on a 2D photograph, not the physical test kit
- Lighting normalization depends on reference card quality and visibility
- The pipeline is designed for controlled colorimetric tests, not arbitrary substances
- All results are presumptive — laboratory confirmation is always required
- The decision boundaries are calibrated for the prototype and may need adjustment for different test kit manufacturers
