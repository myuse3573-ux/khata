/**
 * server/models/KitchenGroup.js
 * Mongoose model for kitchen_groups collection
 */
import mongoose from "mongoose";

const kitchenGroupSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    join_code: { type: String, required: true, unique: true },
    created_by: { type: String, required: true, ref: "User" },
    max_members: { type: Number, default: 20 },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false
  }
);

kitchenGroupSchema.index({ join_code: 1 });

export const KitchenGroup = mongoose.model("KitchenGroup", kitchenGroupSchema);
