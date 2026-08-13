/**
 * server/server.js — Complete rebuild
 * Khata Multi-User API Server
 *
 * Security: bcrypt passwords, JWT tokens, rate limiting, auth middleware
 * Data: SQLite via better-sqlite3 (replaces flat JSON file)
 * Real-time: Server-Sent Events for kitchen group sync
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { initDatabase, getDb, generateId, generateJoinCode } from "./db.js";
import { generateToken, authenticateToken, requireKitchenMember } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Rate limiters — protect auth endpoints from brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: "Too many attempts. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: "Too many requests." }
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

// ─── Initialize Database ───────────────────────────────────────────────────────
initDatabase();
const db = getDb();

// ─── SSE connections store (real-time kitchen updates) ────────────────────────
const sseClients = new Map(); // groupId → Set of response objects

function broadcastToGroup(groupId, eventData) {
  const clients = sseClients.get(groupId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Safe JSON parse with fallback */
function safeParse(str, fallback) {
  try { return JSON.parse(str) || fallback; }
  catch { return fallback; }
}

/** Build safe user object (no password hash) */
/** Build safe user object (no password hash) */
function safeUser(user) {
  return { id: user.id, name: user.name, phone: user.phone || "", email: user.email || "", shopName: user.shop_name };
}

/** Validate & sanitize string input */
function validateStr(val, name, maxLen = 200) {
  if (typeof val !== "string") return `${name} must be a string`;
  if (!val.trim()) return `${name} is required`;
  if (val.length > maxLen) return `${name} must be under ${maxLen} characters`;
  return null;
}

/**
 * Handle legacy plain-text passwords from migration.
 * Migrated passwords are stored as "LEGACY_PLAIN:password"
 * On successful legacy login, we rehash and store bcrypt
 */
async function checkPassword(input, storedHash) {
  if (storedHash.startsWith("LEGACY_PLAIN:")) {
    const legacyPass = storedHash.slice("LEGACY_PLAIN:".length);
    if (input !== legacyPass) return false;
    return true; // Will be rehashed after login
  }
  return bcrypt.compare(input, storedHash);
}

// ─── AUTH ENDPOINTS ───────────────────────────────────────────────────────────

