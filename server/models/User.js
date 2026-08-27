/**
 * server/models/User.js
 * Mongoose model for users collection
 */
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String }, // Use custom string IDs like "usr_xxxxx"
    phone: { type: String, unique: true, sparse: true, default: null },
    email: { type: String, unique: true, sparse: true, default: null },
    password_hash: { type: String, required: true },
    name: { type: String, required: true },
    shop_name: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false // disable auto ObjectId, we manage our own string _id
  }
);

// Index for fast lookup
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });

export const User = mongoose.model("User", userSchema);
