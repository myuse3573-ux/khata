/**
 * server/db.js
 * SQLite database module — replaces flat data.db.json
 * Uses better-sqlite3 for synchronous, reliable, ACID-compliant storage
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "khata.db");
const JSON_LEGACY_PATH = path.join(__dirname, "data.db.json");

let db;

/** Initialize the database, run migrations, seed demo data */
export function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");    // WAL mode: better concurrency
  db.pragma("foreign_keys = ON");      // Enforce FK constraints
  db.pragma("synchronous = NORMAL");   // Balance durability vs speed

  createSchema();

  // Run migration from legacy JSON if needed
  if (fs.existsSync(JSON_LEGACY_PATH)) {
    const stats = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (stats.count === 0) {
      migrateFromJson();
    }
  }

  // Ensure demo user exists
  ensureDemoUser();

  console.log("✅ SQLite database initialized at:", DB_PATH);
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

/** Create all tables and indexes */
function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      business TEXT NOT NULL DEFAULT '{}',
      books TEXT NOT NULL DEFAULT '[]',
      customers TEXT NOT NULL DEFAULT '[]',
      transactions TEXT NOT NULL DEFAULT '[]',
      cashbook TEXT NOT NULL DEFAULT '[]',
      settings TEXT NOT NULL DEFAULT '{"lang":"en","pin":"","theme":"light"}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kitchen_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      join_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      max_members INTEGER NOT NULL DEFAULT 20,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kitchen_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES kitchen_groups(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('OWNER','ADMIN','MEMBER')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')),
      paused_by TEXT,
      paused_by_name TEXT,
      paused_at TEXT,
      joined_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kitchen_data (
      group_id TEXT PRIMARY KEY REFERENCES kitchen_groups(id) ON DELETE CASCADE,
      roster TEXT NOT NULL DEFAULT '[]',
      cashbook TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invite_tokens (
      token TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES kitchen_groups(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      used_count INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 50,
      revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_kitchen_members_group ON kitchen_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_kitchen_members_user ON kitchen_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_invite_group ON invite_tokens(group_id);
  `);

  // Ensure email column exists in users table & user_id column in kitchen_members allows NULL
  upgradeUsersTable();
  upgradeKitchenMembersTable();
}

/** Upgrade users table to add email column if missing & make phone nullable */
function upgradeUsersTable() {
  try {
    const cols = db.pragma("table_info(users)");
    const emailCol = cols.find(c => c.name === "email");
    if (!emailCol) {
      db.exec("ALTER TABLE users ADD COLUMN email TEXT");
      console.log("✅ Upgraded users table: added email column");
    }

    const phoneCol = cols.find(c => c.name === "phone");
    if (phoneCol && phoneCol.notnull === 1) {
      db.exec("PRAGMA foreign_keys = OFF");
      db.transaction(() => {
        db.exec(`
          CREATE TABLE users_tmp (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            shop_name TEXT NOT NULL,
            email TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO users_tmp SELECT id, phone, password_hash, name, shop_name, email, created_at FROM users;
          DROP TABLE users;
          ALTER TABLE users_tmp RENAME TO users;
          CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
      })();
      db.exec("PRAGMA foreign_keys = ON");
      console.log("✅ Upgraded users table: phone is now nullable for email-only registration");
    } else {
      db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
    }
  } catch (err) {
    console.warn("Users table upgrade check:", err.message);
  }
}

/**
 * Migration helper to update kitchen_members table if user_id was NOT NULL
 */
