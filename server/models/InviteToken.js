/**
 * server/models/InviteToken.js
 * Mongoose model for invite_tokens collection
 */
import mongoose from "mongoose";

const inviteTokenSchema = new mongoose.Schema(
  {
    _id: { type: String }, // token string itself
    group_id: { type: String, required: true, ref: "KitchenGroup" },
    created_by: { type: String, required: true, ref: "User" },
    expires_at: { type: Date, required: true },
    used_count: { type: Number, default: 0 },
    max_uses: { type: Number, default: 50 },
    revoked: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    _id: false
  }
);

inviteTokenSchema.index({ group_id: 1 });

export const InviteToken = mongoose.model("InviteToken", inviteTokenSchema);
