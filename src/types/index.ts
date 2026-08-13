/**
 * Khata Domain Types & Interface Definitions
 * Integer monetary units: All money amounts stored in integer paise (1 Rupee = 100 Paise)
 */

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  shopName: string;
  createdAt: string;
}

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  deviceId: string;
  user: User;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address?: string;
  rawBalance: number; // Integer paise (+ is You Will Get / Udhar, - is You Will Give / Jama)
  status: 'get' | 'give' | 'settled';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  customerId: string;
  type: 'gave' | 'got'; // gave = Udhar given, got = Jama payment received
  amount: number;       // Integer paise
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CashbookEntry {
  id: string;
  userId: string;
  type: 'in' | 'out'; // in = cash received, out = expense paid
  amount: number;     // Integer paise
  category: string;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface KitchenGroup {
  id: string;
  name: string;
  joinCode: string;
  createdBy: string;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenMember {
  id: string;
  groupId: string;
  userId: string;
  displayName: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'active' | 'paused' | 'left';
  joinedAt: string;
}

export interface KitchenDuty {
  id: string;
  groupId: string;
  title: string;
  assignedUserId: string;
  assignedUserName: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday...
  status: 'pending' | 'completed';
  completedAt?: string | null;
  updatedAt: string;
}

export interface KitchenExpense {
  id: string;
  groupId: string;
  paidByUserId: string;
  paidByUserName: string;
  title: string;
  amount: number; // Integer paise
  date: string;
  splitType: 'equal' | 'custom';
  createdAt: string;
  deletedAt?: string | null;
}

export type EntityType = 'customer' | 'transaction' | 'cashbook' | 'duty' | 'expense';
export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncOperation {
  operationId: string; // UUID v4 idempotency key
  deviceId: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  operationType: OperationType;
  payload: Record<string, any>;
  baseVersion: number;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
}

export interface DeviceMetadata {
  deviceId: string;
  userId: string;
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
  lastSeen: string;
  createdAt: string;
}