/** POST /api/auth/register */
app.post("/api/auth/register", async (req, res) => {
  const { phone, email, password, name, shopName } = req.body;

  const errName = validateStr(name, "Name", 100);
  const errPass = validateStr(password, "Password", 50);
  if (errName) return res.status(400).json({ error: errName });
  if (errPass) return res.status(400).json({ error: errPass });

  const cleanPhone = phone && phone.replace(/[^0-9]/g, "") ? phone.replace(/[^0-9]/g, "") : null;
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

  if (!cleanPhone && !cleanEmail) {
    return res.status(400).json({ error: "Please enter an email address or mobile phone number." });
  }
  if (cleanEmail && (!cleanEmail.includes("@") || !cleanEmail.includes("."))) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (cleanPhone && cleanPhone.length < 6) {
    return res.status(400).json({ error: "Please enter a valid phone number." });
  }
  if (password.trim().length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters." });
  }

  // Check uniqueness
  if (cleanPhone) {
    const existingPhone = db.prepare("SELECT id FROM users WHERE phone = ?").get(cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ error: "An account with this phone number already exists. Please log in." });
    }
  }
  if (cleanEmail) {
    const existingEmail = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)").get(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: "An account with this email address already exists. Please log in." });
    }
  }

  const passwordHash = await bcrypt.hash(password.trim(), 12);
  const userId = generateId("usr");
  const cleanShopName = shopName?.trim() || `${name.trim()}'s Khata`;

  const insertUser = db.prepare(`
    INSERT INTO users (id, phone, email, password_hash, name, shop_name) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertData = db.prepare(`
    INSERT INTO user_data (user_id, business, books, settings) VALUES (?, ?, ?, ?)
  `);

  const initialBusiness = {
    id: `b_${userId}`,
    name: cleanShopName,
    owner: name.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    address: "",
    upiId: "",
    gstin: "",
    createdDate: new Date().toISOString()
  };
  const initialBooks = [{ id: `book_${userId}_1`, name: "Main Khata", isDefault: true }];

  db.transaction(() => {
    insertUser.run(userId, cleanPhone, cleanEmail, passwordHash, name.trim(), cleanShopName);
    insertData.run(
      userId,
      JSON.stringify(initialBusiness),
      JSON.stringify(initialBooks),
      JSON.stringify({ lang: "en", pin: "", theme: "light" })
    );
  })();

  const token = generateToken(userId);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

  res.status(201).json({
    status: "success",
    message: "Account created successfully!",
    token,
    user: safeUser(user)
  });
});

/** POST /api/auth/login */
app.post("/api/auth/login", async (req, res) => {
  const { phone, email, identifier, password } = req.body;
  const loginInput = (identifier || email || phone || "").trim();

  if (!loginInput || !password) {
    return res.status(400).json({ error: "Email/phone and password are required." });
  }

  let user;
  if (loginInput.includes("@")) {
    user = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(loginInput.toLowerCase());
  } else {
    const cleanDigits = loginInput.replace(/[^0-9]/g, "");
    user = db.prepare("SELECT * FROM users WHERE phone = ? OR LOWER(email) = LOWER(?)").get(cleanDigits || loginInput, loginInput.toLowerCase());
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid email/phone or password." });
  }

  const isValid = await checkPassword(password.trim(), user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid email/phone or password." });
  }

  // Rehash legacy plain-text passwords to bcrypt on successful login
  if (user.password_hash.startsWith("LEGACY_PLAIN:")) {
    const newHash = await bcrypt.hash(password.trim(), 12);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);
  }

  // Ensure user_data row exists
  const hasData = db.prepare("SELECT user_id FROM user_data WHERE user_id = ?").get(user.id);
  if (!hasData) {
    const initialBusiness = {
      id: `b_${user.id}`,
      name: user.shop_name,
      owner: user.name,
      phone: user.phone || "",
      email: user.email || "",
      address: "",
      upiId: "",
      gstin: "",
      createdDate: new Date().toISOString()
    };
    const initialBooks = [{ id: `book_${user.id}_1`, name: "Main Khata", isDefault: true }];
    db.prepare(`INSERT INTO user_data (user_id, business, books) VALUES (?, ?, ?)`)
      .run(user.id, JSON.stringify(initialBusiness), JSON.stringify(initialBooks));
  }

  const token = generateToken(user.id);

  res.json({
    status: "success",
    message: "Login successful!",
    token,
    user: safeUser(user)
  });
});

/** POST /api/auth/forgot-password — Request password reset OTP */
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email, phone, identifier } = req.body;
  const input = (identifier || email || phone || "").trim();

  if (!input) {
    return res.status(400).json({ error: "Please enter your registered email address or phone number." });
  }

  let user;
  if (input.includes("@")) {
    user = db.prepare("SELECT * FROM users WHERE email IS NOT NULL AND LOWER(email) = LOWER(?)").get(input.toLowerCase());
  } else {
    const cleanDigits = input.replace(/[^0-9]/g, "");
    if (cleanDigits) {
      user = db.prepare("SELECT * FROM users WHERE phone = ? OR (email IS NOT NULL AND LOWER(email) = LOWER(?))").get(cleanDigits, input.toLowerCase());
    } else {
      user = db.prepare("SELECT * FROM users WHERE email IS NOT NULL AND LOWER(email) = LOWER(?)").get(input.toLowerCase());
    }
  }

  if (!user) {
    return res.status(404).json({ error: "No registered account found with that email/phone number." });
  }

  // Generate 6-digit OTP valid for 15 minutes
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const resetId = generateId("pr");

  db.prepare(`
    INSERT INTO password_resets (id, user_id, otp, expires_at)
    VALUES (?, ?, ?, datetime('now', '+15 minutes'))
  `).run(resetId, user.id, otp);

  res.json({
    status: "success",
    message: `Password reset OTP generated for ${user.email || user.phone}! Use OTP: ${otp}`,
    otp,
    user: safeUser(user)
  });
});

/** POST /api/auth/reset-password — Reset password using OTP */
app.post("/api/auth/reset-password", async (req, res) => {
  const { identifier, otp, newPassword } = req.body;
  const input = (identifier || "").trim();

  if (!input || !otp || !newPassword) {
    return res.status(400).json({ error: "Email/phone, OTP code, and new password are required." });
  }
  if (newPassword.trim().length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters." });
  }

  let user;
  if (input.includes("@")) {
    user = db.prepare("SELECT * FROM users WHERE email IS NOT NULL AND LOWER(email) = LOWER(?)").get(input.toLowerCase());
  } else {
    const cleanDigits = input.replace(/[^0-9]/g, "");
    if (cleanDigits) {
      user = db.prepare("SELECT * FROM users WHERE phone = ? OR (email IS NOT NULL AND LOWER(email) = LOWER(?))").get(cleanDigits, input.toLowerCase());
    } else {
      user = db.prepare("SELECT * FROM users WHERE email IS NOT NULL AND LOWER(email) = LOWER(?)").get(input.toLowerCase());
    }
  }

  if (!user) {
    return res.status(404).json({ error: "No account found." });
  }

  // Check for active valid OTP
  const resetRecord = db.prepare(`
    SELECT * FROM password_resets
    WHERE user_id = ? AND otp = ? AND used = 0 AND datetime(expires_at) > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(user.id, otp.trim());

  if (!resetRecord) {
    return res.status(400).json({ error: "Invalid or expired OTP code. Please request a new OTP." });
  }

  // Mark OTP as used and update user's password hash
  const newHash = await bcrypt.hash(newPassword.trim(), 12);
  db.transaction(() => {
    db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(resetRecord.id);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);
  })();

  res.json({
    status: "success",
    message: "Password reset successful! You can now log in with your new password."
  });
});

