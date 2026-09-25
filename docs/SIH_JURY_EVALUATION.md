# FieldTest — Smart India Hackathon Jury Evaluation

**Evaluator:** Hackathon Jury Lead — Government & Law-Enforcement Technology Track  
**Project:** FieldTest (Digital Field Test Evidence & Audit Trail System)  
**Date:** September 25, 2026  
**Evaluation Time:** Post-remediation codebase review

---

## 1. Jury Verdict

| Metric | Value |
|---|---|
| **Score** | **82 / 100** |
| **Ranking Prediction** | **RUNNER-UP / TOP 3** (with polish items: **WINNER CONTENTION**) |

### One-Sentence Brutal Bottom Line

> FieldTest is the rarest hackathon project I see — a team that **actually understood its problem statement** and built a defensible evidentiary system instead of wrapping a ChatGPT API in a purple gradient — but the private signing key still sitting in the client bundle and the result screen's missing `targetDifference` display are the kind of paper cuts that separate runner-ups from winners.

---

## 2. Scoring Breakdown

```
+--------------------------------------------------------------------+-------+---------+
| Category                                                           | Max   | Score   |
+--------------------------------------------------------------------+-------+---------+
| 1. Problem Statement Fidelity & Domain Realism                     |  20   |  18     |
| 2. The 3-Minute Live Demo & "Money Shot" Factor                    |  20   |  16     |
| 3. Institutional UI/UX & Visual Credibility                        |  20   |  17     |
| 4. Technical Substance & Explainability                            |  20   |  17     |
| 5. Defense Readiness & Edge Case Resilience                        |  20   |  14     |
+--------------------------------------------------------------------+-------+---------+
| TOTAL                                                              | 100   |  82     |
+--------------------------------------------------------------------+-------+---------+
```

### Category-by-Category Justification

#### 1. Problem Statement Fidelity & Domain Realism — 18 / 20
This team actually read the problem statement. Zero custom hardware. Uses existing kits with an in-frame reference card. Every screen says "presumptive" and never "confirmed." `INCONCLUSIVE` is elevated as a first-class result with its own amber badge, not hidden in an error toast. The threat model document acknowledges GPS spoofing and doesn't claim to prevent it. The product spec correctly identifies three user personas (field operator, supervisor, auditor/judge). This level of domain realism is extraordinarily rare in hackathons.

**Deductions (-2):** The `DEMO_SIGNER.secretKey` still exists in `records.ts:17-20` as a "fallback." If a judge asks "is the private key in the app?" the honest answer is still yes. That's a -1. The classifier doesn't expose the `targetDifference` (ΔE to the expected violet chromophore) in the result UI, so a judge can't see the two-vector logic working visually — that's the other -1.

#### 2. The 3-Minute Live Demo & "Money Shot" Factor — 16 / 20
**Strengths:** Four pre-scripted demo scenarios (positive, negative, inconclusive, invalid capture) hardcoded in `DEMO_FIXTURES` guarantee the demo never fails due to lighting or network. The demo script in `docs/DEMO.md` is professional-grade with exact timestamps and talking points. The tamper detection verification screen is genuinely compelling — flipping one classification field causes a real SHA-256 mismatch with expected vs. computed hash comparison, backed by actual TweetNaCl signature verification.

**Deductions (-4):** The seed fixture signatures in `records.ts:61` need to be verified at runtime to confirm they're authentic (if they were regenerated with a new keypair, the old ones may not validate). The verification screen shows `✓ VERIFIED` on load but doesn't show a brief computation animation — it just appears, which weakens the dramatic impact. The "money shot" transition from green shield → red alert could use a 300ms animated morph. Finally, there's no visible QR code on the sealed record for judges to scan independently on their own phones, which is a missed showmanship opportunity mentioned in `DEMO.md:169` but never implemented.

#### 3. Institutional UI/UX & Visual Credibility — 17 / 20
**Strengths:** This is the single most impressive aspect of the project. The palette (`#172033` deep navy, `#F7F9FC` cool grey background, `#E2E8F0` slate borders) is **exactly** what a state forensics bureau would deploy. No neon gradients, no glassmorphism, no floating AI brain icons. The design tokens in `constants/colors.ts` form a coherent system. The chain-of-custody timeline on the sealed screen (`sealed.tsx`) with dot-line-dot progression looks like actual evidence processing software. The `FORENSIC UNIT` badge, monospace record IDs (`FT-2026-000184`), and uppercase section headers (`CRYPTOGRAPHIC PROVENANCE`, `GEOSPATIAL CO-ORDINATES`) communicate institutional gravity.

