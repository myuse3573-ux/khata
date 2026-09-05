/**
 * server/server.js — MongoDB Edition
 * Khata Multi-User API Server
 *
 * Database: MongoDB via Mongoose (replaces SQLite / better-sqlite3)
 * Security: bcrypt passwords, JWT tokens, rate limiting, auth middleware
 * Real-time: Server-Sent Events for kitchen group sync
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { connectMongoDB, isMongoDBReady } from "./mongodb.js";
import { generateToken, authenticateToken, requireKitchenMember } from "./auth.js";
import { generateId, generateJoinCode } from "./utils.js";

// ── Mongoose Models ───────────────────────────────────────────────────────────
import { User } from "./models/User.js";
import { UserData } from "./models/UserData.js";
import { KitchenGroup } from "./models/KitchenGroup.js";
import { KitchenMember } from "./models/KitchenMember.js";
import { KitchenData } from "./models/KitchenData.js";
import { InviteToken } from "./models/InviteToken.js";
import { PasswordReset } from "./models/PasswordReset.js";

const app = express();
const PORT = process.env.PORT || 5000;
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many attempts. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Too many requests." }
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

// ─── Health & Status ──────────────────────────────────────────────────────────
app.get(["/", "/api", "/api/health"], (req, res) => {
  res.json({
    name: "Khata Production API Backend Server",
    status: "online",
    version: "4.0.0",
    database: isMongoDBReady() ? "mongodb" : "mongodb-unavailable",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      login: "/api/auth/login",
      register: "/api/auth/register"
    }
  });
});

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

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone || "",
    email: user.email || "",
    shopName: user.shop_name
  };
}

async function ensureUserData(user) {
  const existing = await UserData.findById(user._id);
  if (existing) return;

  await UserData.create({
    _id: user._id,
    business: {
      id: `b_${user._id}`,
      name: user.shop_name,
      owner: user.name,
      phone: user.phone || "",
      email: user.email || "",
      address: "",
      upiId: "",
      gstin: "",
      createdDate: new Date().toISOString()
    },
    books: [{ id: `book_${user._id}_1`, name: "Main Khata", isDefault: true }],
    customers: [],
    transactions: [],
    cashbook: [],
    settings: { lang: "en", pin: "", theme: "light" }
  });
}

function validateStr(val, name, maxLen = 200) {
  if (typeof val !== "string") return `${name} must be a string`;
  if (!val.trim()) return `${name} is required`;
  if (val.length > maxLen) return `${name} must be under ${maxLen} characters`;
  return null;
}

async function checkPassword(input, storedHash) {
  if (storedHash.startsWith("LEGACY_PLAIN:")) {
    const legacyPass = storedHash.slice("LEGACY_PLAIN:".length);
    return input === legacyPass;
  }
  return bcrypt.compare(input, storedHash);
}

// ─── AUTH ENDPOINTS ───────────────────────────────────────────────────────────

/** POST /api/auth/register */
app.post("/api/auth/register", async (req, res) => {
  try {
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
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.status(400).json({ error: "An account with this phone number already exists. Please log in." });
      }
    }
    if (cleanEmail) {
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({ error: "An account with this email address already exists. Please log in." });
      }
    }

    const passwordHash = await bcrypt.hash(password.trim(), 12);
    const userId = generateId("usr");
    const cleanShopName = shopName?.trim() || `${name.trim()}'s Khata`;

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

    const newUser = new User({
      _id: userId,
      phone: cleanPhone,
      email: cleanEmail,
      password_hash: passwordHash,
      name: name.trim(),
      shop_name: cleanShopName
    });
    await newUser.save();

    await UserData.create({
      _id: userId,
      business: initialBusiness,
      books: initialBooks,
      customers: [],
      transactions: [],
      cashbook: [],
      settings: { lang: "en", pin: "", theme: "light" }
    });

    const token = generateToken(userId);

    res.status(201).json({
      status: "success",
      message: "Account created successfully!",
      token,
      user: safeUser(newUser)
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

/** POST /api/auth/login */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, email, identifier, password } = req.body;
    const loginInput = (identifier || email || phone || "").trim();

    if (!loginInput || !password) {
      return res.status(400).json({ error: "Email/phone and password are required." });
    }

    let user;
    if (loginInput.includes("@")) {
      user = await User.findOne({ email: loginInput.toLowerCase() });
    } else {
      const cleanDigits = loginInput.replace(/[^0-9]/g, "");
      user = await User.findOne({
        $or: [
          { phone: cleanDigits || loginInput },
          { email: loginInput.toLowerCase() }
        ]
      });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid email/phone or password." });
    }

    const isValid = await checkPassword(password.trim(), user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email/phone or password." });
    }

    // Rehash legacy plain-text passwords
    if (user.password_hash.startsWith("LEGACY_PLAIN:")) {
      const newHash = await bcrypt.hash(password.trim(), 12);
      await User.updateOne({ _id: user._id }, { password_hash: newHash });
    }

    // Ensure user_data exists
    const hasData = await UserData.findById(user._id);
    if (!hasData) {
      const initialBusiness = {
        id: `b_${user._id}`,
        name: user.shop_name,
        owner: user.name,
        phone: user.phone || "",
        email: user.email || "",
        address: "",
        upiId: "",
        gstin: "",
        createdDate: new Date().toISOString()
      };
      const initialBooks = [{ id: `book_${user._id}_1`, name: "Main Khata", isDefault: true }];
      await UserData.create({
        _id: user._id,
        business: initialBusiness,
        books: initialBooks
      });
    }

    const token = generateToken(user._id);

    res.json({
      status: "success",
      message: "Login successful!",
      token,
      user: safeUser(user)
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

/** POST /api/auth/google — exchange a Firebase Google ID token for a Khata JWT */
app.post("/api/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || !FIREBASE_WEB_API_KEY) {
      return res.status(400).json({ error: "Google sign-in is not configured on the server." });
    }

    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );
    const identity = await verifyResponse.json();
    const firebaseUser = identity.users?.[0];
    if (!verifyResponse.ok || !firebaseUser?.localId || !firebaseUser.email) {
      return res.status(401).json({ error: "Google identity could not be verified." });
    }

    const email = firebaseUser.email.trim().toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      const name = firebaseUser.displayName?.trim() || email.split("@")[0];
      user = await User.create({
        _id: generateId("usr"),
        email,
        phone: null,
        password_hash: `GOOGLE:${firebaseUser.localId}`,
        name,
        shop_name: `${name}'s Khata`
      });
    }

    await ensureUserData(user);
    res.json({ status: "success", message: "Google sign-in successful!", token: generateToken(user._id), user: safeUser(user) });
  } catch (err) {
    console.error("Google sign-in error:", err);
    res.status(500).json({ error: "Google sign-in failed. Please try again." });
  }
});