/** GET /api/auth/me — validate token and return current user */
app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ status: "success", user: safeUser(user) });
});

/** POST /api/auth/change-password */
app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required." });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const isValid = await checkPassword(currentPassword.trim(), user.password_hash);
  if (!isValid) return res.status(401).json({ error: "Current password is incorrect." });

  const newHash = await bcrypt.hash(newPassword.trim(), 12);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, req.userId);
  res.json({ status: "success", message: "Password updated successfully." });
});

// ─── PERSONAL DATA ENDPOINTS ──────────────────────────────────────────────────
// userId is ALWAYS extracted from the JWT token — never from request body/query

/** GET /api/personal — fetch authenticated user's full data */
app.get("/api/personal", authenticateToken, (req, res) => {
  const row = db.prepare("SELECT * FROM user_data WHERE user_id = ?").get(req.userId);
  if (!row) return res.status(404).json({ error: "User data not found." });

  res.json({
    status: "success",
    database: {
      business: safeParse(row.business, {}),
      books: safeParse(row.books, []),
      customers: safeParse(row.customers, []),
      transactions: safeParse(row.transactions, []),
      cashbook: safeParse(row.cashbook, []),
      settings: safeParse(row.settings, { lang: "en", pin: "", theme: "light" })
    }
  });
});

/** POST /api/personal/sync — save user's data */
app.post("/api/personal/sync", authenticateToken, (req, res) => {
  const allowed = ["business", "books", "customers", "transactions", "cashbook", "settings"];
  const updates = {};
  const setClauses = [];
  const values = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (typeof req.body[key] !== "object" && !Array.isArray(req.body[key])) {
        return res.status(400).json({ error: `Invalid data for field: ${key}` });
      }
      updates[key] = req.body[key];
      setClauses.push(`${key} = ?`);
      values.push(JSON.stringify(req.body[key]));
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(req.userId);

  db.prepare(`
    UPDATE user_data SET ${setClauses.join(", ")} WHERE user_id = ?
  `).run(...values);

  res.json({ status: "success", message: "Data synchronized." });
});

// ─── KITCHEN GROUP ENDPOINTS ──────────────────────────────────────────────────

