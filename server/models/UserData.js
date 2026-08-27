/**
 * server/models/UserData.js
 * Mongoose model for user_data collection
 * Stores personal khata data: business, books, customers, transactions, cashbook, settings
 */
import mongoose from "mongoose";

const userDataSchema = new mongoose.Schema(
  {
    _id: { type: String }, // user_id, same as User._id
    business: { type: mongoose.Schema.Types.Mixed, default: {} },
    books: { type: [mongoose.Schema.Types.Mixed], default: [] },
    customers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    transactions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    cashbook: { type: [mongoose.Schema.Types.Mixed], default: [] },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: { lang: "en", pin: "", theme: "light" }
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false
  }
);

export const UserData = mongoose.model("UserData", userDataSchema);
