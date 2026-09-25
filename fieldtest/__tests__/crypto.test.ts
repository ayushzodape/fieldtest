import assert from 'node:assert';
import { canonicalizeJson, validateTimestampSkew } from '../lib/crypto.ts';

console.log('[TEST] Running crypto.test.ts...');

// 1. undefined handling in objects
const objWithUndefined = { a: 1, b: undefined, c: 'hello' };
const res1 = canonicalizeJson(objWithUndefined);
assert.strictEqual(res1, '{"a":1,"c":"hello"}', 'Must omit undefined object properties');
JSON.parse(res1); // Must be valid JSON

// 2. undefined handling in arrays
const arrWithUndefined = [1, undefined, 'test'];
const res2 = canonicalizeJson(arrWithUndefined);
assert.strictEqual(res2, '[1,null,"test"]', 'Must convert undefined in arrays to null');
JSON.parse(res2); // Must be valid JSON

// 3. Date / toJSON serialization
const now = new Date('2026-09-24T17:11:32.000Z');
const res3 = canonicalizeJson({ timestamp: now });
assert.strictEqual(res3, '{"timestamp":"2026-09-24T17:11:32.000Z"}', 'Must serialize Date using toJSON');

// 4. -0 normalized to 0
assert.strictEqual(canonicalizeJson(-0), '0', 'Must serialize -0 as 0');
assert.strictEqual(canonicalizeJson({ zero: -0 }), '{"zero":0}', 'Must serialize -0 as 0 inside objects');

// 5. Deterministic key sorting
const unsorted = { z: 1, a: 2, m: { b: 1, a: 2 } };
const res5 = canonicalizeJson(unsorted);
assert.strictEqual(res5, '{"a":2,"m":{"a":2,"b":1},"z":1}', 'Must recursively sort keys');

// 6. Non-finite numbers should throw
assert.throws(() => canonicalizeJson(NaN), TypeError, 'Must throw on NaN');
assert.throws(() => canonicalizeJson(Infinity), TypeError, 'Must throw on Infinity');

// 7. Temporal Integrity / Clock Skew Check
const timeValid = validateTimestampSkew('2026-09-24T12:00:00Z', '2026-09-24T12:01:00Z', 120);
assert.strictEqual(timeValid.isValid, true, '60s skew within 120s limit must be valid');

const timeSkewed = validateTimestampSkew('2026-09-24T12:00:00Z', '2026-09-24T12:05:00Z', 120);
assert.strictEqual(timeSkewed.isValid, false, '300s skew must fail skew validation');
assert.ok(timeSkewed.reason.includes('Clock skew violation'), 'Reason must state clock skew violation');

console.log('[PASS] All crypto and temporal integrity tests passed successfully!');