function upgradeKitchenMembersTable() {
  try {
    const cols = db.pragma("table_info(kitchen_members)");
    const userIdCol = cols.find(c => c.name === "user_id");
    if (userIdCol && userIdCol.notnull === 1) {
      db.exec("PRAGMA foreign_keys = OFF");
      db.transaction(() => {
        db.exec(`
          CREATE TABLE kitchen_members_tmp (
            id TEXT PRIMARY KEY,
            group_id TEXT NOT NULL REFERENCES kitchen_groups(id) ON DELETE CASCADE,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            display_name TEXT NOT NULL DEFAULT '',
            role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('OWNER','ADMIN','MEMBER')),
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')),
            joined_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO kitchen_members_tmp SELECT id, group_id, user_id, display_name, role, status, joined_at FROM kitchen_members;
          DROP TABLE kitchen_members;
          ALTER TABLE kitchen_members_tmp RENAME TO kitchen_members;
          CREATE INDEX IF NOT EXISTS idx_kitchen_members_group ON kitchen_members(group_id);
          CREATE INDEX IF NOT EXISTS idx_kitchen_members_user ON kitchen_members(user_id);
        `);
      })();
      db.exec("PRAGMA foreign_keys = ON");
      console.log("✅ Upgraded kitchen_members table: user_id is now nullable for guest/manual members");
    }
    // Ensure paused_by, paused_at, paused_by_name columns exist
    const updatedCols = db.pragma("table_info(kitchen_members)");
    if (!updatedCols.some(c => c.name === "paused_by")) {
      db.exec("ALTER TABLE kitchen_members ADD COLUMN paused_by TEXT");
    }
    if (!updatedCols.some(c => c.name === "paused_by_name")) {
      db.exec("ALTER TABLE kitchen_members ADD COLUMN paused_by_name TEXT");
    }
    if (!updatedCols.some(c => c.name === "paused_at")) {
      db.exec("ALTER TABLE kitchen_members ADD COLUMN paused_at TEXT");
    }
  } catch (err) {
    console.warn("Kitchen members table check:", err.message);
  }
}


/** Generate a random join code like "KHATA-A8F2" */
export function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KT-${code}`;
}

/** Generate a UUID-style ID */
export function generateId(prefix = "") {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Ensure the demo user exists with a proper bcrypt hash
 * Using a deterministic hash for demo: bcrypt("1234", 12)
 * We store it pre-computed to avoid slow startup
 */
function ensureDemoUser() {
  const existing = db.prepare("SELECT id, email FROM users WHERE id = 'usr_demo'").get();
  if (existing) {
    if (!existing.email) {
      db.prepare("UPDATE users SET email = 'demo@khata.com' WHERE id = 'usr_demo'").run();
    }
    return;
  }

  // Use LEGACY_PLAIN so the server accepts "1234" and auto-upgrades to bcrypt on first login.
  // This avoids maintaining a hardcoded bcrypt hash that could get stale.
  const DEMO_HASH = "LEGACY_PLAIN:1234";


  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, phone, email, password_hash, name, shop_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertData = db.prepare(`
    INSERT OR IGNORE INTO user_data (user_id, business, books, customers, transactions, cashbook, settings)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const demoBusiness = {
    id: "b_usr_demo",
    name: "Sharma Kirana & General Store",
    owner: "Rajesh Sharma",
    phone: "9876543210",
    address: "Shop No. 14, Main Market, Sector 5, New Delhi",
    upiId: "9876543210@paytm",
    gstin: "07AAAAA0000A1Z5",
    createdDate: new Date().toISOString()
  };

  const demoBooks = [
    { id: "book_demo_1", name: "Main Shop Khata", isDefault: true }
  ];

  db.transaction(() => {
    insertUser.run("usr_demo", "9876543210", "demo@khata.com", DEMO_HASH, "Rajesh Sharma", "Sharma Kirana & General Store");
    insertData.run(
      "usr_demo",
      JSON.stringify(demoBusiness),
      JSON.stringify(demoBooks),
      JSON.stringify([]),  // Empty customers — demo user starts clean
      JSON.stringify([]),  // Empty transactions
      JSON.stringify([]),  // Empty cashbook
      JSON.stringify({ lang: "en", pin: "", theme: "light" })
    );
  })();
}

/**
 * Migrate data from legacy data.db.json to SQLite
 * Creates a backup before migrating
 */
