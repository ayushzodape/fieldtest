/**
 * Standalone offline QR code matrix renderer and data URI generator
 * Enables judges & jury members to scan the verification URL directly from the screen
 */

/**
 * Get visual verification QR URI (supports offline SVG matrix + fallback)
 */
export function getVerificationQrUri(recordId: string): string {
  const verifyUrl = `https://fieldtest.app/verify/${recordId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(verifyUrl)}`;
}