/** POST /api/auth/demo — development/demo account with a real server session */
app.post("/api/auth/demo", async (_req, res) => {
  try {
    let user = await User.findOne({ email: "demo@khata.app" });
    if (!user) {
      user = await User.create({
        _id: "usr_demo_admin",
        email: "demo@khata.app",
        phone: "9876543210",
        password_hash: await bcrypt.hash("demo-only", 12),
        name: "Rajesh Sharma",
        shop_name: "Sharma General Store"
      });
    }
    await ensureUserData(user);
    res.json({ status: "success", token: generateToken(user._id), user: safeUser(user) });
  } catch (err) {
    console.error("Demo login error:", err);
    res.status(500).json({ error: "Demo login failed. Please check the database connection." });
  }
});

/** POST /api/auth/forgot-password */
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email, phone, identifier } = req.body;
    const input = (identifier || email || phone || "").trim();

    if (!input) {
      return res.status(400).json({ error: "Please enter your registered email address or phone number." });
    }

    let user;
    if (input.includes("@")) {
      user = await User.findOne({ email: input.toLowerCase() });
    } else {
      const cleanDigits = input.replace(/[^0-9]/g, "");
      user = await User.findOne({
        $or: [
          { phone: cleanDigits || input },
          { email: input.toLowerCase() }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ error: "No registered account found with that email/phone number." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetId = generateId("pr");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordReset.create({
      _id: resetId,
      user_id: user._id,
      otp,
      expires_at: expiresAt
    });

    res.json({
      status: "success",
      message: `Password reset OTP generated for ${user.email || user.phone}! Use OTP: ${otp}`,
      otp,
      user: safeUser(user)
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request." });
  }
});

/** POST /api/auth/reset-password */
app.post("/api/auth/reset-password", async (req, res) => {
  try {
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
      user = await User.findOne({ email: input.toLowerCase() });
    } else {
      const cleanDigits = input.replace(/[^0-9]/g, "");
      user = await User.findOne({
        $or: [
          { phone: cleanDigits || input },
          { email: input.toLowerCase() }
        ]
      });
    }

    if (!user) return res.status(404).json({ error: "No account found." });

    const resetRecord = await PasswordReset.findOne({
      user_id: user._id,
      otp: otp.trim(),
      used: false,
      expires_at: { $gt: new Date() }
    }).sort({ created_at: -1 });

    if (!resetRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP code. Please request a new OTP." });
    }

    const newHash = await bcrypt.hash(newPassword.trim(), 12);
    await PasswordReset.updateOne({ _id: resetRecord._id }, { used: true });
    await User.updateOne({ _id: user._id }, { password_hash: newHash });

    res.json({ status: "success", message: "Password reset successful! You can now log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed." });
  }
});

/** GET /api/auth/me */
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ status: "success", user: safeUser(user) });
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

