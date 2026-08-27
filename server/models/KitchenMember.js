/**
 * server/models/KitchenMember.js
 * Mongoose model for kitchen_members collection
 */
import mongoose from "mongoose";

const kitchenMemberSchema = new mongoose.Schema(
  {
    _id: { type: String },
    group_id: { type: String, required: true, ref: "KitchenGroup" },
    user_id: { type: String, default: null, ref: "User" },
    display_name: { type: String, default: "" },
    role: { type: String, enum: ["OWNER", "ADMIN", "MEMBER"], default: "MEMBER" },
    status: { type: String, enum: ["active", "paused"], default: "active" },
    paused_by: { type: String, default: null },
    paused_by_name: { type: String, default: null },
    paused_at: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "joined_at", updatedAt: false },
    _id: false
  }
);

kitchenMemberSchema.index({ group_id: 1 });
kitchenMemberSchema.index({ user_id: 1 });
kitchenMemberSchema.index({ group_id: 1, user_id: 1 });

export const KitchenMember = mongoose.model("KitchenMember", kitchenMemberSchema);
