/**
 * server/utils.js
 * Shared utility helpers — extracted from db.js for use with MongoDB
 */

/** Generate a UUID-style ID with an optional prefix */
export function generateId(prefix = "") {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/** Generate a random join code like "KT-A8F2XX" */
export function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KT-${code}`;
}
