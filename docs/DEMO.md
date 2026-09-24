# Demo Script

## Overview

This is the scripted demonstration for judges. The demo runs in **Demo Mode** using controlled fixture images to ensure deterministic, reproducible outcomes.

Total demo time: ~5 minutes

---

## Pre-Demo Setup

1. App is installed on a physical Android phone
2. Demo mode is enabled
3. Seeded operator account: Officer OP-042
4. Pre-loaded fixture images for all scenarios
5. Phone has stable network connection

---

## Scenario 1: Valid Positive Test (90 seconds)

### Pitch (30 seconds)

> "Today, two officers can look at the same colorimetric field test and document two different interpretations. Even when the interpretation is correct, there's no cryptographically verifiable record connecting the image, operator, location, and time."
>
> "Our prototype creates that missing digital evidence layer."

### Demo

1. **Login** as Officer OP-042
   - Show: "Good evening, Officer OP-042"

2. **Tap "New Field Test"**
   - Show the step indicator: Capture → Validate → Classify → Seal

3. **Camera screen opens**
   - Show guided framing overlay
   - Show checklist updating:
     - ✓ Reference card detected
     - ✓ Test region detected
     - ✓ Lighting quality: GOOD
   - Tap **Capture**

4. **Review screen**
   - Show captured image with quality indicators
   - All checks passed

5. **Classification result**
   - Show: **PRESUMPTIVE POSITIVE**
   - Confidence: 94%
   - Color difference visualization
   - Reference card vs. observed reaction color swatches
   - Explanation text

6. **Sealed record**
   - Record ID: FT-2026-000184
   - Show chain-of-custody timeline:
     - 17:41:02 — Test initiated (Operator OP-042)
     - 17:41:11 — Image captured (SHA-256: 8e4a...91bf)
     - 17:41:12 — Reference card validated (Lighting: GOOD)
     - 17:41:13 — Classification completed (PRESUMPTIVE POSITIVE, 94%)
     - 17:41:14 — Record sealed (Signature: VALID)
   - Show: **RECORD INTEGRITY: ✓ VERIFIED**
   - Show disclaimer: "Presumptive field result. Laboratory confirmation required."

---

## Scenario 2: Negative Test (30 seconds)

1. Start new test
2. Use negative fixture
3. Show: **PRESUMPTIVE NEGATIVE** at 91% confidence
4. Show different color analysis (low Delta E)
5. Record sealed with valid signature

---

## Scenario 3: Bad Capture (30 seconds)

1. Start new test
2. Use blurry/glare fixture
3. Camera screen shows:
   - ✗ Image quality insufficient
   - ⚠ Excessive glare detected
4. App displays: **CAPTURE REJECTED — Image quality insufficient for classification**
5. Operator prompted to retry

*Key message: "The software enforces a procedure rather than merely taking a photograph."*

---

## Scenario 4: Tampering Detection — THE MONEY SHOT (90 seconds)

### Setup

1. Open the previously created positive test record (FT-2026-000184)
2. Show: Signature VALID ✓

### Tamper

3. (In a developer/admin demonstration) Modify the classification from PRESUMPTIVE_POSITIVE to PRESUMPTIVE_NEGATIVE

### Reveal

4. Open **Verify Record** screen
5. App shows:

```
⚠ INTEGRITY CHECK FAILED

This record does not match the signature
originally issued.

The record may have been modified after signing.

Expected hash:
a73c...91bf

Current hash:
4b21...e3d1
```

6. **Pause here.** Let judges absorb this.

*Key message: "We're demonstrating the concept rather than merely claiming tamper-proof."*

---

## Scenario 5: Record History (30 seconds)

1. Navigate to **Field Test Records**
2. Show searchable list with filters (All / Positive / Negative / Inconclusive)
3. Each record shows:
   - Record ID
   - Classification result
   - Date/time
   - Operator
   - Signature status
4. Tap a record to show full evidence detail

---

## Closing (30 seconds)

Show architecture slide:

```
CAMERA → VALIDATE → CLASSIFY → HASH → SIGN → VERIFY
```

Key points:
- "We turn a subjective field observation into a reproducible, traceable digital record."
- "The classifier is one service inside a deterministic evidence pipeline."
- "We use tamper-evident, not tamper-proof. The system detects modification, it doesn't claim to prevent it."
- "All results are explicitly presumptive. Laboratory confirmation is always required."

---

## Backup Scenarios

If time permits or judges ask questions:

### Inconclusive Result
- Show 51% confidence → INCONCLUSIVE
- Explain uncertainty handling

### Verification by QR
- Show QR code on sealed record
- Scan to open verification page
- Show independent verification

### Offline Handling
- Show "Record queued for secure upload" state
- Explain resilient field operation

---

## Don'ts During Demo

- Don't explain React, Expo, Supabase, or any technology unprompted
- Don't say "AI-powered" or "blockchain"
- Don't claim accuracy percentages without citing the validation dataset
- Don't skip the tamper detection scenario — it's the strongest moment
- Don't rush through the evidence record — let judges read it