/** POST /api/kitchen/create — create a new kitchen group */
app.post("/api/kitchen/create", authenticateToken, (req, res) => {
  const { name } = req.body;
  const err = validateStr(name, "Group name", 100);
  if (err) return res.status(400).json({ error: err });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);

  // Check user isn't already in too many groups
  const memberCount = db.prepare("SELECT COUNT(*) as c FROM kitchen_members WHERE user_id = ?").get(req.userId);
  if (memberCount.c >= 10) {
    return res.status(400).json({ error: "You can be a member of at most 10 kitchen groups." });
  }

  const groupId = generateId("kg");
  let joinCode = generateJoinCode();

  // Ensure unique join code
  while (db.prepare("SELECT id FROM kitchen_groups WHERE join_code = ?").get(joinCode)) {
    joinCode = generateJoinCode();
  }

  const memberId = generateId("km");

  db.transaction(() => {
    db.prepare(`
      INSERT INTO kitchen_groups (id, name, join_code, created_by, max_members)
      VALUES (?, ?, ?, ?, 20)
    `).run(groupId, name.trim(), joinCode, req.userId);

    db.prepare(`
      INSERT INTO kitchen_members (id, group_id, user_id, display_name, role)
      VALUES (?, ?, ?, ?, 'OWNER')
    `).run(memberId, groupId, req.userId, user.name);

    db.prepare(`
      INSERT INTO kitchen_data (group_id, roster, cashbook)
      VALUES (?, '[]', '[]')
    `).run(groupId);
  })();

  const group = db.prepare("SELECT * FROM kitchen_groups WHERE id = ?").get(groupId);

  res.status(201).json({
    status: "success",
    message: "Kitchen group created!",
    group: {
      id: group.id,
      name: group.name,
      joinCode: group.join_code,
      role: "OWNER",
      maxMembers: group.max_members
    }
  });
});

/** POST /api/kitchen/join — join a group using an invite code */
app.post("/api/kitchen/join", authenticateToken, (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode?.trim()) return res.status(400).json({ error: "Join code is required." });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const cleanCode = joinCode.trim().toUpperCase();

  // Find group by join_code
  const group = db.prepare("SELECT * FROM kitchen_groups WHERE join_code = ?").get(cleanCode);
  if (!group) {
    return res.status(404).json({ error: "No kitchen group found with that code. Check the code and try again." });
  }

  // Check already a member
  const alreadyMember = db.prepare(
    "SELECT id FROM kitchen_members WHERE group_id = ? AND user_id = ?"
  ).get(group.id, req.userId);
  if (alreadyMember) {
    return res.status(400).json({ error: "You are already a member of this kitchen group." });
  }

  // No member limit — unlimited roommates can join


  const memberId = generateId("km");
  db.prepare(`
    INSERT INTO kitchen_members (id, group_id, user_id, display_name, role)
    VALUES (?, ?, ?, ?, 'MEMBER')
  `).run(memberId, group.id, req.userId, user.name);

  // Broadcast new member event
  broadcastToGroup(group.id, {
    event: "member_joined",
    member: { userId: req.userId, name: user.name, role: "MEMBER" }
  });

  res.json({
    status: "success",
    message: `Joined "${group.name}" successfully!`,
    group: {
      id: group.id,
      name: group.name,
      joinCode: group.join_code,
      role: "MEMBER",
      maxMembers: group.max_members
    }
  });
});

/** GET /api/kitchen/my-groups — list groups the user belongs to */
app.get("/api/kitchen/my-groups", authenticateToken, (req, res) => {
  const memberships = db.prepare(`
    SELECT kg.id, kg.name, kg.join_code, kg.max_members, kg.created_at,
           km.role, km.status,
           (SELECT COUNT(*) FROM kitchen_members WHERE group_id = kg.id) as member_count
    FROM kitchen_groups kg
    JOIN kitchen_members km ON km.group_id = kg.id
    WHERE km.user_id = ?
    ORDER BY kg.created_at DESC
  `).all(req.userId);

  res.json({
    status: "success",
    groups: memberships.map(g => ({
      id: g.id,
      name: g.name,
      joinCode: g.join_code,
      role: g.role,
      status: g.status,
      maxMembers: g.max_members,
      memberCount: g.member_count
    }))
  });
});

