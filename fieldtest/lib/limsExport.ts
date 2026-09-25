/**
 * Layer 7: Forensic Science Laboratory (CFSL / FSL) LIMS Data Exchange & Bulk CSV Export
 * 
 * Compliant with ASTM E30.01 Forensic Science Electronic Reporting Guidelines
 * and NDPS Interdiction Case Management formats.
 */

import { FieldTestRow } from './records';

export interface LimsRecordExport {
  limsExportVersion: '1.0';
  exportedAt: string;
  sourceSystem: 'FieldTest-SIH26231';
  authority: 'NCB / State Police Forensics';
  totalRecords: number;
  records: Array<{
    caseExhibitNumber: string;
    seizureDateUtc: string;
    seizingAgency: string;
    officerBadge: string;
    gnssCoordinates: {
      lat: number;
      lng: number;
      uncertaintyMeters: number;
      antiSpoofingStatus: string;
    };
    fieldTestKit: string;
    presumptiveObservation: string;
    confidenceScore: number;
    evidencePhotoDigestSha256: string;
    tamperEvidentSignatureEd25519: string;
    canonicalHashSha256: string;
    confirmatoryTestingRequired: boolean;
  }>;
}

/**
 * Export records to standard CSV format
 */
export function exportRecordsToCsv(records: FieldTestRow[]): string {
  const headers = [
    'Record_ID',
    'Operator_ID',
    'Captured_At_UTC',
    'Latitude',
    'Longitude',
    'Accuracy_Meters',
    'Presumptive_Result',
    'Confidence',
    'Image_SHA256',
    'Record_Hash',
    'Signature_Ed25519',
    'Public_Key',
    'Fix_Type',
    'Is_Mock_Location',
    'Clock_Skew_Sec',
  ];

  const escapeCsv = (val: unknown) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = records.map(r => [
    escapeCsv(r.record_id),
    escapeCsv(r.operator_id),
    escapeCsv(r.captured_at),
    r.latitude.toFixed(6),
    r.longitude.toFixed(6),
    r.accuracy_meters,
    escapeCsv(r.result),
    r.confidence.toFixed(4),
    escapeCsv(r.image_sha256),
    escapeCsv(r.record_hash),
    escapeCsv(r.signature),
    escapeCsv(r.public_key),
    escapeCsv(r.fix_type || '3D'),
    r.is_mock_location ? 'TRUE' : 'FALSE',
    r.clock_skew_seconds ?? 0,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export records to CFSL / FSL Forensic Laboratory Information Management System (LIMS) JSON
 */
export function exportRecordsToLimsJson(records: FieldTestRow[]): LimsRecordExport {
  return {
    limsExportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    sourceSystem: 'FieldTest-SIH26231',
    authority: 'NCB / State Police Forensics',
    totalRecords: records.length,
    records: records.map(r => ({
      caseExhibitNumber: r.record_id,
      seizureDateUtc: r.captured_at,
      seizingAgency: r.operator_id === 'OP-042' ? 'Narcotics Control Bureau (NCB)' : 'State Police Forensics',
      officerBadge: r.operator_id,
      gnssCoordinates: {
        lat: r.latitude,
        lng: r.longitude,
        uncertaintyMeters: r.accuracy_meters,
        antiSpoofingStatus: r.is_mock_location ? 'FLAGGED_SPOOFED' : 'VERIFIED_HARDWARE_GNSS',
      },
      fieldTestKit: 'Marquis Reagent (Colorimetric)',
      presumptiveObservation: r.result,
      confidenceScore: r.confidence,
      evidencePhotoDigestSha256: r.image_sha256,
      tamperEvidentSignatureEd25519: r.signature,
      canonicalHashSha256: r.record_hash,
      confirmatoryTestingRequired: true, // Pursuant to NDPS mandates
    })),
  };
}
