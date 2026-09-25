import { generateBsaSection63Certificate, formatToIst, BsaCertificateData } from '../lib/bsaCertificate';
import { getVerificationQrUri } from '../lib/qrCode';
import { REAGENT_PROFILES, getReagentProfile } from '../lib/reagents';
import { PERSONNEL_REGISTRY, verifyBadgeNumber } from '../lib/auth';

console.log('[TEST] Running sih26231.test.ts (SIH-26231 PS & Section 63 BSA Compliance)...');

// 1. Test BSA Section 63 Certificate Generation
const mockCertData: BsaCertificateData = {
  recordId: 'FT-2026-000184',
  operatorBadge: 'OP-042',
  operatorName: 'Inspector R. Sharma',
  agency: 'Narcotics Control Bureau (NCB)',
  division: 'Field Interdiction Unit · Western Zone',
  capturedAtUtc: '2026-03-29T10:14:22.000Z',
  latitude: 19.0760,
  longitude: 72.8777,
  accuracyMeters: 4.2,
  reagentKit: 'marquis',
  result: 'PRESUMPTIVE_POSITIVE',
  confidence: 0.94,
  deltaEBlank: 58.4,
  deltaETarget: 3.2,
  imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  recordHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
  signature: 'deadbeef'.repeat(16),
  publicKey: 'cafebabe'.repeat(8),
  clockSkewSeconds: 0.8,
  serverReceivedAt: '2026-03-29T10:14:22.800Z',
  fixType: '3D Hardware GNSS'
};

const certText = generateBsaSection63Certificate(mockCertData);

// Check key statutory clauses
if (!certText.includes('SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023')) {
  throw new Error('Certificate missing Section 63 BSA header');
}
if (!certText.includes('SECTION 65B(4) OF THE INDIAN EVIDENCE ACT, 1872')) {
  throw new Error('Certificate missing Section 65B(4) IEA correlation clause');
}
if (!certText.includes('SIH-26231')) {
  throw new Error('Certificate missing SIH-26231 problem statement reference');
}
if (!certText.includes('Narcotics Control Bureau (NCB)')) {
  throw new Error('Certificate missing NCB agency reference');
}
if (!certText.includes('STATUTORY DISCLAIMER (NDPS COMPLIANCE)')) {
  throw new Error('Certificate missing NDPS presumptive disclaimer');
}
if (!certText.includes(mockCertData.recordHash)) {
  throw new Error('Certificate missing canonical record SHA-256 hash');
}
if (!certText.includes(mockCertData.signature)) {
  throw new Error('Certificate missing Ed25519 digital signature');
}

// Check IST time conversion
const istFormatted = formatToIst(mockCertData.capturedAtUtc);
if (!istFormatted.includes('2026')) {
  throw new Error('IST formatting failed');
}

console.log('[PASS] Section 63 BSA (2023) / Section 65B IEA Court Certificate generated and verified.');

// 2. Test QR Code Verification URL
const qrUri = getVerificationQrUri('FT-2026-000184');
if (!qrUri.includes('FT-2026-000184') || !qrUri.startsWith('https://api.qrserver.com/')) {
  throw new Error(`Invalid QR code URI generated: ${qrUri}`);
}
console.log('[PASS] Verification QR code generator verified.');

// 3. Test Duquenois-Levine reagent profile (Cannabis/Charas/Ganja)
const duquenois = getReagentProfile('duquenois');
if (!duquenois) {
  throw new Error('Duquenois-Levine reagent profile not found');
}
if (duquenois.name !== 'Duquenois-Levine Reagent') {
  throw new Error(`Unexpected name: ${duquenois.name}`);
}
if (!duquenois.targetAnalytes.includes('Cannabis') || !duquenois.targetAnalytes.some(t => t.includes('Charas'))) {
  throw new Error('Duquenois reagent targets missing Cannabis or Charas');
}
if (duquenois.thresholds.baselineDepartureMin !== 16.0) {
  throw new Error(`Unexpected threshold: ${duquenois.thresholds.baselineDepartureMin}`);
}
console.log('[PASS] Duquenois-Levine reagent profile for NDPS interdictions verified.');

// 4. Test Indian Enforcement Personnel in Registry
const ncbOperator = verifyBadgeNumber('OP-042');
if (!ncbOperator.isValid || ncbOperator.operator?.agency !== 'Narcotics Control Bureau (NCB)') {
  throw new Error('NCB Field Operator OP-042 verification failed');
}

const ncbSupervisor = verifyBadgeNumber('OP-108');
if (!ncbSupervisor.isValid || ncbSupervisor.operator?.division !== 'NCB Zonal Task Force · Mumbai') {
  throw new Error('NCB Supervisor OP-108 verification failed');
}

const cfslAuditor = verifyBadgeNumber('OP-007');
if (!cfslAuditor.isValid || cfslAuditor.operator?.agency !== 'Central Forensic Science Laboratory (CFSL)') {
  throw new Error('CFSL Auditor OP-007 verification failed');
}

console.log('[PASS] Indian Law Enforcement personnel directory verified.');
console.log('[PASS] All SIH-26231 Problem Statement and legal statutory tests passed successfully!\n');