/** GET /api/kitchen/:groupId — fetch kitchen group data */
app.get("/api/kitchen/:groupId", authenticateToken, requireKitchenMember(), (req, res) => {
  const groupId = req.kitchenGroupId;

  const group = db.prepare("SELECT * FROM kitchen_groups WHERE id = ?").get(groupId);
  const kData = db.prepare("SELECT * FROM kitchen_data WHERE group_id = ?").get(groupId);
  const members = db.prepare(`
    SELECT km.id as member_id, km.user_id, km.display_name, km.role, km.status, km.joined_at,
           u.name as user_name, u.phone
    FROM kitchen_members km
    LEFT JOIN users u ON u.id = km.user_id
    WHERE km.group_id = ?
    ORDER BY km.joined_at ASC
  `).all(groupId);

  res.json({
    status: "success",
    group: {
      id: group.id,
      name: group.name,
      joinCode: group.join_code,
      maxMembers: group.max_members,
      createdAt: group.created_at,
      settings: safeParse(group.settings, {})
    },
    myRole: req.kitchenRole,
    members: members.map(m => ({
      id: m.member_id,
      userId: m.user_id || null,
      name: m.display_name || m.user_name || "Roommate",
      phone: m.phone || "",
      displayName: m.display_name || m.user_name || "Roommate",
      role: m.role,
      status: m.status,
      joinedAt: m.joined_at,
      isManual: !m.user_id,
      isMe: m.user_id === req.userId
    })),
    roster: safeParse(kData?.roster, []),
    cashbook: safeParse(kData?.cashbook, [])
  });
});


/** POST /api/kitchen/:groupId/sync — update kitchen roster/cashbook */
app.post("/api/kitchen/:groupId/sync", authenticateToken, requireKitchenMember(), (req, res) => {
  const groupId = req.kitchenGroupId;
  const { roster, cashbook } = req.body;

  const setClauses = ["updated_at = datetime('now')", "updated_by = ?"];
  const values = [req.userId];

  if (roster !== undefined) {
    if (!Array.isArray(roster)) return res.status(400).json({ error: "roster must be an array" });
    setClauses.push("roster = ?");
    values.push(JSON.stringify(roster));
  }
  if (cashbook !== undefined) {
    if (!Array.isArray(cashbook)) return res.status(400).json({ error: "cashbook must be an array" });
    setClauses.push("cashbook = ?");
    values.push(JSON.stringify(cashbook));
  }

  values.push(groupId);
  db.prepare(`UPDATE kitchen_data SET ${setClauses.join(", ")} WHERE group_id = ?`).run(...values);

  // Update group's updated_at
  db.prepare("UPDATE kitchen_groups SET updated_at = datetime('now') WHERE id = ?").run(groupId);

  // Broadcast to SSE clients
  const kData = db.prepare("SELECT * FROM kitchen_data WHERE group_id = ?").get(groupId);
  broadcastToGroup(groupId, {
    event: "data_updated",
    updatedBy: req.userId,
    roster: roster !== undefined ? roster : safeParse(kData?.roster, []),
    cashbook: cashbook !== undefined ? cashbook : safeParse(kData?.cashbook, [])
  });

  res.json({ status: "success", message: "Kitchen data synchronized." });
});

/** POST /api/kitchen/:groupId/member/toggle-pause */
app.post("/api/kitchen/:groupId/member/toggle-pause", authenticateToken, requireKitchenMember(), (req, res) => {
  const { memberId, status } = req.body;
  if (!memberId || !["active", "paused"].includes(status)) {
    return res.status(400).json({ error: "memberId and status ('active'|'paused') are required." });
  }

  const groupId = req.kitchenGroupId;

  const targetMember = db.prepare(
    "SELECT * FROM kitchen_members WHERE group_id = ? AND (user_id = ? OR id = ?)"
  ).get(groupId, memberId, memberId);

  if (!targetMember) {
    return res.status(404).json({ error: "Member not found in this group." });
  }

  const actorUser = db.prepare("SELECT name FROM users WHERE id = ?").get(req.userId);
  const actorName = actorUser?.name || "Roommate";
  const nowIso = status === "paused" ? new Date().toISOString() : null;
  const pBy = status === "paused" ? req.userId : null;
  const pName = status === "paused" ? actorName : null;

  db.prepare(
    "UPDATE kitchen_members SET status = ?, paused_by = ?, paused_by_name = ?, paused_at = ? WHERE group_id = ? AND id = ?"
  ).run(status, pBy, pName, nowIso, groupId, targetMember.id);

  broadcastToGroup(groupId, {
    event: "member_status_changed",
    memberId: targetMember.id,
    userId: targetMember.user_id,
    status
  });

  res.json({
    status: "success",
    message: status === "paused" ? "Member paused ⏸️" : "Member resumed ▶️"
  });
});

