import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.js";

const required = ["MONGODB_URI", "JWT_SECRET", "CLIENT_ORIGIN"];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters long");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
}
