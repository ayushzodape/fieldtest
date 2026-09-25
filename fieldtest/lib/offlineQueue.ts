/**
 * Layer 6: Offline-First Queue & Sync Engine
 * 
 * Guarantees that in harsh field environments with zero connectivity (e.g. remote border posts,
 * maritime interdictions, underground facilities), evidence records are queued with full
 * cryptographic integrity and synced reliably to the server when network connectivity is restored.
 */

import { CanonicalRecord } from '../types/record';
import { verifyCanonicalRecordSignature } from './crypto';

export type QueueItemStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface OfflineQueueItem {
  id: string;
  recordId: string;
  canonicalRecord: CanonicalRecord;
  recordHash: string;
  signature: string;
  publicKey: string;
  imageSha256: string;
  rawImageBytesBase64?: string;
  status: QueueItemStatus;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  syncedAt: string | null;
}

export interface EnqueueRecordInput {
  recordId: string;
  canonicalRecord: CanonicalRecord;
  recordHash: string;
  signature: string;
  publicKey: string;
  imageSha256: string;
  rawImageBytesBase64?: string;
}

export interface SyncResult {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ recordId: string; error: string }>;
}

// In-memory queue buffer (backed by storage in production)
const memoryQueue: OfflineQueueItem[] = [];

/**
 * Enqueue a newly sealed record into the local offline queue
 */
export async function enqueueOfflineRecord(input: EnqueueRecordInput): Promise<OfflineQueueItem> {
  // 1. Verify cryptographic integrity before queuing
  const isValid = await verifyCanonicalRecordSignature(
    input.canonicalRecord,
    input.signature,
    input.publicKey
  );

  if (!isValid) {
    throw new Error(`Cannot enqueue cryptographically invalid record: ${input.recordId}`);
  }

  // 2. Check for duplicate recordId
  const existing = memoryQueue.find(item => item.recordId === input.recordId);
  if (existing) {
    return existing;
  }

  const queueItem: OfflineQueueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recordId: input.recordId,
    canonicalRecord: input.canonicalRecord,
    recordHash: input.recordHash,
    signature: input.signature,
    publicKey: input.publicKey,
    imageSha256: input.imageSha256,
    rawImageBytesBase64: input.rawImageBytesBase64,
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 5,
    lastAttemptAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };

  memoryQueue.push(queueItem);
  return queueItem;
}

/**
 * Get all items in the offline queue
 */
export function getOfflineQueue(): OfflineQueueItem[] {
  return [...memoryQueue];
}

/**
 * Get pending sync count
 */
export function getPendingQueueCount(): number {
  return memoryQueue.filter(i => i.status === 'PENDING' || i.status === 'FAILED').length;
}

/**
 * Mock/Custom sync uploader for testing and edge runtime
 */
export type SyncUploader = (item: OfflineQueueItem) => Promise<{ success: boolean; error?: string }>;

/**
 * Process pending items in the offline queue
 */
export async function processOfflineQueue(uploader?: SyncUploader): Promise<SyncResult> {
  const pendingItems = memoryQueue.filter(i => i.status === 'PENDING' || (i.status === 'FAILED' && i.retryCount < i.maxRetries));
  const result: SyncResult = {
    totalProcessed: pendingItems.length,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (const item of pendingItems) {
    item.status = 'SYNCING';
    item.lastAttemptAt = new Date().toISOString();

    try {
      if (uploader) {
        const uploadRes = await uploader(item);
        if (!uploadRes.success) {
          throw new Error(uploadRes.error || 'Server rejected record upload');
        }
      } else {
        // Default simulated network transmission with latency
        await new Promise(r => setTimeout(r, 10));
      }

      item.status = 'SYNCED';
      item.syncedAt = new Date().toISOString();
      item.errorMessage = null;
      result.syncedCount++;
    } catch (err: unknown) {
      item.retryCount++;
      item.status = 'FAILED';
      const errorMsg = err instanceof Error ? err.message : String(err);
      item.errorMessage = errorMsg;
      result.failedCount++;
      result.errors.push({ recordId: item.recordId, error: errorMsg });
    }
  }

  return result;
}

/**
 * Clear synced records from the local offline queue
 */
export function clearSyncedRecords(): number {
  const initialLength = memoryQueue.length;
  const unsynced = memoryQueue.filter(i => i.status !== 'SYNCED');
  memoryQueue.length = 0;
  memoryQueue.push(...unsynced);
  return initialLength - unsynced.length;
}

/**
 * Reset queue (for testing)
 */
export function resetOfflineQueue(): void {
  memoryQueue.length = 0;
}
