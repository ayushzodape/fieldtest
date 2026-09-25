# FieldTest — Incident Response & Operational Security Playbook

**Document ID:** FT-SOP-2026-001  
**Classification:** Law Enforcement Sensitive (LES) / Government Operations  
**Audience:** System Administrators, Forensic Auditors, NCB Zonal Directors, IT Security Officers  
**Last Updated:** September 25, 2026  

---

## 1. Executive Summary

FieldTest operates as a courtroom-admissible digital chain-of-custody and evidence collection platform. This document establishes mandatory Standard Operating Procedures (SOPs) for responding to security incidents, hardware loss, key compromise, and evidentiary audits pursuant to the **NDPS Act (1985)** and **Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA, 2023)**.

---

## 2. Standard Operating Procedures (SOPs)

### SOP-101: Asymmetric Key Compromise & Emergency Key Rotation

#### Threat Scenario
A server-side private key (e.g., Supabase Edge Function Ed25519 signing key) is suspected of being exposed or accessed by an unauthorized entity.

#### Core Requirement
Rotating the signing key **must never** invalidate historical evidence records sealed under the retired key. Courts must be able to verify records sealed in 2026 even in 2036.

#### Action Protocol
1. **Immediate Revocation**:
   - Access the Key Management System (AWS KMS / Vault / Supabase Vault).
   - Set the compromised key pair status to `REVOKED_FOR_NEW_SIGNATURES`.
   - Record exact UTC timestamp of revocation.
2. **Key Pair Generation**:
   - Generate new Ed25519 key pair ($K_{\text{new}}$).
   - Distribute public key ($PK_{\text{new}}$) to client bundles via EAS Over-The-Air (OTA) or App Store update.
3. **Key Registry Ledger Update**:
   - Append the retired key and valid time window to the official public ledger:
     ```json
     {
       "keyId": "FT-KEY-2026-A",
       "publicKey": "8227260ea8e7aa475ecdb3f6655e13d6a01655e218458d418959521087218ea6",
       "status": "RETIRED",
       "validFrom": "2026-01-01T00:00:00Z",
       "validUntil": "2026-09-25T14:00:00Z",
       "revocationReason": "Scheduled Rotation / Precautionary"
     }
     ```
4. **Court Certification**:
   - Issue an administrative affidavit for any open court proceedings confirming that records sealed prior to the revocation timestamp remain mathematically authentic and were signed while the key was in exclusive lawful custody.

---

### SOP-102: Evidentiary Tamper Detection & Fraud Escalation

#### Threat Scenario
An evidence record verification returns `INTEGRITY CHECK FAILED` or `HASH MISMATCH`. This indicates either intentional data manipulation or accidental storage bit rot.

#### Action Protocol
1. **Automated Quarantining**:
   - The verification screen immediately flags the record as `COMPROMISED_DO_NOT_TENDER_IN_COURT`.
   - The standalone verifier logs a critical event to `monitoring.ts` with original vs. computed hashes.
2. **Chain-of-Custody Audit**:
   - Extract the linked audit trail from `lib/auditTrail.ts` to identify the exact event node where the hash chain was broken.
   - Inspect database write logs to identify the user ID, IP address, and database role that executed the unauthorized `UPDATE`.
3. **Forensic Escalation**:
   - Report the tampering incident to the **Office of Professional Responsibility / Integrity Wing**.
   - Preserve physical exhibit samples for confirmatory chemical GC-MS re-testing at CFSL.

---

### SOP-103: Stolen or Lost Field Device (Mobile Terminal Incident)

#### Threat Scenario
An officer's smartphone or field tablet running FieldTest is lost, seized by hostile parties, or stolen during an interdiction raid.

#### Action Protocol
1. **Immediate Session Revocation**:
   - System administrator accesses Supabase Auth / Admin Console.
   - Force-terminate all active sessions for the operator (`terminateActiveSession(badgeNumber)`).
   - Invalidate refresh tokens and biometric bypass keys.
2. **MDM Remote Wipe**:
   - Transmit remote wipe signal via Government Mobile Device Management (MDM).
   - Wipe local SQLite offline queue and cached temporary camera frames.
3. **Public Key Verification**:
   - Note that because private signing keys **never touch client devices** (they reside exclusively in secure server-side Edge Functions / HSM), a stolen client device **cannot** forge signed evidence records.
   - The device holds only the public verification key and operator biometric session token (which expires after 15 minutes of inactivity).

---

### SOP-104: Offline Evidence Reconciliation & Sync Backlog

#### Threat Scenario
Field operators operate in remote border or maritime zones without cellular connectivity for extended periods (>48 hours), accumulating a backlog of un-synced evidence records.

#### Action Protocol
1. **Local Queue Integrity Check**:
   - The `offlineQueue.ts` engine verifies that each queued record retains its initial cryptographic seal created at capture time.
2. **Network Reconnection**:
   - Upon reconnecting to secure departmental Wi-Fi or cellular network, the app initiates `processOfflineQueue()`.
3. **Reconciliation & Clock Skew Auditing**:
   - Server verifies the dual timestamp: device capture timestamp is compared against server arrival time.
   - If skew exceeds tolerance, the record is flagged for supervisor review but the mathematical evidence binding remains intact.

---

### SOP-105: Annual ISO 17025 Accreditation Checklist

Before annual laboratory accreditation inspections, the Quality Manager must verify:
- [x] All 11 automated test suites execute and pass cleanly (`npm test`).
- [x] Continuous Integration workflow in `.github/workflows/ci.yml` is active and green.
- [x] Calibration dataset ($N = 400$) maintains 0 false positives and ROC-AUC $\ge 0.99$.
- [x] Section 63 BSA (2023) court certificate generator contains updated statutory references.
- [x] Personnel registry contains current officer badge numbers, valid expiration dates, and assigned clearance levels.
- [x] Cryptographic dependencies (`tweetnacl`, Web Crypto API) are pinned to audited versions without CVE vulnerabilities.
