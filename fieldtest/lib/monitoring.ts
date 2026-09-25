/**
 * Layer 9: Monitoring, Telemetry & Security Diagnostics
 * 
 * Provides production-grade structured observability, crash reporting integration,
 * and security event telemetry while strictly preserving forensic confidentiality.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface TelemetryEvent {
  eventId: string;
  timestamp: string;
  level: LogLevel;
  category: 'SECURITY' | 'CLASSIFIER' | 'SYNC' | 'CRYPTO' | 'AUTH' | 'SYSTEM';
  message: string;
  metadata?: Record<string, unknown>;
  operatorBadge?: string;
  deviceInfo?: {
    platform: string;
    appVersion: string;
  };
}

// Local circular buffer storing the last 200 telemetry events for field diagnostics
const TELEMETRY_BUFFER: TelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 200;

let externalTelemetryHandler: ((event: TelemetryEvent) => void) | null = null;

/**
 * Configure external telemetry sink (e.g. Sentry / Datadog)
 */
export function setTelemetrySink(handler: (event: TelemetryEvent) => void): void {
  externalTelemetryHandler = handler;
}

/**
 * Emit structured telemetry event
 */
export function logTelemetry(
  level: LogLevel,
  category: TelemetryEvent['category'],
  message: string,
  metadata?: Record<string, unknown>,
  operatorBadge?: string
): TelemetryEvent {
  const event: TelemetryEvent = {
    eventId: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    metadata: sanitizeMetadata(metadata),
    operatorBadge,
    deviceInfo: {
      platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/React-Native',
      appVersion: '1.0.0',
    },
  };

  TELEMETRY_BUFFER.unshift(event);
  if (TELEMETRY_BUFFER.length > MAX_BUFFER_SIZE) {
    TELEMETRY_BUFFER.pop();
  }

  // Console output in dev/test
  if (level === 'ERROR' || level === 'CRITICAL') {
    console.error(`[${level}] [${category}] ${message}`, event.metadata);
  } else if (level === 'WARN') {
    console.warn(`[${level}] [${category}] ${message}`, event.metadata);
  }

  // Dispatch to external sink if configured
  if (externalTelemetryHandler) {
    try {
      externalTelemetryHandler(event);
    } catch (e) {
      console.warn('[Telemetry] Failed to dispatch to external sink:', e);
    }
  }

  return event;
}

/**
 * Sanitize metadata to prevent accidental leakage of sensitive keys
 */
function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized = { ...meta };
  const sensitiveKeys = ['privatekey', 'secretkey', 'pin', 'password', 'token'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

/**
 * Get in-memory diagnostic telemetry log
 */
export function getTelemetryLog(filter?: { level?: LogLevel; category?: TelemetryEvent['category'] }): TelemetryEvent[] {
  let list = [...TELEMETRY_BUFFER];
  if (filter?.level) {
    list = list.filter(e => e.level === filter.level);
  }
  if (filter?.category) {
    list = list.filter(e => e.category === filter.category);
  }
  return list;
}

/**
 * Clear telemetry log (for testing)
 */
export function clearTelemetryLog(): void {
  TELEMETRY_BUFFER.length = 0;
}
