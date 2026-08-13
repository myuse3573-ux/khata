import { LocalDb } from './localDb';
import { NativeStorage } from './nativeStorage';
import { SyncOperation, EntityType, OperationType } from '../types';
import { getApiBaseUrl } from '../config/api';

let isSyncing = false;

export const SyncEngine = {
  /**
   * Enqueue a new offline-first operation into Local SQLite and trigger sync
   */
  async enqueueOperation(
    userId: string,
    entityType: EntityType,
    entityId: string,
    operationType: OperationType,
    payload: Record<string, any>
  ): Promise<void> {
    const deviceId = (await NativeStorage.getAccessToken()) ? 'android_device_main' : 'android_device';
    const op: SyncOperation = {
      operationId: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      deviceId,
      userId,
      entityType,
      entityId,
      operationType,
      payload,
      baseVersion: payload.version || 1,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    await LocalDb.enqueueSyncOp(op);
    this.triggerSync(userId);
  },

  /**
   * Process pending sync queue items idempotently against the backend
   */
  async triggerSync(userId: string): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const pendingOps = await LocalDb.getPendingSyncOps(userId);
      if (pendingOps.length === 0) {
        isSyncing = false;
        return;
      }

      const token = await NativeStorage.getAccessToken();
      if (!token) {
        isSyncing = false;
        return;
      }

      // Batch push pending operations to server with idempotency keys
      const res = await fetch(`${getApiBaseUrl()}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ operations: pendingOps })
      });

      if (res.ok) {
        const data = await res.json();
        const syncedOpIds: string[] = data.syncedOperationIds || [];
        for (const opId of syncedOpIds) {
          await LocalDb.markSyncOpComplete(opId);
        }
      }
    } catch (err) {
      console.log('Sync push postponed (offline mode):', err);
    } finally {
      isSyncing = false;
    }
  }
};