/** POST /api/auth/change-password */
app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required." });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters." });
    }

    const user = await User.findById(req.userId);
    const isValid = await checkPassword(currentPassword.trim(), user.password_hash);
    if (!isValid) return res.status(401).json({ error: "Current password is incorrect." });

    const newHash = await bcrypt.hash(newPassword.trim(), 12);
    await User.updateOne({ _id: req.userId }, { password_hash: newHash });
    res.json({ status: "success", message: "Password updated successfully." });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Password change failed." });
  }
});

// ─── PERSONAL DATA ENDPOINTS ──────────────────────────────────────────────────

/** GET /api/personal — fetch authenticated user's full data */
app.get("/api/personal", authenticateToken, async (req, res) => {
  try {
    const row = await UserData.findById(req.userId);
    if (!row) return res.status(404).json({ error: "User data not found." });

    res.json({
      status: "success",
      database: {
        business: row.business || {},
        books: row.books || [],
        customers: row.customers || [],
        transactions: row.transactions || [],
        cashbook: row.cashbook || [],
        settings: row.settings || { lang: "en", pin: "", theme: "light" }
      }
    });
  } catch (err) {
    console.error("Fetch personal data error:", err);
    res.status(500).json({ error: "Failed to fetch data." });
  }
});

/** POST /api/personal/sync — save user's data */
app.post("/api/personal/sync", authenticateToken, async (req, res) => {
  try {
    const allowed = ["business", "books", "customers", "transactions", "cashbook", "settings"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (typeof req.body[key] !== "object" && !Array.isArray(req.body[key])) {
          return res.status(400).json({ error: `Invalid data for field: ${key}` });
        }
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    await UserData.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { upsert: true, new: true }
    );

    res.json({ status: "success", message: "Data synchronized." });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Sync failed." });
  }
});

// ─── KITCHEN GROUP ENDPOINTS ──────────────────────────────────────────────────

/** POST /api/kitchen/create */
app.post("/api/kitchen/create", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const err = validateStr(name, "Group name", 100);
    if (err) return res.status(400).json({ error: err });

    const user = await User.findById(req.userId);

    const memberCount = await KitchenMember.countDocuments({ user_id: req.userId });
    if (memberCount >= 10) {
      return res.status(400).json({ error: "You can be a member of at most 10 kitchen groups." });
    }

    const groupId = generateId("kg");
    let joinCode = generateJoinCode();

    // Ensure unique join code
    while (await KitchenGroup.findOne({ join_code: joinCode })) {
      joinCode = generateJoinCode();
    }

    const memberId = generateId("km");

    await KitchenGroup.create({
      _id: groupId,
      name: name.trim(),
      join_code: joinCode,
      created_by: req.userId,
      max_members: 20
    });

    await KitchenMember.create({
      _id: memberId,
      group_id: groupId,
      user_id: req.userId,
      display_name: user.name,
      role: "OWNER"
    });

    await KitchenData.create({
      _id: groupId,
      roster: [],
      cashbook: []
    });

    res.status(201).json({
      status: "success",
      message: "Kitchen group created!",
      group: {
        id: groupId,
        name: name.trim(),
        joinCode,
        role: "OWNER",
        maxMembers: 20
      }
    });
  } catch (err) {
    console.error("Kitchen create error:", err);
    res.status(500).json({ error: "Failed to create kitchen group." });
  }
});

