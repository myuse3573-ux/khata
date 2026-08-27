/**
 * server/mongodb.js
 * MongoDB connection module using Mongoose
 */

import mongoose from "mongoose";

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/khata_db";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB Connection Warning: ${error.message} (Will retry in background)`);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected.");
  });
}

export default connectMongoDB;
