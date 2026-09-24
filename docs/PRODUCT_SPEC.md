# FieldTest — Digital Field Test Record System

## Problem

Today, two officers can look at the same colorimetric field test and document two different interpretations. Even when the interpretation is correct, there is typically no cryptographically verifiable record connecting the image, operator, location, and time.

Field test results are subjective observations documented manually. There is no standardized digital chain of custody, no reproducibility, and no tamper-evident audit trail.

## Users

- **Field Operators** (primary): Officers/technicians conducting colorimetric field tests in the field. They use the mobile app to capture, classify, and seal test records.
- **Supervisors/Reviewers**: Personnel who review completed test records and verify integrity.
- **Auditors/Judges**: Third parties who verify that a record has not been tampered with after creation.

## Core Workflow

```
Operator → Capture → Validate → Classify → Record → Verify
```

Step-by-step:

1. **Identify Operator** — Authenticated login, operator ID established
2. **Capture Test** — Camera-guided capture with reference card framing
3. **Validate Image** — Automated quality checks (lighting, focus, reference card detection, test region detection)
4. **Classify Result** — Color analysis against reference card, produce classification with confidence
5. **Seal Digital Record** — SHA-256 hash image, construct canonical record, Ed25519 sign
6. **Verify Record** — Independent verification of record integrity via signature check

## Result Categories

The system produces four possible outcomes:

| Result | Meaning |
|---|---|
| `PRESUMPTIVE_POSITIVE` | Color analysis indicates a positive reaction above the confidence threshold |
| `PRESUMPTIVE_NEGATIVE` | Color analysis indicates no significant reaction |
| `INCONCLUSIVE` | Classification confidence is below the decision threshold |
| `INVALID_CAPTURE` | Image quality is insufficient for reliable classification |

**INCONCLUSIVE is a first-class result, not an error.**

Classification confidence and capture quality are distinct concerns.

## Evidence Captured

Every completed test record contains:

| Evidence | Source |
|---|---|
| Captured image | Device camera |
| Image SHA-256 hash | Computed from raw image bytes |
| Timestamp | Device clock (ISO 8601 UTC) |
| GPS coordinates | Device GPS |
| GPS accuracy | Device GPS (metres) |
| Operator ID | Authenticated session |
| Classification result | Classifier output |
| Classification confidence | Classifier output (0–1) |
| Classifier version | Hardcoded in classifier module |
| Schema version | Record schema version string |

## Classification

### V1: Deterministic Color Analysis Pipeline

```
Image
  ↓
Find reference card
  ↓
Estimate lighting/color transformation
  ↓
Find test area
  ↓
Extract RGB/LAB values
  ↓
Normalize against reference
  ↓
Compare against known class boundaries
  ↓
Result + Confidence
```

The classifier is **one service inside a deterministic evidence pipeline**. The AI layer does not own the application.

### Classifier Output Schema

```typescript
type Classification = {
  result: "PRESUMPTIVE_POSITIVE" | "PRESUMPTIVE_NEGATIVE" | "INCONCLUSIVE" | "INVALID_CAPTURE"
  confidence: number // 0–1
  classifierVersion: string
  explanation: {
    lightingQuality: "GOOD" | "FAIR" | "POOR"
    referenceCardDetected: boolean
    testRegionDetected: boolean
    colorDifference: number // ΔE value
  }
}
```

### Decision Boundaries

- **Positive**: confidence >= 0.75 AND color difference above positive threshold
- **Negative**: confidence >= 0.75 AND color difference below negative threshold
- **Inconclusive**: confidence < 0.75 OR color difference in ambiguous range
- **Invalid Capture**: quality checks failed (missing reference card, poor focus, bad lighting)

## Digital Record

### Canonical Record Structure

```json
{
  "schemaVersion": "1.0",
  "recordId": "FT-2026-000184",
  "operatorId": "OP-042",
  "capturedAt": "2026-09-24T17:11:32Z",
  "location": {
    "latitude": 19.076,
    "longitude": 72.8777,
    "accuracyMeters": 8.4
  },
  "classification": {
    "result": "PRESUMPTIVE_POSITIVE",
    "confidence": 0.94,
    "classifierVersion": "color-v1.0"
  },
  "imageSha256": "8e4a..."
}
```

Records are constructed by deterministic canonicalization of the JSON (sorted keys, no whitespace). This ensures the same logical record always produces the same hash.

## Cryptographic Integrity

### Pipeline

