/**
 * server/auth.js
 * JWT authentication middleware and kitchen group authorization middleware
 */

import jwt from "jsonwebtoken";
import { getDb } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "khata_dev_secret_change_in_production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "30d";

/** Generate a signed JWT token for a user */
export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Middleware: Verifies JWT token from Authorization header.
 * Sets req.userId from the verified token payload.
 * NEVER trusts userId from request body or query params.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Session expired. Please log in again.", code: "TOKEN_EXPIRED" });
      }
      return res.status(403).json({ error: "Invalid authentication token." });
    }
    req.userId = payload.userId;
    next();
  });
}

/**
 * Middleware factory: Verifies user is a member of the kitchen group.
 * Requires authenticateToken to run first (sets req.userId).
 * @param {string|null} minRole - Minimum role required: null|'MEMBER'|'ADMIN'|'OWNER'
 */
export function requireKitchenMember(minRole = null) {
  return (req, res, next) => {
    const groupId = req.params.groupId || req.params.id;
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required." });
    }

    const db = getDb();
    const member = db.prepare(`
      SELECT km.role, km.status
      FROM kitchen_members km
      WHERE km.group_id = ? AND km.user_id = ?
    `).get(groupId, req.userId);

    if (!member) {
      return res.status(403).json({ error: "You are not a member of this kitchen group." });
    }

    // Role hierarchy check
    if (minRole) {
      const roleOrder = { MEMBER: 1, ADMIN: 2, OWNER: 3 };
      const userRoleLevel = roleOrder[member.role] || 0;
      const requiredLevel = roleOrder[minRole] || 0;
      if (userRoleLevel < requiredLevel) {
        return res.status(403).json({
          error: `This action requires ${minRole} role. You are a ${member.role}.`
        });
      }
    }

    req.kitchenGroupId = groupId;
    req.kitchenRole = member.role;
    req.kitchenMemberStatus = member.status;
    next();
  };
}

export default { generateToken, authenticateToken, requireKitchenMember };
