# Architecture

## System Overview

```
             FIELD OPERATOR
                   |
                   v
            +-------------+
            |   CAMERA    |
            +------+------+
                   |
                   v
         +------------------+
         | IMAGE VALIDATION  |
         | - Color card      |
         | - Lighting        |
         | - Focus           |
         +--------+---------+
                  |
                  v
         +------------------+
         | CLASSIFICATION   |
         | Positive         |
         | Negative         |
         | Inconclusive     |
         +--------+---------+
                  |
                  v
         +------------------+
         | DIGITAL RECORD   |
         | Time + GPS       |
         | Operator         |
         | Image hash       |
         | Model version    |
         +--------+---------+
                  |
                  v
            ED25519 SIGN
                  |
                  v
          VERIFIED RECORD
```

## Stack

### Frontend / Mobile

| Component | Technology |
|---|---|
| Framework | React Native + Expo |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router |
| Camera | expo-camera |
| Location | expo-location |
| Image processing | expo-image-manipulator |
| File system | expo-file-system |
| Local storage | expo-sqlite |
| Secure storage | expo-secure-store |
| Styling | NativeWind |
| Icons | Lucide React Native |
| Validation | Zod |
| Server state | TanStack Query |

### Backend

| Component | Technology |
|---|---|
| Platform | Supabase |
| Database | PostgreSQL |
| Auth | Supabase Auth |
| Object storage | Supabase Storage |
| Authorization | Row Level Security |
| Signing service | Supabase Edge Functions |

### Cryptography

| Operation | Algorithm |
|---|---|
| Image digest | SHA-256 |
| Record digest | SHA-256 |
| Record signature | Ed25519 |
| Key storage | Server-side (Edge Function env) |

## Data Flow

### Capture Flow

```
1. Operator authenticates
2. Operator starts new field test
3. Camera opens with guided framing overlay
4. App continuously validates:
   - Reference card visibility
   - Test region detection
   - Focus quality
   - Lighting quality
5. Capture button enabled when all checks pass
6. Operator captures image
7. GPS coordinates + accuracy acquired
8. Timestamp recorded (UTC)
```

### Classification Flow

```
1. Image bytes -> SHA-256 -> imageSha256
2. Image -> reference card detection
3. Reference card -> color normalization
4. Normalized image -> test region extraction
5. Test region -> color feature extraction (RGB/LAB)
6. Features -> decision boundary comparison
7. Output: result + confidence + explanation
```

### Record Sealing Flow

```
1. Construct canonical record JSON:
   - schemaVersion
   - recordId
   - operatorId
   - capturedAt
   - location { lat, lng, accuracy }
   - classification { result, confidence, classifierVersion }
   - imageSha256
2. JSON.stringify with sorted keys, no whitespace
3. SHA-256(canonical JSON) -> recordHash
4. Send recordHash to signing service
5. Ed25519.sign(recordHash, privateKey) -> signature
6. Store complete record with signature
```

### Verification Flow

```
1. Retrieve record from database
2. Reconstruct canonical JSON from stored fields
3. SHA-256(canonical JSON) -> computedHash
4. Compare computedHash with stored recordHash
5. Ed25519.verify(recordHash, signature, publicKey)
6. If both match: VALID
7. If mismatch: INTEGRITY CHECK FAILED
   - Display expected hash vs. current hash
```

## Project Structure

```
fieldtest/
|
+-- app/                     # Expo Router screens
|   +-- (auth)/
|   |   +-- login.tsx
|   |   +-- operator.tsx
|   +-- (tabs)/
|   |   +-- index.tsx        # Home / dashboard
|   |   +-- tests.tsx        # Test history
|   |   +-- profile.tsx      # Operator profile
|   +-- test/
|   |   +-- capture.tsx      # Camera capture
|   |   +-- review.tsx       # Review captured image
|   |   +-- result.tsx       # Classification result
|   |   +-- sealed.tsx       # Sealed record confirmation
|   +-- verify/
|   |   +-- [id].tsx         # Record verification
|   +-- _layout.tsx
|
+-- components/
|   +-- ui/                  # Design system components
|   +-- camera/              # Camera overlay, framing
|   +-- test/                # Test-related components
|   +-- records/             # Record list, detail views
|
+-- lib/
|   +-- supabase.ts          # Supabase client
|   +-- crypto.ts            # SHA-256, canonicalization
|   +-- location.ts          # GPS acquisition
|   +-- image.ts             # Image processing utilities
|   +-- classifier.ts        # Color classifier
|
+-- services/
|   +-- tests.ts             # Test CRUD operations
|   +-- records.ts           # Record construction + sealing
|   +-- verification.ts      # Signature verification
|
+-- types/
|   +-- test.ts              # Test type definitions
|   +-- record.ts            # Record type definitions
|   +-- operator.ts          # Operator type definitions
|
+-- constants/
|   +-- colors.ts            # Design system colors
|   +-- config.ts            # App configuration
|
+-- assets/
+-- docs/
+-- package.json
```

## Design System

### Colors

```
Background:       #F7F9FC
Primary:          #172033
Secondary:        #526071
Success:          #16835B
Warning:          #B7791F
Danger:           #C53030
Border:           #DCE2EA
Accent:           #2457D6
Surface:          #FFFFFF
```

### Typography

- Primary: Inter
- Monospace: JetBrains Mono (for hashes, record IDs)

### Visual Language

The product should feel like **government/field operations software**, not an AI startup landing page.

- Deep navy, white, slate
- Lots of whitespace
- Small status indicators
- Clear hierarchy
- No neon gradients, glassmorphism, AI brain graphics, or excessive animations