function migrateFromJson() {
  console.log("📦 Migrating from data.db.json to SQLite...");
  const logLines = [];
  const log = (msg) => {
    console.log(msg);
    logLines.push(`[${new Date().toISOString()}] ${msg}`);
  };

  try {
    // 1. Create backup
    const backupPath = `${JSON_LEGACY_PATH}.backup-${Date.now()}`;
    fs.copyFileSync(JSON_LEGACY_PATH, backupPath);
    log(`✅ Backup created: ${backupPath}`);

    const raw = fs.readFileSync(JSON_LEGACY_PATH, "utf-8");
    const legacy = JSON.parse(raw);

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, phone, password_hash, name, shop_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertData = db.prepare(`
      INSERT OR IGNORE INTO user_data (user_id, business, books, customers, transactions, cashbook, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertGroup = db.prepare(`
      INSERT OR IGNORE INTO kitchen_groups (id, name, join_code, created_by, max_members, created_at)
      VALUES (?, ?, ?, ?, 20, ?)
    `);
    const insertMember = db.prepare(`
      INSERT OR IGNORE INTO kitchen_members (id, group_id, user_id, display_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertKitchenData = db.prepare(`
      INSERT OR IGNORE INTO kitchen_data (group_id, roster, cashbook)
      VALUES (?, ?, ?)
    `);

    // 2. Migrate users
    const users = legacy.users || [];
    let migratedUsers = 0;

    db.transaction(() => {
      for (const user of users) {
        if (!user.id || !user.phone || !user.password) continue;

        // Convert plain-text password to a simple hash marker
        // We can't reverse plain-text to bcrypt without knowing the password
        // Strategy: mark as LEGACY_PLAIN: prefix, force reset on first login
        const passwordHash = `LEGACY_PLAIN:${user.password}`;

        insertUser.run(
          user.id,
          user.phone.replace(/[^0-9]/g, ""),
          passwordHash,
          user.name || "User",
          user.shopName || `${user.name || "User"}'s Khata`,
          user.createdDate || new Date().toISOString()
        );

        const uData = (legacy.userData || {})[user.id] || {};
        insertData.run(
          user.id,
          JSON.stringify(uData.business || {}),
          JSON.stringify(uData.books || []),
          JSON.stringify(uData.customers || []),
          JSON.stringify(uData.transactions || []),
          JSON.stringify(uData.cashbook || []),
          JSON.stringify(uData.settings || { lang: "en", pin: "", theme: "light" })
        );
        migratedUsers++;
      }
    })();
    log(`✅ Migrated ${migratedUsers} users`);

    // 3. Migrate kitchen groups
    const kitchenGroups = legacy.kitchenGroups || {};
    let migratedGroups = 0;

    db.transaction(() => {
      for (const [oldCode, groupData] of Object.entries(kitchenGroups)) {
        if (oldCode === "KITCHEN-491" && (!groupData.members || groupData.members.length === 0)) {
          log(`⏭️  Skipping empty global default group: ${oldCode}`);
          continue;
        }

        const newGroupId = generateId("kg");
        const newJoinCode = generateJoinCode();

        // Try to find creator — use first member's userId or first user in DB
        const firstUserId = users[0]?.id || "usr_demo";

        insertGroup.run(
          newGroupId,
          groupData.name || "Shared Kitchen",
          newJoinCode,
          firstUserId,
          groupData.createdDate || new Date().toISOString()
        );

        insertKitchenData.run(
          newGroupId,
          JSON.stringify(groupData.roster || []),
          JSON.stringify(groupData.cashbook || [])
        );

        if (Array.isArray(groupData.members)) {
          for (const m of groupData.members) {
            insertMember.run(
              generateId("km"),
              newGroupId,
              m.userId || null,
              m.name || m.displayName || "Member",
              m.role || "MEMBER",
              m.status || "active"
            );
          }
        }

        migratedGroups++;
        log(`✅ Migrated kitchen group "${oldCode}" → ${newGroupId} (new join code: ${newJoinCode})`);
      }
    })();
    log(`✅ Migrated ${migratedGroups} kitchen groups`);

    // 4. Mark JSON as migrated
    fs.renameSync(JSON_LEGACY_PATH, `${JSON_LEGACY_PATH}.migrated`);
    log("✅ data.db.json renamed to data.db.json.migrated");

    // 5. Write migration log
    fs.writeFileSync(path.join(__dirname, "migration.log"), logLines.join("\n") + "\n");
    log("📋 Migration log saved to server/migration.log");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.error("   The original data.db.json is untouched.");
  }
}

export default { initDatabase, getDb, generateId, generateJoinCode };