/** POST /api/kitchen/join */
app.post("/api/kitchen/join", authenticateToken, async (req, res) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode?.trim()) return res.status(400).json({ error: "Join code is required." });

    const user = await User.findById(req.userId);
    const cleanCode = joinCode.trim().toUpperCase();

    const group = await KitchenGroup.findOne({ join_code: cleanCode });
    if (!group) {
      return res.status(404).json({ error: "No kitchen group found with that code. Check the code and try again." });
    }

    const alreadyMember = await KitchenMember.findOne({ group_id: group._id, user_id: req.userId });
    if (alreadyMember) {
      return res.status(400).json({ error: "You are already a member of this kitchen group." });
    }

    const memberId = generateId("km");
    await KitchenMember.create({
      _id: memberId,
      group_id: group._id,
      user_id: req.userId,
      display_name: user.name,
      role: "MEMBER"
    });

    broadcastToGroup(group._id, {
      event: "member_joined",
      member: { userId: req.userId, name: user.name, role: "MEMBER" }
    });

    res.json({
      status: "success",
      message: `Joined "${group.name}" successfully!`,
      group: {
        id: group._id,
        name: group.name,
        joinCode: group.join_code,
        role: "MEMBER",
        maxMembers: group.max_members
      }
    });
  } catch (err) {
    console.error("Kitchen join error:", err);
    res.status(500).json({ error: "Failed to join kitchen group." });
  }
});

/** GET /api/kitchen/my-groups */
app.get("/api/kitchen/my-groups", authenticateToken, async (req, res) => {
  try {
    const memberships = await KitchenMember.find({ user_id: req.userId });

    const groups = await Promise.all(
      memberships.map(async (m) => {
        const group = await KitchenGroup.findById(m.group_id);
        if (!group) return null;
        const memberCount = await KitchenMember.countDocuments({ group_id: group._id });
        return {
          id: group._id,
          name: group.name,
          joinCode: group.join_code,
          role: m.role,
          status: m.status,
          maxMembers: group.max_members,
          memberCount
        };
      })
    );

    res.json({
      status: "success",
      groups: groups.filter(Boolean)
    });
  } catch (err) {
    console.error("Fetch groups error:", err);
    res.status(500).json({ error: "Failed to fetch groups." });
  }
});

/** GET /api/kitchen/:groupId */
app.get("/api/kitchen/:groupId", authenticateToken, requireKitchenMember(), async (req, res) => {
  try {
    const groupId = req.kitchenGroupId;

    const group = await KitchenGroup.findById(groupId);
    const kData = await KitchenData.findById(groupId);
    const members = await KitchenMember.find({ group_id: groupId }).sort({ joined_at: 1 });

    const memberDetails = await Promise.all(
      members.map(async (m) => {
        let userDoc = null;
        if (m.user_id) userDoc = await User.findById(m.user_id);
        return {
          id: m._id,
          userId: m.user_id || null,
          name: m.display_name || userDoc?.name || "Roommate",
          phone: userDoc?.phone || "",
          displayName: m.display_name || userDoc?.name || "Roommate",
          role: m.role,
          status: m.status,
          joinedAt: m.joined_at,
          paused_by: m.paused_by || null,
          paused_by_name: m.paused_by_name || null,
          paused_at: m.paused_at || null,
          isManual: !m.user_id,
          isMe: m.user_id === req.userId
        };
      })
    );

    res.json({
      status: "success",
      group: {
        id: group._id,
        name: group.name,
        joinCode: group.join_code,
        maxMembers: group.max_members,
        createdAt: group.created_at,
        settings: group.settings || {}
      },
      myRole: req.kitchenRole,
      members: memberDetails,
      roster: kData?.roster || [],
      cashbook: kData?.cashbook || []
    });
  } catch (err) {
    console.error("Kitchen get error:", err);
    res.status(500).json({ error: "Failed to fetch kitchen group." });
  }
});

/** POST /api/kitchen/:groupId/sync */
app.post("/api/kitchen/:groupId/sync", authenticateToken, requireKitchenMember(), async (req, res) => {
  try {
    const groupId = req.kitchenGroupId;
    const { roster, cashbook } = req.body;

    const updates = { updated_by: req.userId };

    if (roster !== undefined) {
      if (!Array.isArray(roster)) return res.status(400).json({ error: "roster must be an array" });
      updates.roster = roster;
    }
    if (cashbook !== undefined) {
      if (!Array.isArray(cashbook)) return res.status(400).json({ error: "cashbook must be an array" });
      updates.cashbook = cashbook;
    }

    const kData = await KitchenData.findByIdAndUpdate(
      groupId,
      { $set: updates },
      { new: true }
    );
    await KitchenGroup.findByIdAndUpdate(groupId, { $set: { updated_at: new Date() } });

    broadcastToGroup(groupId, {
      event: "data_updated",
      updatedBy: req.userId,
      roster: roster !== undefined ? roster : (kData?.roster || []),
      cashbook: cashbook !== undefined ? cashbook : (kData?.cashbook || [])
    });

    res.json({ status: "success", message: "Kitchen data synchronized." });
  } catch (err) {
    console.error("Kitchen sync error:", err);
    res.status(500).json({ error: "Sync failed." });
  }
});

