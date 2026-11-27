import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    watchlist: { type: [String], default: [] },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
