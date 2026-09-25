# FieldTest — Verifiable Digital Field Test Evidence & Chain-of-Custody Audit System

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Tamper--Evident-navy.svg)](#cryptographic-architecture)

> **"Trust → Traceability → Explainability → Polished UX → AI Sophistication"**

FieldTest is a verifiable evidence and chain-of-custody audit system designed for field operators conducting colorimetric chemical field tests (e.g., narcotics, chemical precursors, forensic reagents, or environmental contaminants). 

Judges, defense attorneys, and regulatory auditors care about whether an evidentiary record can be trusted in court—not whether it relies on an uninterpretable neural network. FieldTest ensures mathematical traceability, physical reference card normalization, and post-capture cryptographic tamper evidence.

---

## Mandatory Statutory Disclaimer

> **PRESUMPTIVE FIELD RESULT: This record does not constitute laboratory confirmation.**  
> *Field colorimetric screening tests are presumptive only. Confirmatory testing by an accredited forensic laboratory (e.g., GC-MS, HPLC, or FT-IR) is required for definitive chemical identification.*

---

## Key Features

1. **Deterministic Colorimetric Pipeline**:
   - V1 classifier utilizes a deterministic color transformation pipeline with physical reference-card color normalization.
   - Computes perceptual color differences using the **CIEDE2000 ($\Delta E_{00}$)** standard against accredited reference swathes.
   - Includes adulterant defense thresholds to prevent false positives from dyes, plant chlorophyll, motor oils, and beverage contaminants.

2. **Cryptographic Tamper-Evidence**:
   - Computes canonical SHA-256 digests over immutable test session metadata (`schemaVersion`, `recordId`, `operatorId`, `capturedAt`, GPS coordinates + `accuracyMeters`, CIEDE2000 color metrics, raw image SHA-256).
   - Strict canonical JSON serialization (RFC 8785 conformant key sorting).
   - Server-side Ed25519 cryptographic digital signatures signed within an isolated boundary (Supabase Edge Function) with client verification.
   - Independent client-side verification engine that detects single-byte bit-flip tampering.

3. **`INCONCLUSIVE` as a First-Class Citizen**:
   - Ambiguous color spaces, insufficient lighting, optical glare, motion blur, or reference card occlusion legitimately produce `INCONCLUSIVE` or `INVALID_CAPTURE` outcomes instead of forced classifications.

4. **Institutional "Deliberately Boring" Design**:
   - Built to government and field-operations utility specifications.
   - Palette: Deep Navy (`#172033`), Crisp White (`#FFFFFF`), Slate Borders (`#E2E8F0`), Background (`#F8FAFC`).
   - Zero neon gradients, floating AI chatbots, or misleading "certainty" meters.

5. **Demo Resilience & Deterministic Test Scenarios**:
   - Built-in scripted scenarios: *Presumptive Positive (Cocaine HCl / Cobalt Thiocyanate)*, *Presumptive Negative (Acetaminophen / Blank)*, *Invalid Capture (Glare / Blur)*, and *Tamper Detection Verification*.

---

## Cryptographic Architecture

```
Operator Authenticated
        ↓
[1. CAPTURE]     Camera with guided reference card framing + EXIF sanity
        ↓
[2. VALIDATE]    Lighting, focus, card presence, test region detection
        ↓
[3. CLASSIFY]    CIEDE2000 Reference normalization → ΔE comparison → Result + Confidence
        ↓
[4. RECORD]      SHA-256(image) + Metadata → Canonical JSON → Ed25519 Signature
        ↓
[5. VERIFY]      Independent signature check + Hash recalculation (Tamper-Evident)
```

### Canonical Record Schema

Every sealed record conforms to the canonical contract:

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
  imageSha256: string;        // 64-character lowercase hex string
}
```

---

## Project Structure

```
.
├── AGENTS.md                  # Development guidelines & 15 non-negotiable rules
├── docs/                      # Architectural & forensic documentation
│   ├── ARCHITECTURE.md        # Technical architecture & subsystem boundaries
│   ├── CLASSIFIER.md          # Deterministic colorimetric & CIEDE2000 specification
│   ├── DEMO.md                # 4-stage scripted presentation walkthrough
│   ├── FORENSIC_AUDIT_REPORT.md # Comprehensive forensic security audit & remediation
│   ├── PRODUCTION_READINESS.md# Enterprise checklist, SLA, and deployment guide
│   ├── PRODUCT_SPEC.md        # Product requirements & user stories
│   ├── SIH_JURY_EVALUATION.md # Smart India Hackathon jury defense & scoring guide
│   └── THREAT_MODEL.md        # STRIDE threat model & evidentiary attack surface
├── fieldtest/                 # React Native / Expo application
│   ├── app/                   # Expo Router screens
│   │   ├── _layout.tsx        # Root Navigation Stack
│   │   ├── (tabs)/            # Main tabs (Capture, Tests, Verification)
│   │   ├── test/              # Test flow (capture, review, result, sealed)
│   │   └── verify/[id].tsx    # Public verification & tamper demo screen
│   ├── __tests__/             # Unit & integration test suites
│   │   ├── classifier.test.ts # CIEDE2000 & adulterant rejection tests
│   │   ├── crypto.test.ts     # SHA-256, canonical JSON, Ed25519 signature tests
│   │   └── records.test.ts    # Seed record verification & tamper tests
│   ├── constants/             # Design tokens & color palettes
│   ├── lib/                   # Business logic (crypto, classifier, supabase)
│   └── types/                 # Strict TypeScript schemas & interfaces
└── supabase/                  # Supabase Backend & Database
    ├── functions/
    │   └── seal-record/       # Secure Ed25519 signing Edge Function
    └── schema.sql             # PostgreSQL schema with Row-Level Security (RLS)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or later)
- npm or yarn
- [Expo Go](https://expo.dev/go) app (for mobile testing) or a modern web browser

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ayushzodape/fieldtest.git
   cd fieldtest/fieldtest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (optional for local/offline demo mode):
   ```bash
   cp .env.example .env
   ```
   *Note: FieldTest runs out of the box in offline/demo mode with embedded cryptographic verification.*

### Running the App

- Start the Expo development server:
  ```bash
  npx expo start
  ```
- Run directly in a web browser:
  ```bash
  npx expo start --web
  ```

### Running the Test Suite

Run the end-to-end cryptographic and classification test suite:
```bash
npm test
```

Perform static type checking:
```bash
npx tsc --noEmit
```

---

## Evidentiary & Security Compliance

- **No Custom Cryptography**: Uses standard Web Crypto API (`crypto.subtle`) and audited `@noble/ed25519`.
- **Asymmetric Key Separation**: Ed25519 signing private key is isolated within the backend edge function; client application only possesses the public verification key.
- **Zero Client Secrets**: No database service keys or private keys are bundled in client assets.
- **Audit Trails**: Every database mutation and state transition is captured in an append-only log with immutable timestamps.

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