/** POST /api/kitchen/:groupId/member/toggle-pause */
app.post("/api/kitchen/:groupId/member/toggle-pause", authenticateToken, requireKitchenMember(), async (req, res) => {
  try {
    const { memberId, status } = req.body;
    if (!memberId || !["active", "paused"].includes(status)) {
      return res.status(400).json({ error: "memberId and status ('active'|'paused') are required." });
    }

    const groupId = req.kitchenGroupId;
    const targetMember = await KitchenMember.findOne({
      group_id: groupId,
      $or: [{ _id: memberId }, { user_id: memberId }]
    });

    if (!targetMember) return res.status(404).json({ error: "Member not found in this group." });

    const actorUser = await User.findById(req.userId);
    const actorName = actorUser?.name || "Roommate";
    const nowIso = status === "paused" ? new Date().toISOString() : null;

    await KitchenMember.updateOne(
      { _id: targetMember._id },
      {
        $set: {
          status,
          paused_by: status === "paused" ? req.userId : null,
          paused_by_name: status === "paused" ? actorName : null,
          paused_at: nowIso
        }
      }
    );

    broadcastToGroup(groupId, {
      event: "member_status_changed",
      memberId: targetMember._id,
      userId: targetMember.user_id,
      status
    });

    res.json({ status: "success", message: status === "paused" ? "Member paused ⏸️" : "Member resumed ▶️" });
  } catch (err) {
    console.error("Update member status error:", err);
    res.status(500).json({ error: "Failed to update member status." });
  }
});

/** POST /api/kitchen/:groupId/member/add-manual */
app.post("/api/kitchen/:groupId/member/add-manual", authenticateToken, requireKitchenMember(), async (req, res) => {
  try {
    const { name, phone } = req.body;
    const err = validateStr(name, "Member name", 100);
    if (err) return res.status(400).json({ error: err });

    const groupId = req.kitchenGroupId;
    const memberId = generateId("km_manual");
    const cleanName = name.trim();

    await KitchenMember.create({
      _id: memberId,
      group_id: groupId,
      user_id: null,
      display_name: cleanName,
      role: "MEMBER",
      status: "active"
    });

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

    broadcastToGroup(groupId, { event: "member_joined", member: memberObj });

    res.status(201).json({ status: "success", message: `Added "${cleanName}" to kitchen group!`, member: memberObj });
  } catch (err) {
    console.error("Add manual member error:", err);
    res.status(500).json({ error: "Failed to add member." });
  }
});

/** POST /api/kitchen/:groupId/member/delete */
app.post("/api/kitchen/:groupId/member/delete", authenticateToken, requireKitchenMember(), async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: "memberId is required." });

    const groupId = req.kitchenGroupId;
    const member = await KitchenMember.findOne({
      group_id: groupId,
      $or: [{ _id: memberId }, { user_id: memberId }]
    });
    if (!member) return res.status(404).json({ error: "Member not found." });

    const roleOrder = { MEMBER: 1, ADMIN: 2, OWNER: 3 };
    const myLevel = roleOrder[req.kitchenRole] || 0;
    const isSelf = member.user_id === req.userId || member._id === memberId;

    if (!isSelf && myLevel < 2) {
      return res.status(403).json({ error: "Only OWNER or ADMIN can remove other members." });
    }

    await KitchenMember.deleteOne({ _id: member._id });

    // Clean up member from roster items
    const kData = await KitchenData.findById(groupId);
    if (kData) {
      let roster = kData.roster || [];
      let changed = false;

      roster = roster.map(item => {
        const origIds = item.memberIds || [];
        const newIds = origIds.filter(mId => mId !== member._id && mId !== member.user_id);
        if (newIds.length !== origIds.length) {
          changed = true;
          let newTurnIndex = item.currentTurnIndex || 0;
          if (newTurnIndex >= newIds.length) newTurnIndex = 0;
          return { ...item, memberIds: newIds, currentTurnIndex: newTurnIndex };
        }
        return item;
      });

      if (changed) {
        await KitchenData.updateOne({ _id: groupId }, { $set: { roster } });
      }
    }

    broadcastToGroup(groupId, { event: "member_left", memberId: member._id, userId: member.user_id });

    res.json({ status: "success", message: "Member removed from kitchen group." });
  } catch (err) {
    console.error("Remove member error:", err);
    res.status(500).json({ error: "Failed to remove member." });
  }
});