/** POST /api/kitchen/:groupId/member/add-manual — add a manual roommate/member by name */
app.post("/api/kitchen/:groupId/member/add-manual", authenticateToken, requireKitchenMember(), (req, res) => {
  const { name, phone } = req.body;
  const err = validateStr(name, "Member name", 100);
  if (err) return res.status(400).json({ error: err });

  const groupId = req.kitchenGroupId;
  const memberId = generateId("km_manual");
  const cleanName = name.trim();

  db.prepare(`
    INSERT INTO kitchen_members (id, group_id, user_id, display_name, role, status)
    VALUES (?, ?, NULL, ?, 'MEMBER', 'active')
  `).run(memberId, groupId, cleanName);

  const memberObj = {
    id: memberId,
    userId: null,
    name: cleanName,
    displayName: cleanName,
    phone: phone?.trim() || "",
    role: "MEMBER",
    status: "active",
    joinedAt: new Date().toISOString(),
    isManual: true,
    isMe: false
  };

  broadcastToGroup(groupId, {
    event: "member_joined",
    member: memberObj
  });

  res.status(201).json({
    status: "success",
    message: `Added "${cleanName}" to kitchen group!`,
    member: memberObj
  });
});

/** POST /api/kitchen/:groupId/member/delete — remove a member (manual or registered) */
app.post("/api/kitchen/:groupId/member/delete", authenticateToken, requireKitchenMember(), (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: "memberId is required." });

  const groupId = req.kitchenGroupId;
  const member = db.prepare("SELECT * FROM kitchen_members WHERE group_id = ? AND (id = ? OR user_id = ?)").get(groupId, memberId, memberId);
  if (!member) return res.status(404).json({ error: "Member not found." });

  // Only OWNER/ADMIN can delete others; members can delete themselves
  const roleOrder = { MEMBER: 1, ADMIN: 2, OWNER: 3 };
  const myLevel = roleOrder[req.kitchenRole] || 0;
  const isSelf = member.user_id === req.userId || member.id === memberId;

  if (!isSelf && myLevel < 2) {
    return res.status(403).json({ error: "Only OWNER or ADMIN can remove other members." });
  }

  // Delete member from group
  db.prepare("DELETE FROM kitchen_members WHERE group_id = ? AND id = ?").run(groupId, member.id);

  // Clean up member from roster items
  const kData = db.prepare("SELECT * FROM kitchen_data WHERE group_id = ?").get(groupId);
  if (kData) {
    let roster = safeParse(kData.roster, []);
    let changed = false;

    roster = roster.map(item => {
      const origIds = item.memberIds || [];
      const newIds = origIds.filter(mId => mId !== member.id && mId !== member.user_id);
      if (newIds.length !== origIds.length) {
        changed = true;
        let newTurnIndex = item.currentTurnIndex || 0;
        if (newTurnIndex >= newIds.length) newTurnIndex = 0;
        return { ...item, memberIds: newIds, currentTurnIndex: newTurnIndex };
      }
      return item;
    });

    if (changed) {
      db.prepare("UPDATE kitchen_data SET roster = ? WHERE group_id = ?").run(JSON.stringify(roster), groupId);
    }
  }

  broadcastToGroup(groupId, { event: "member_left", memberId: member.id, userId: member.user_id });

  res.json({ status: "success", message: "Member removed from kitchen group." });
});


