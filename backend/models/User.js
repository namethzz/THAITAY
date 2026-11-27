import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    watchlist: { type: [String], default: [] },
    estimate: {
      revision: { type: String, default: "" },
      lines: { type: [new mongoose.Schema({
        key: String, materialId: String, name: String, unit: String,
        month: Number, monthLabel: String, qty: Number, price: Number,
        low: Number, high: Number, demo: Boolean, asOf: String,
      }, { _id: false })], default: [] },
      meta: {
        project: { type: String, default: "" }, customer: { type: String, default: "" },
        contingency: { type: Number, default: 0 }, vat: { type: Boolean, default: true },
      },
    },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
