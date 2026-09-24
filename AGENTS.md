# Antigravity Agent Guidelines — FieldTest

Welcome to the **FieldTest** codebase. FieldTest is a digital field test evidence and audit trail system designed for field operators conducting colorimetric tests (e.g., narcotics, chemical, or environmental testing).

## 1. Core Product Philosophy

> **Trust → Traceability → Explainability → Polished UX → AI Sophistication**

This is **not** an "AI app." This is a **verifiable evidence and chain-of-custody audit system** that includes a deterministic classification step.
Judges and auditors care about whether the test record can be trusted in court or an official review, not whether it uses a complex neural net.

---

## 2. The 15 Non-Negotiable Engineering Rules

1. **TypeScript Strict Mode**: No `any`. Strict null checks enabled across all components, hooks, and utilities.
2. **No Custom Cryptography**: Never implement custom crypto algorithms. Use standard Web Crypto API (`crypto.subtle`) or battle-tested libraries (`tweetnacl`, `@noble/ed25519`).
3. **`INCONCLUSIVE` is a First-Class Result**: It is an expected, legitimate outcome, **never** treated as an error or unhandled state.
4. **Presumptive Language Always**: All results are **PRESUMPTIVE** (`PRESUMPTIVE_POSITIVE`, `PRESUMPTIVE_NEGATIVE`). Never claim "definitive" or "laboratory-confirmed".
5. **Mandatory Disclaimer**: Every screen, card, or export displaying a result must show the disclaimer:
   > *"PRESUMPTIVE FIELD RESULT: This record does not constitute laboratory confirmation."*
6. **Accurate Security Terminology**: Use **"tamper-evident"**, never "tamper-proof". Cryptography detects post-capture modification; it does not prevent physical fraud at the sensor.
7. **Canonical JSON Serialization**: Every record hash must be computed on deterministically canonicalized JSON (sorted keys, no extraneous whitespace).
8. **Asymmetric Key Separation**: The Ed25519 private key never touches client code. Signing occurs in a secure server-side boundary (e.g., Supabase Edge Function). Client only holds the public verification key.
9. **Zero Secrets in Code**: API keys and secrets stay in environment variables (`.env`). Only `EXPO_PUBLIC_*` variables are exposed to the client bundle.
10. **GPS Uncertainty Recorded**: Always capture and store `accuracyMeters` alongside `latitude` and `longitude`.
11. **Strict Version Stamping**: Every record must persist `schemaVersion` and `classifierVersion`.
12. **Institutional "Deliberately Boring" Design**:
    - Style: Government/field-operations utility.
    - Palette: Deep Navy (`#172033`), Crisp White (`#FFFFFF`), Slate Borders (`#E2E8F0`), Background (`#F8FAFC`).
    - Prohibited: Neon gradients, glassmorphism, floating AI robot icons, purple/pink glows.
13. **Deterministic Color Pipeline**: The V1 classifier is a deterministic color transformation pipeline with reference-card normalization ($\Delta E$ color difference calculation), not an opaque deep neural network.
14. **Demo Resilience & Determinism**: A bulletproof Demo Mode must exist with 4 pre-scripted scenarios (Positive, Negative, Invalid Capture, Tampering Detected) so presentations never fail due to network or lighting issues.
15. **The Tamper Detection "Money Shot"**: The verification screen must allow modifying a single byte/field to visually demonstrate integrity check failure with expected vs. actual hash mismatch.

---

## 3. Core Workflow & State Machine

```
Operator Authenticated
        ↓
[1. CAPTURE]     Camera with guided reference card framing
        ↓
[2. VALIDATE]    Lighting, focus, card presence, test region detection
        ↓
[3. CLASSIFY]    Reference normalization → ΔE comparison → Result + Confidence
        ↓
[4. RECORD]      SHA-256(image) + Metadata → Canonical JSON → Ed25519 Signature
        ↓
[5. VERIFY]      Independent signature check + Hash recalculation
```

---

## 4. Result Classification Hierarchy

| Result | Criteria | Action |
|---|---|---|
| `PRESUMPTIVE_POSITIVE` | Confidence $\ge 0.75$, color matches target range | Mark positive, generate seal |
| `PRESUMPTIVE_NEGATIVE` | Confidence $\ge 0.75$, color matches baseline | Mark negative, generate seal |
| `INCONCLUSIVE` | Confidence $< 0.75$ or color in ambiguous band | Flag for lab confirmatory review |
| `INVALID_CAPTURE` | Validation failure (glare, blur, missing reference card) | Reject before sealing; prompt retry |

---

## 5. Canonical Record Schema

Every sealed record must conform to:

```typescript
export interface CanonicalRecord {
  schemaVersion: "1.0";
  recordId: string;           // e.g. "FT-2026-000184"
  operatorId: string;         // e.g. "OP-042"
  capturedAt: string;         // ISO 8601 UTC
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  classification: {
    result: "PRESUMPTIVE_POSITIVE" | "PRESUMPTIVE_NEGATIVE" | "INCONCLUSIVE";
    confidence: number;       // 0.00 to 1.00
    classifierVersion: string;// e.g. "color-v1.0"
  };
  imageSha256: string;        // 64-char hex string
}
```

---

## 6. Project Structure

```
sih26231/
├── AGENTS.md                  # This file
├── docs/                      # Architectural & spec documentation
│   ├── ARCHITECTURE.md
│   ├── CLASSIFIER.md
│   ├── DEMO.md
│   ├── PRODUCT_SPEC.md
│   └── THREAT_MODEL.md
└── fieldtest/                 # React Native / Expo application
    ├── app/                   # Expo Router screens
    │   ├── _layout.tsx        # Root Stack
    │   ├── (tabs)/            # Main bottom tabs (index, tests, profile)
    │   ├── test/              # Test flow (capture, review, result, sealed)
    │   └── verify/[id].tsx    # Public verification & tamper demo screen
    ├── constants/             # Design tokens & app config
    ├── types/                 # TypeScript interfaces
    ├── lib/                   # Core business logic (crypto, classifier, supabase)
    └── components/            # Reusable UI components
```

---

## 7. Developer Commands

- Start dev server: `cd fieldtest; npx expo start`
- Start web preview: `cd fieldtest; npx expo start --web`
- Typecheck: `cd fieldtest; npx tsc --noEmit`
- Clean cache: `cd fieldtest; npx expo start -c`