/** POST /api/kitchen/:groupId/leave */
app.post("/api/kitchen/:groupId/leave", authenticateToken, requireKitchenMember(), (req, res) => {
  const groupId = req.kitchenGroupId;

  // OWNER cannot leave if they're the only admin — must transfer ownership first
  if (req.kitchenRole === "OWNER") {
    const otherAdmins = db.prepare(`
      SELECT COUNT(*) as c FROM kitchen_members
      WHERE group_id = ? AND user_id != ? AND role IN ('OWNER','ADMIN')
    `).get(groupId, req.userId).c;

    if (otherAdmins === 0) {
      // Check if there are other members at all
      const otherMembers = db.prepare(`
        SELECT COUNT(*) as c FROM kitchen_members
        WHERE group_id = ? AND user_id != ?
      `).get(groupId, req.userId).c;

      if (otherMembers > 0) {
        return res.status(400).json({
          error: "As the owner, you must promote another member to ADMIN before leaving."
        });
      }
      // No other members — delete the group
      db.prepare("DELETE FROM kitchen_groups WHERE id = ?").run(groupId);
      return res.json({ status: "success", message: "Kitchen group deleted (you were the last member)." });
    }
  }

  db.prepare("DELETE FROM kitchen_members WHERE group_id = ? AND user_id = ?").run(groupId, req.userId);

  broadcastToGroup(groupId, { event: "member_left", userId: req.userId });

  res.json({ status: "success", message: "You have left the kitchen group." });
});

/** POST /api/kitchen/:groupId/promote — change a member's role */
app.post("/api/kitchen/:groupId/promote", authenticateToken, requireKitchenMember("OWNER"), (req, res) => {
  const { memberId, role } = req.body;
  if (!memberId || !["ADMIN", "MEMBER"].includes(role)) {
    return res.status(400).json({ error: "memberId and role ('ADMIN'|'MEMBER') are required." });
  }

  const groupId = req.kitchenGroupId;
  const target = db.prepare("SELECT * FROM kitchen_members WHERE group_id = ? AND user_id = ?").get(groupId, memberId);
  if (!target) return res.status(404).json({ error: "Member not found." });

  db.prepare("UPDATE kitchen_members SET role = ? WHERE group_id = ? AND user_id = ?").run(role, groupId, memberId);
  broadcastToGroup(groupId, { event: "member_role_changed", memberId, role });
  res.json({ status: "success", message: `Member role updated to ${role}.` });
});

/** GET /api/kitchen/:groupId/invite — generate or get an invite token */
app.get("/api/kitchen/:groupId/invite", authenticateToken, requireKitchenMember("ADMIN"), (req, res) => {
  const groupId = req.kitchenGroupId;
  const group = db.prepare("SELECT * FROM kitchen_groups WHERE id = ?").get(groupId);

  // Return the join code — simple and reliable
  // Also generate a time-limited deep-link token for WhatsApp sharing
  const inviteToken = generateId("inv");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(`
    INSERT INTO invite_tokens (token, group_id, created_by, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(inviteToken, groupId, req.userId, expiresAt);

  res.json({
    status: "success",
    joinCode: group.join_code,
    inviteToken,
    groupName: group.name,
    expiresAt,
    whatsappText: `Join my kitchen group "${group.name}" on Digital Khata!\n\nJoin Code: ${group.join_code}\n\nOr open the app and enter this code in Kitchen → Join Group.`
  });
});

/** GET /api/kitchen/:groupId/events — SSE endpoint for real-time updates */
app.get("/api/kitchen/:groupId/events", authenticateToken, requireKitchenMember(), (req, res) => {
  const groupId = req.kitchenGroupId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Register this client
  if (!sseClients.has(groupId)) sseClients.set(groupId, new Set());
  sseClients.get(groupId).add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ event: "connected", groupId })}\n\n`);

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 30000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(groupId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(groupId);
    }
  });
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    database: "sqlite",
    timestamp: new Date().toISOString(),
    version: "3.0.0"
  });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Khata API Server running at http://localhost:${PORT}`);
  console.log(`🔐 Authentication: JWT + bcrypt`);
  console.log(`💾 Database: SQLite (khata.db)`);
  console.log(`📡 Real-time: Server-Sent Events`);
});
