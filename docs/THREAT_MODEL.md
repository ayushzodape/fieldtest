# Threat Model

## Scope

This threat model covers the FieldTest prototype — a mobile application for creating tamper-evident digital records of colorimetric field tests.

The prototype establishes **integrity of the captured record**. It does not claim to establish laboratory-grade authenticity or replace confirmatory testing.

## Architecture Layers

```
                 DIGITAL RECORD
                       |
       +---------------+---------------+
       v               v               v
     IMAGE          CONTEXT          ACTOR
       |               |               |
    SHA-256       GPS + time       Operator ID
       |               |               |
       +---------------+---------------+
                       v
                 SIGNED RECORD
```

## Threat Matrix

| # | Threat | Impact | Likelihood | Mitigation | Status |
|---|---|---|---|---|---|
| T1 | Image modified after capture | Evidence integrity compromised | Medium | SHA-256 hash of original image bytes stored at capture time | Implemented |
| T2 | Record fields modified after signing | Classification result falsified | High | Ed25519 digital signature over canonical record | Implemented |
| T3 | Unauthorized access to other operators' records | Privacy violation, evidence tampering | Medium | Supabase Auth + Row Level Security policies | Implemented |
| T4 | Operator identity spoofing | False attribution of test results | Medium | Authenticated operator ID via Supabase Auth | Implemented |
| T5 | Poor image quality produces unreliable classification | Incorrect presumptive result | High | Capture quality checks + INCONCLUSIVE + INVALID_CAPTURE states | Implemented |
| T6 | Bad lighting conditions skew color analysis | Misclassification | High | Reference colour card normalization + lighting quality check | Implemented |
| T7 | Model uncertainty not communicated | False confidence in results | Medium | Confidence score + inconclusive threshold | Implemented |
| T8 | GPS coordinates spoofed | False location attribution | Low | Store accuracy radius; acknowledge GPS is an observation with uncertainty | Acknowledged |
| T9 | Classification model changed without tracking | Non-reproducible results | Medium | Classifier version stored in every record | Implemented |
| T10 | Results interpreted as laboratory confirmation | Legal/procedural misuse | High | Explicit "presumptive" status + prominent disclaimer | Implemented |
| T11 | Private signing key compromised | All signatures become untrustworthy | High | Key stored server-side only, never in client code | Implemented |
| T12 | Sensitive data in application logs | Data leak | Medium | No sensitive data logged (OWASP recommendation) | Implemented |
| T13 | Secrets/keys in source code | Credential exposure | High | Environment variables only; no secrets in repo | Implemented |
| T14 | Network interception | Data in transit compromised | Medium | HTTPS only (Supabase default) | Implemented |
| T15 | Replay of signed records | Duplicate evidence submission | Low | Unique record IDs + timestamps | Acknowledged |

## What We DO NOT Claim

1. **We do not claim the camera image is genuine.** A sophisticated attacker could feed a fake image to the camera sensor. We detect post-capture modification, not pre-capture fabrication.

2. **We do not claim GPS is accurate.** GPS coordinates are stored as observations with an accuracy radius. Location can be spoofed on rooted/jailbroken devices.

3. **We do not claim operator identity is biometrically verified.** Authentication establishes that someone has the operator's credentials, not that they are physically present.

4. **We do not claim laboratory-grade results.** All classifications are presumptive field observations.

## OWASP MASVS Alignment

| MASVS Category | Prototype Coverage |
|---|---|
| Storage | Expo SecureStore for sensitive local data; no sensitive data in logs |
| Cryptography | SHA-256 + Ed25519 via established libraries; no custom primitives |
| Authentication | Supabase Auth with session management |
| Network Security | HTTPS enforced by Supabase |
| Platform Interaction | Standard Expo APIs for camera, GPS, file system |
| Code Security | TypeScript strict mode; no secrets in source |
| Resilience | Capture validation; error states for all failure modes |
| Privacy | RLS; operator can only access own records |