```
Captured Image
      |
      v
 SHA-256(image)
      |
      +---------------+
      v               v
Classification    Metadata
      |               |
      +-------+-------+
              v
       Canonical Record
              |
              v
       SHA-256(record)
              |
              v
       Ed25519 Signature
              |
              v
      Tamper-Evident Record
```

### Key Management (Prototype)

- **Private signing key**: Server-side only (Supabase Edge Function)
- **Public verification key**: Distributed with the app / available at verification endpoint
- Keys are never stored in application source code or client-side storage

### Terminology

We use **"tamper-evident"**, not "tamper-proof."

A signature/hash can demonstrate that signed data has changed. It does not prove that:
- The camera image itself was genuine
- GPS was not manipulated
- The operator was who they claimed to be

## Verification

Any record can be independently verified:

1. Reconstruct canonical record JSON from stored fields
2. Compute SHA-256 of canonical record
3. Verify Ed25519 signature against public key
4. Compare stored recordHash with computed hash
5. Display VALID or INTEGRITY CHECK FAILED

### Tamper Detection Demo

The killer demo moment:

1. Create a valid signed record -> Signature VALID
2. Modify one field (e.g., change classification from NEGATIVE to POSITIVE)
3. Re-run verification -> INTEGRITY CHECK FAILED
4. Show expected hash vs. current hash

## Security Assumptions

| Threat | Prototype Mitigation |
|---|---|
| Image modified after capture | SHA-256 hash |
| Record fields modified | Ed25519 digital signature |
| Unauthorized record access | Supabase Auth + Row Level Security |
| Operator identity spoofing | Authenticated operator ID |
| Poor image quality | Capture validation + quality checks |
| Bad lighting conditions | Reference colour card normalization |
| Model uncertainty | Inconclusive threshold + confidence score |
| GPS uncertainty | Store accuracy radius |
| Classification model changed | Classifier version stored in record |
| Laboratory result overclaim | Explicit "presumptive" status + disclaimer |

## Limitations

This prototype:

- **Does not constitute laboratory confirmation.** All results are presumptive.
- **Does not establish laboratory-grade authenticity.** It establishes integrity of the captured digital record.
- **Does not replace confirmatory testing.** It documents field observations.
- **Does not guarantee GPS accuracy.** GPS coordinates are observations with uncertainty.
- **Does not guarantee operator identity beyond authentication.** Biometric verification is out of scope.
- **Does not prevent image capture manipulation.** It detects post-capture modification.

The prominent disclaimer throughout the app:

> **PRESUMPTIVE FIELD RESULT**
> This record does not constitute laboratory confirmation.

## Demo Scenario

1. Login as Officer OP-042
2. Tap "New Field Test"
3. Camera guides operator to position kit + reference card
4. App validates image quality (reference card, focus, lighting)
5. App produces PRESUMPTIVE POSITIVE at 94% confidence
6. App shows classification explanation (color difference, reference card normalization)
7. App captures timestamp + GPS + operator ID
8. SHA-256 hashes the image
9. Ed25519 signs the canonical record
10. Record appears in searchable history with VERIFIED badge
11. Open "Verify Record" -> Signature VALID
12. Modify one field in the record
13. Re-verify -> INTEGRITY CHECK FAILED (show expected vs. current hash)

**Demo mode scenarios:**
- Valid negative capture
- Positive capture
- Bad capture (blurry/glare) -> CAPTURE REJECTED
- Tampering detected -> INTEGRITY CHECK FAILED

## MVP (Must Ship)

- [ ] Operator authentication + identity
- [ ] Camera capture with guided framing
- [ ] Reference card detection overlay
- [ ] Image quality validation (focus, lighting, glare)
- [ ] GPS + accuracy capture
- [ ] Timestamp (ISO 8601 UTC)
- [ ] Deterministic color classifier
- [ ] INCONCLUSIVE as first-class result
- [ ] Image SHA-256 hashing
- [ ] Canonical record construction
- [ ] Ed25519 digital signature (server-side)
- [ ] Signature verification
- [ ] Tamper detection demo
- [ ] Searchable test record history
- [ ] Record detail / evidence view
- [ ] Chain-of-custody timeline per test
- [ ] Presumptive-result disclaimer (visible everywhere)
- [ ] Demo mode with controlled scenarios
- [ ] Error states (no GPS, poor lighting, blurry, missing card, network down)

## Out of Scope

- Blockchain / NFTs
- Custom hardware
- Facial recognition / voice recognition
- Complex admin systems / role hierarchies
- Large ML models / LLMs
- Chatbots
- Predictive analytics
- Social features
- Elaborate analytics dashboards
- Microservices / Kubernetes
- "AI agent" architecture
- Production deployment
