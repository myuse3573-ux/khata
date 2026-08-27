/**
 * server/models/PasswordReset.js
 * Mongoose model for password_resets collection
 */
import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    _id: { type: String }, // reset ID
    user_id: { type: String, required: true, ref: "User" },
    otp: { type: String, required: true },
    expires_at: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    _id: false
  }
);

// Auto-delete expired reset documents
passwordResetSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
