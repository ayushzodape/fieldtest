import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().toLowerCase().replace(/^0x/, "");
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * RFC 8785 Canonical JSON Serialization
 */
function canonicalizeJson(obj: unknown): string {
  if (obj === undefined) return "";
  if (obj === null || typeof obj !== "object") {
    if (typeof obj === "number") {
      if (!Number.isFinite(obj)) throw new TypeError("Non-finite number in canonical record");
      return Object.is(obj, -0) ? "0" : obj.toString();
    }
    return JSON.stringify(obj);
  }
  if (typeof (obj as { toJSON?: () => unknown }).toJSON === "function") {
    return canonicalizeJson((obj as { toJSON: () => unknown }).toJSON());
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => (item === undefined ? "null" : canonicalizeJson(item))).join(",") + "]";
  }
  const record = obj as Record<string, unknown>;
  const validKeys = Object.keys(record)
    .filter((k) => record[k] !== undefined && typeof record[k] !== "function" && typeof record[k] !== "symbol")
    .sort();
  const pairs = validKeys.map((key) => JSON.stringify(key) + ":" + canonicalizeJson(record[key]));
  return "{" + pairs.join(",") + "}";
}

async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(hashBuffer));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { canonicalRecord, recordHash } = await req.json();

    if (!canonicalRecord || !recordHash) {
      return new Response(
        JSON.stringify({ error: "Missing canonicalRecord or recordHash in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify canonical digest match
    const canonicalString = canonicalizeJson(canonicalRecord);
    const computedHash = await sha256Hex(canonicalString);

    if (computedHash.toLowerCase() !== recordHash.toLowerCase()) {
      return new Response(
        JSON.stringify({
          error: "Record digest mismatch. Computed hash does not match claimed recordHash.",
          expected: recordHash,
          actual: computedHash,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch server HSM / Secret Key from Vault / Environment
    const secretKeyHex = Deno.env.get("FIELDTEST_SIGNING_KEY") ||
      "87042a92634e7bb45a7eb82eef1108ef91b5c2a129ef31885f83863ca6be48108227260ea8e7aa475ecdb3f6655e13d6a01655e218458d418959521087218ea6";

    const secretKeyBytes = hexToBytes(secretKeyHex);
    const keyPair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
    const publicKeyHex = bytesToHex(keyPair.publicKey);

    // 3. Detached Ed25519 signature
    const messageBytes = new TextEncoder().encode(canonicalString);
    const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
    const signature = bytesToHex(signatureBytes);

    return new Response(
      JSON.stringify({
        recordId: canonicalRecord.recordId,
        recordHash: computedHash,
        signature,
        publicKey: publicKeyHex,
        sealedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Sealing error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
