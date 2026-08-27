/**
 * server/models/KitchenData.js
 * Mongoose model for kitchen_data collection
 * Stores roster and cashbook for a kitchen group
 */
import mongoose from "mongoose";

const kitchenDataSchema = new mongoose.Schema(
  {
    _id: { type: String }, // group_id
    roster: { type: [mongoose.Schema.Types.Mixed], default: [] },
    cashbook: { type: [mongoose.Schema.Types.Mixed], default: [] },
    updated_by: { type: String, default: null, ref: "User" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false
  }
);

export const KitchenData = mongoose.model("KitchenData", kitchenDataSchema);