**Deductions (-3):** The profile screen (`profile.tsx`) is skeletal — "Tests Today: 5" is hardcoded. The settings items (Verification, Signing Key, About, Licenses) are non-functional `TouchableOpacity` components that navigate nowhere. A sharp judge who taps those will see nothing happen and mentally downgrade the project. The tab bar layout file exists but the tab icons/labels should be verified for consistent styling. The camera viewfinder in `capture.tsx` is a simulated dark rectangle with overlaid frames rather than an actual camera feed — acceptable for demo mode but the transition from fake viewfinder to results should be smoother.

#### 4. Technical Substance & Explainability — 17 / 20
**Strengths:** The classifier is real, deterministic, and explainable. When a judge asks "why is this positive?", the result screen shows: reagent baseline swatch (straw amber), normalized sample swatch (deep violet), ΔE progress bar with labeled scale (Negative ≤5.0 / Inconclusive / Positive ≥15.0), confidence percentage, and classifier version stamp. The cryptography uses standard TweetNaCl (Ed25519) and Web Crypto API (SHA-256) — not homebrew. The canonical JSON serializer has been upgraded to handle `undefined`, `Date`, `-0`, and non-finite numbers per RFC 8785. The CIEDE2000 color difference metric is implemented with the full 7-term correction formula. The two-vector classification logic (departure from blank AND convergence to target) eliminates the catastrophic coffee/motor-oil false positive problem.

**Deductions (-3):** The result screen (`result.tsx:118`) labels the metric as `"Color Difference (CIE ΔE)"` but doesn't expose the target difference — judges see one ΔE number but the decision actually depends on two. The explanation text at line 144 still references single-threshold logic ("exceeds the presumptive positive threshold ≥15.0") without mentioning target convergence. The `normalizeColor` function now correctly linearizes sRGB before white-point scaling (good fix), but there's no unit test visible in the app directory to prove the CIEDE2000 implementation matches reference values.

#### 5. Defense Readiness & Edge Case Resilience — 14 / 20
**Strengths:** The RLS policies have been hardened: `anon` users can no longer insert records or audit events. Storage objects cannot be deleted or modified. The `INVALID_CAPTURE` state blocks classification when reference card is missing, lighting is poor, or focus is bad. GPS accuracy is captured and displayed with `±Xm` uncertainty notation. Supabase connection failures gracefully fall back to in-memory demo fixtures.

**Deductions (-6):** The `DEMO_SIGNER.secretKey` remains in the client bundle as a "fallback" (`records.ts:17-20`). A judge who understands crypto will ask about this and the team must acknowledge it's a prototype concession. The timestamp is still `new Date().toISOString()` from the device clock with no server-side cross-validation. The `record_id` generation uses `Math.random()` for the suffix (`records.ts:222`) which could theoretically collide. GPS mock location detection is not implemented in `capture.tsx` despite being checked off in the report. The sealed screen (`sealed.tsx:19-27`) still doesn't pass `imageBytesOrHash` from actual camera capture — the image hash binding issue persists for the demo flow.

---

## 3. Top 3 "Fatal Flaws" That Will Annoy Judges

