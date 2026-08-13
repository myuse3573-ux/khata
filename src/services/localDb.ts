import * as SQLite from 'expo-sqlite';
import { Customer, Transaction, CashbookEntry, KitchenGroup, KitchenMember, KitchenDuty, SyncOperation } from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const LocalDb = {
  async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (dbInstance) return dbInstance;
    dbInstance = await SQLite.openDatabaseAsync('khata_local.db');
    await this.initSchema(dbInstance);
    return dbInstance;
  },

  async initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS local_customers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        raw_balance INTEGER DEFAULT 0,
        status TEXT DEFAULT 'settled',
        version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS local_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        notes TEXT,
        date TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS local_cashbook (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category TEXT DEFAULT 'General',
        notes TEXT,
        date TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS local_kitchen_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        join_code TEXT UNIQUE NOT NULL,
        created_by TEXT NOT NULL,
        max_members INTEGER DEFAULT 20,
        version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_kitchen_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        joined_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_kitchen_duties (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        title TEXT NOT NULL,
        assigned_user_id TEXT NOT NULL,
        assigned_user_name TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        completed_at TEXT,
        version INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_kitchen_expenses (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        paid_by_user_id TEXT NOT NULL,
        paid_by_user_name TEXT NOT NULL,
        title TEXT NOT NULL,
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        split_type TEXT DEFAULT 'equal',
        version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        operation_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        base_version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending'
      );
    `);
  },

  // ─── CUSTOMERS (Scope: userId) ──────────────────────────────────────────────

  async getCustomers(userId: string): Promise<Customer[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM local_customers WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [userId]
    );
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      phone: r.phone,
      address: r.address || '',
      rawBalance: r.raw_balance,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async saveCustomer(customer: Customer): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_customers (id, user_id, name, phone, address, raw_balance, status, version, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.userId,
        customer.name,
        customer.phone,
        customer.address || '',
        customer.rawBalance,
        customer.status,
        1,
        customer.createdAt,
        customer.updatedAt,
        customer.deletedAt || null
      ]
    );
  },

  // ─── TRANSACTIONS (Scope: userId) ───────────────────────────────────────────

  async getTransactions(userId: string): Promise<Transaction[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM local_transactions WHERE user_id = ? AND deleted_at IS NULL ORDER BY date DESC`,
      [userId]
    );
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      customerId: r.customer_id,
      type: r.type,
      amount: r.amount,
      notes: r.notes || '',
      date: r.date,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async saveTransaction(tx: Transaction): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_transactions (id, user_id, customer_id, type, amount, notes, date, version, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.userId,
        tx.customerId,
        tx.type,
        tx.amount,
        tx.notes || '',
        tx.date,
        1,
        tx.createdAt,
        tx.updatedAt,
        tx.deletedAt || null
      ]
    );
  },

  // ─── CASHBOOK (Scope: userId) ───────────────────────────────────────────────

  async getCashbook(userId: string): Promise<CashbookEntry[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM local_cashbook WHERE user_id = ? AND deleted_at IS NULL ORDER BY date DESC`,
      [userId]
    );
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      amount: r.amount,
      category: r.category || 'General',
      notes: r.notes || '',
      date: r.date,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async saveCashbookEntry(entry: CashbookEntry): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_cashbook (id, user_id, type, amount, category, notes, date, version, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.userId,
        entry.type,
        entry.amount,
        entry.category || 'General',
        entry.notes || '',
        entry.date,
        1,
        entry.createdAt,
        entry.updatedAt,
        entry.deletedAt || null
      ]
    );
  },

  // ─── SYNC QUEUE (Idempotent Operation Queue) ────────────────────────────────

  async enqueueSyncOp(op: SyncOperation): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_queue (operation_id, device_id, user_id, entity_type, entity_id, operation_type, payload, base_version, created_at, retry_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        op.operationId,
        op.deviceId,
        op.userId,
        op.entityType,
        op.entityId,
        op.operationType,
        JSON.stringify(op.payload),
        op.baseVersion,
        op.createdAt,
        op.retryCount,
        op.status
      ]
    );
  },

  async getPendingSyncOps(userId: string): Promise<SyncOperation[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue WHERE user_id = ? AND status = 'pending' ORDER BY created_at ASC`,
      [userId]
    );
    return rows.map(r => ({
      operationId: r.operation_id,
      deviceId: r.device_id,
      userId: r.user_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      operationType: r.operation_type,
      payload: JSON.parse(r.payload),
      baseVersion: r.base_version,
      createdAt: r.created_at,
      retryCount: r.retry_count,
      status: r.status
    }));
  },

  async markSyncOpComplete(operationId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`UPDATE sync_queue SET status = 'synced' WHERE operation_id = ?`, [operationId]);
  },

  /** Account Reset — Purge unauthenticated user local scope */
  async clearUserLocalData(userId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM local_customers WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM local_transactions WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM local_cashbook WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM sync_queue WHERE user_id = ?`, [userId]);
  }
};
