-- =============================================================================
-- Khata Application Production PostgreSQL Schema
-- Enforces Strict Data Scope Separation, Audit Logs, Soft Deletes & Idempotency
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(120),
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    shop_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER SESSIONS & REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DEVICES TABLE
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL DEFAULT 'android',
    app_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PERSONAL CUSTOMERS TABLE (Scope: userId)
CREATE TABLE IF NOT EXISTS personal_customers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    raw_balance BIGINT DEFAULT 0, -- Stored in integer paise (1 Rupee = 100 Paise)
    status VARCHAR(20) DEFAULT 'settled',
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_user ON personal_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON personal_customers(deleted_at);

-- 5. PERSONAL TRANSACTIONS TABLE (Scope: userId)
CREATE TABLE IF NOT EXISTS personal_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES personal_customers(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('gave', 'got')),
    amount BIGINT NOT NULL, -- Stored in integer paise
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_user_customer ON personal_transactions(user_id, customer_id);

-- 6. PERSONAL CASHBOOK TABLE (Scope: userId)
CREATE TABLE IF NOT EXISTS personal_cashbook (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
    amount BIGINT NOT NULL, -- Stored in integer paise
    category VARCHAR(50) DEFAULT 'General',
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_cashbook_user ON personal_cashbook(user_id);

-- 7. KITCHEN GROUPS TABLE (Scope: groupId)
CREATE TABLE IF NOT EXISTS kitchen_groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    join_code VARCHAR(20) UNIQUE NOT NULL,
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    max_members INT DEFAULT 20,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kitchen_code ON kitchen_groups(join_code);

-- 8. KITCHEN MEMBERS TABLE (Scope: groupId & userId)
CREATE TABLE IF NOT EXISTS kitchen_members (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL REFERENCES kitchen_groups(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_group_user ON kitchen_members(group_id, user_id);

-- 9. KITCHEN DUTIES TABLE (Scope: groupId)
CREATE TABLE IF NOT EXISTS kitchen_duties (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL REFERENCES kitchen_groups(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    assigned_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    assigned_user_name VARCHAR(100) NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    version INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. KITCHEN EXPENSES TABLE (Scope: groupId)
CREATE TABLE IF NOT EXISTS kitchen_expenses (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL REFERENCES kitchen_groups(id) ON DELETE CASCADE,
    paid_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    paid_by_user_name VARCHAR(100) NOT NULL,
    title VARCHAR(120) NOT NULL,
    amount BIGINT NOT NULL, -- Stored in integer paise
    split_type VARCHAR(20) DEFAULT 'equal',
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 11. SYNC OPERATIONS (Idempotency Log)
CREATE TABLE IF NOT EXISTS sync_operations (
    operation_id VARCHAR(64) PRIMARY KEY, -- Idempotency UUID v4
    device_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    operation_type VARCHAR(10) NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_op_user ON sync_operations(user_id, operation_id);

-- 12. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