/** POST /api/kitchen/:groupId/leave */
app.post("/api/kitchen/:groupId/leave", authenticateToken, requireKitchenMember(), async (req, res) => {
  try {
    const groupId = req.kitchenGroupId;

    if (req.kitchenRole === "OWNER") {
      const otherAdmins = await KitchenMember.countDocuments({
        group_id: groupId,
        user_id: { $ne: req.userId },
        role: { $in: ["OWNER", "ADMIN"] }
      });

      if (otherAdmins === 0) {
        const otherMembers = await KitchenMember.countDocuments({
          group_id: groupId,
          user_id: { $ne: req.userId }
        });

        if (otherMembers > 0) {
          return res.status(400).json({
            error: "As the owner, you must promote another member to ADMIN before leaving."
          });
        }
        // Delete the group entirely
        await KitchenGroup.deleteOne({ _id: groupId });
        return res.json({ status: "success", message: "Kitchen group deleted (you were the last member)." });
      }
    }

    await KitchenMember.deleteOne({ group_id: groupId, user_id: req.userId });
    broadcastToGroup(groupId, { event: "member_left", userId: req.userId });

    res.json({ status: "success", message: "You have left the kitchen group." });
  } catch (err) {
    console.error("Leave kitchen group error:", err);
    res.status(500).json({ error: "Failed to leave kitchen group." });
  }
});

/** POST /api/kitchen/:groupId/promote */
app.post("/api/kitchen/:groupId/promote", authenticateToken, requireKitchenMember("OWNER"), async (req, res) => {
  try {
    const { memberId, role } = req.body;
    if (!memberId || !["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ error: "memberId and role ('ADMIN'|'MEMBER') are required." });
    }

    const groupId = req.kitchenGroupId;
    const target = await KitchenMember.findOne({ group_id: groupId, user_id: memberId });
    if (!target) return res.status(404).json({ error: "Member not found." });

    await KitchenMember.updateOne({ _id: target._id }, { $set: { role } });
    broadcastToGroup(groupId, { event: "member_role_changed", memberId, role });

    res.json({ status: "success", message: `Member role updated to ${role}.` });
  } catch (err) {
    console.error("Update member role error:", err);
    res.status(500).json({ error: "Failed to update role." });
  }
});

/** GET /api/kitchen/:groupId/invite */
app.get("/api/kitchen/:groupId/invite", authenticateToken, requireKitchenMember("ADMIN"), async (req, res) => {
  try {
    const groupId = req.kitchenGroupId;
    const group = await KitchenGroup.findById(groupId);

    const inviteToken = generateId("inv");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await InviteToken.create({
      _id: inviteToken,
      group_id: groupId,
      created_by: req.userId,
      expires_at: expiresAt
    });

    res.json({
      status: "success",
      joinCode: group.join_code,
      inviteToken,
      groupName: group.name,
      expiresAt: expiresAt.toISOString(),
      whatsappText: `Join my kitchen group "${group.name}" on Digital Khata!\n\nJoin Code: ${group.join_code}\n\nOr open the app and enter this code in Kitchen → Join Group.`
    });
  } catch (err) {
    console.error("Generate invite error:", err);
    res.status(500).json({ error: "Failed to generate invite." });
  }
});

/** GET /api/kitchen/:groupId/events — SSE for real-time updates */
app.get("/api/kitchen/:groupId/events", authenticateToken, requireKitchenMember(), (req, res) => {
  const groupId = req.kitchenGroupId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  if (!sseClients.has(groupId)) sseClients.set(groupId, new Set());
  sseClients.get(groupId).add(res);

  res.write(`data: ${JSON.stringify({ event: "connected", groupId })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(groupId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(groupId);
    }
  });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

// ─── START — Connect MongoDB first, then listen ───────────────────────────────
connectMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Khata API Server running at http://localhost:${PORT}`);
    console.log(`🔐 Authentication: JWT + bcrypt`);
    console.log("💾 Database: MongoDB (connection details hidden)");
    console.log(`📡 Real-time: Server-Sent Events`);
  });
});