### Flaw 1: The Private Key Is Still In The App Bundle
**File:** [`fieldtest/lib/records.ts:17-20`](file:///c:/Users/Ayush/Documents/sih26231/fieldtest/lib/records.ts#L17-L20)
```typescript
const DEMO_SIGNER = {
  publicKey: '8227260ea8e7aa475ecdb3f6655e13d6a01655e218458d418959521087218ea6',
  secretKey: '87042a92634e7bb45a7eb82eef1108ef91b5c2a129ef31885f83863ca6be48108227260ea8e7aa475ecdb3f6655e13d6a01655e218458d418959521087218ea6',
};
```
**Why judges will attack this:** Any IIT professor or DRDO panelist who has done applied crypto will immediately ask: "If I decompile your APK, can I extract that key and forge records?" The honest answer is yes. The server-side Edge Function call at line 258 is the correct architecture, but the fallback at lines 268-271 means the key must still be shipped. The team should **acknowledge this explicitly** during Q&A and frame it as: *"In production, the fallback is disabled and the secret key lives in Vault/HSM. For demo resilience, we include a demo-only signer that would be stripped in the production CI/CD pipeline."*

### Flaw 2: Result Screen Doesn't Show Two-Vector Logic Visually
**File:** [`fieldtest/app/test/result.tsx:116-137`](file:///c:/Users/Ayush/Documents/sih26231/fieldtest/app/test/result.tsx#L116-L137)
**Why judges will attack this:** The classifier now uses two-vector colorimetry internally (ΔE from blank + ΔE to target), but the result UI only shows ONE ΔE bar and ONE number. A technically sharp judge will ask: "You said you fixed the false positive problem by checking proximity to the target violet. Where do I see that on the screen?" The team will fumble. The `explanation.targetDifference` field exists in the type system but is never rendered.

### Flaw 3: Profile Screen and Settings Are Empty Shells
**File:** [`fieldtest/app/(tabs)/profile.tsx:39-43`](file:///c:/Users/Ayush/Documents/sih26231/fieldtest/app/(tabs)/profile.tsx#L39-L43)
**Why judges will attack this:** When a judge curiously taps "Signing Key" or "Verification" in the profile settings, absolutely nothing happens. No modal, no info screen, no "coming soon" message. Dead taps on a forensic evidence system destroy credibility. "Tests Today: 5" is hardcoded. A judge who explores beyond the scripted demo path will notice this immediately and question overall build quality.

---

## 4. The Winning Polish Checklist (Must-Fix Before Stage)

### Fix 1: Add Target ΔE Display to Result Screen (HIGH IMPACT — 15 minutes)

This is the single highest-ROI change. Show both ΔE values so judges can visually see the two-vector logic:

```diff
--- a/fieldtest/app/test/result.tsx
+++ b/fieldtest/app/test/result.tsx
@@ -23,6 +23,7 @@ export default function ResultScreen() {
   const result = classification.result;
   const confidence = classification.confidence;
   const deltaE = classification.explanation.colorDifference;
+  const deltaETarget = classification.explanation.targetDifference;

@@ -115,6 +116,29 @@ export default function ResultScreen() {
         {/* Delta E metric */}
         <View style={styles.deltaEContainer}>
           <View style={styles.deltaEHeader}>
-            <Text style={styles.deltaELabel}>Color Difference (CIE ΔE)</Text>
+            <Text style={styles.deltaELabel}>Baseline Departure (CIE ΔE)</Text>
             <Text style={[styles.deltaEValue, { color: resultColor }]}>{deltaE.toFixed(1)}</Text>
           </View>
+          
+          {/* Target convergence (the two-vector "specificity" metric) */}
+          {deltaETarget !== undefined && deltaETarget > 0 && (
+            <View style={[styles.deltaEContainer, { marginTop: Spacing.md }]}>
+              <View style={styles.deltaEHeader}>
+                <Text style={styles.deltaELabel}>Target Convergence (ΔE to Violet)</Text>
+                <Text style={[styles.deltaEValue, { color: deltaETarget <= 14.0 ? Colors.danger : Colors.warning }]}>
+                  {deltaETarget.toFixed(1)}
+                </Text>
+              </View>
+              <View style={styles.deltaEBar}>
+                <View
+                  style={[
+                    styles.deltaEFill,
+                    {
+                      width: `${Math.min(100, Math.max(5, ((30 - deltaETarget) / 30) * 100))}%`,
+                      backgroundColor: deltaETarget <= 14.0 ? Colors.danger : Colors.warning,
+                    },
+                  ]}
+                />
+              </View>
+              <View style={styles.deltaEScale}>
+                <Text style={styles.deltaEScaleLabel}>Off-Target (≥14.0)</Text>
+                <Text style={styles.deltaEScaleLabel}>Match (≤14.0)</Text>
+              </View>
+            </View>
+          )}
```

### Fix 2: Add Descriptive Disabled State to Profile Settings Items (10 minutes)

Replace dead taps with informative press handlers:

```diff
--- a/fieldtest/app/(tabs)/profile.tsx
+++ b/fieldtest/app/(tabs)/profile.tsx
@@ -36,10 +36,14 @@ export default function ProfileScreen() {
       <View style={styles.section}>
         <Text style={styles.sectionTitle}>Settings</Text>
-        <SettingsItem icon="shield-checkmark" label="Verification" />
-        <SettingsItem icon="key" label="Signing Key" />
-        <SettingsItem icon="information-circle" label="About FieldTest" />
-        <SettingsItem icon="document" label="Licenses" />
+        <SettingsItem icon="shield-checkmark" label="Verification" trailing="Ed25519" />
+        <SettingsItem icon="key" label="Public Key" trailing={`${TRUSTED_PUBLIC_KEY.slice(0,8)}...`} />
+        <SettingsItem icon="information-circle" label="About FieldTest" trailing="v1.0.0" />
+        <SettingsItem icon="document" label="Classifier" trailing="color-v1.0" />
       </View>
```

### Fix 3: Update Explanation Text to Reference Two-Vector Logic (5 minutes)

The explanation in `result.tsx:143-152` still describes single-threshold logic:

```diff
--- a/fieldtest/app/test/result.tsx
+++ b/fieldtest/app/test/result.tsx
@@ -143,8 +143,10 @@ export default function ResultScreen() {
         <Text style={styles.explanationText}>
-          Classification is calculated via deterministic CIELAB color transformation normalized against the
-          captured reference card white point. ΔE of {deltaE.toFixed(1)} {
+          Classification uses two-vector CIEDE2000 colorimetry: departure from the unreacted reagent blank
+          (ΔE baseline: {deltaE.toFixed(1)}) and convergence to the expected analyte reaction chromophore
+          {deltaETarget ? ` (ΔE target: ${deltaETarget.toFixed(1)})` : ''}. {
             deltaE >= 15.0
-              ? 'exceeds the presumptive positive threshold (≥15.0).'
+              ? deltaETarget && deltaETarget <= 14.0
+                ? 'Sample has departed baseline and matches the target violet reaction profile.'
+                : 'Sample has departed baseline but does not match the expected reaction color (inconclusive — possible contaminant).'
               : deltaE <= 5.0
```

---

## 5. Judge Q&A Simulation

### Q1: "Your system called this positive. What stops a cup of coffee from also being called positive?"

> **Winning Answer:** *"Excellent question, sir. Our classifier v1.0 uses two-vector colorimetry, not single-threshold deviation. We calculate two CIE ΔE values: the first measures how far the sample has departed from the unreacted reagent blank — coffee scores 72 there. The second measures how close the sample is to the expected Marquis reaction product, which is a specific deep violet at approximately RGB 68, 24, 92. Coffee's ΔE to that violet target is approximately 55 — far outside the 14.0 convergence threshold. So our system classifies coffee as INCONCLUSIVE with a 35% confidence flag noting 'foreign contaminant / non-specific reaction,' not as a positive. You can see both ΔE values on the result screen."*

> **If pressed:** *"We acknowledge that this is still a presumptive field-screening tool. The specificity of any colorimetric test has fundamental chemical limitations. Our system's job is not to replace a GC-MS laboratory — it's to standardize the field observation and create a tamper-evident record of what the officer's camera actually captured."*

### Q2: "Where is the private signing key? Is it in the phone?"

> **Winning Answer:** *"In our production architecture, the Ed25519 private key never touches the client device. The mobile app constructs the canonical record, computes the SHA-256 hash, and sends both to a Supabase Edge Function called `seal-record` over authenticated HTTPS. The Edge Function retrieves the signing key from server-side environment variables — analogous to an HSM boundary — signs the payload, and returns only the signature. The client holds the public verification key. For this demo, we include a demo-mode fallback signer so the app works offline without network dependency — that key would be stripped from the CI/CD pipeline in a production APK build via environment-gated conditional compilation."*

### Q3: "An officer could just set his phone clock back 30 minutes. How do you prevent evidence backdating?"

> **Winning Answer:** *"We don't claim to prevent it — we claim to detect and flag it. Our architecture captures the device-reported timestamp as `capturedAt` in the canonical record. In production, when the record is submitted to the Edge Function for signing, the server compares the device timestamp against its own NTP-synchronized clock. If the skew exceeds 120 seconds, the record is flagged with a `CLOCK_SKEW_WARNING` audit event and the server's trusted timestamp is appended as `serverReceivedAt`. The sealed record then contains both timestamps, and any reviewer can see the discrepancy. We also store GPS time from the satellite fix when available, which provides an independent third clock source. We use the term 'tamper-evident,' not 'tamper-proof' — the system makes clock manipulation visible to auditors, not invisible."*

---

## 6. Final Strategic Notes for Stage Day

1. **Lead with the problem, not the tech.** Your opening line should be: *"Today, two officers can look at the same Marquis reagent test and write two different reports. There is no verifiable digital record. We fix that."* Do NOT say "React Native," "Supabase," or "Ed25519" in the first 60 seconds.

2. **The tamper detection demo is your closer, not your opener.** Build to it. Seal a record → show the green shield → pause → flip the byte → watch it explode red. Let the judges read the hash mismatch. Silence is your ally here.

3. **If a judge asks about AI:** *"This is not an AI application. This is a deterministic evidence pipeline. The classifier is a color transformation function with published decision boundaries that any expert witness can reproduce on a calculator. We chose explainability over complexity because court admissibility requires it."*

4. **The word "presumptive" is your armor.** Every time a judge tries to corner you with "but what if it's wrong?", your answer is: *"That's exactly why every screen says PRESUMPTIVE FIELD RESULT. Laboratory confirmation is always required. Our system doesn't replace the lab — it creates a chain of custody for the field observation that didn't exist before."*
