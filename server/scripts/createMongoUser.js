/**
 * server/scripts/createMongoUser.js
 * One-time script: Creates the khata admin user in MongoDB
 * 
 * USAGE:
 * 1. Run as part of Setup-MongoDB.bat (recommended)
 *    OR
 * 2. Manually: node server/scripts/createMongoUser.js
 *    (Only works when MongoDB auth is disabled temporarily)
 */

import mongoose from "mongoose";

// Connect to admin database on the no-auth instance
const TARGET_URI = process.env.MONGO_SETUP_URI || "mongodb://localhost:27017/admin";

async function createUser() {
  console.log(`Connecting to MongoDB admin at ${TARGET_URI}...`);
  
  try {
    await mongoose.connect(TARGET_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error("❌ Cannot connect to MongoDB!", err);
    console.error("   Make sure MongoDB is running with auth DISABLED.");
    console.error("   Run Setup-MongoDB.bat as Administrator to do this automatically.");
    process.exit(1);
  }

  const adminDb = mongoose.connection.db.admin();

  // Create the khata_db user
  try {
    await adminDb.command({
      createUser: "khata_admin",
      pwd: "khata2026",
      roles: [
        { role: "readWrite", db: "khata_db" },
        { role: "dbAdmin", db: "khata_db" }
      ]
    });
    console.log("✅ User 'khata_admin' created! (password: khata2026)");
  } catch (err) {
    if (err.code === 51003) {
      console.log("ℹ️  User 'khata_admin' already exists — skipping creation.");
    } else {
      console.error("❌ Failed to create user:", err.message);
    }
  }

  // Also create a root superuser
  try {
    await adminDb.command({
      createUser: "root_admin",
      pwd: "rootadmin2026",
      roles: [{ role: "root", db: "admin" }]
    });
    console.log("✅ Root admin 'root_admin' created! (password: rootadmin2026)");
  } catch (err) {
    if (err.code === 51003) {
      console.log("ℹ️  Root admin already exists — skipping.");
    } else {
      console.warn("⚠️  Root admin:", err.message);
    }
  }

  await mongoose.disconnect();
  console.log("\n✅ User setup complete!");
}

createUser();
