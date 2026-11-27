import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const router = Router();
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

function issueToken(res, id) {
  const token = jwt.sign({ id: String(id) }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, watchlist: user.watchlist ?? [] };
}

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

router.post("/register", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!name || name.length > 80 || !isEmail(email) || email.length > 254) {
    return res.status(400).json({ message: "กรอกชื่อและอีเมลให้ถูกต้อง" });
  }
  if (!password) return res.status(400).json({ message: "กรุณากรอกรหัสผ่าน" });

  try {
    if (await User.exists({ email })) return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    const user = await User.create({ name, email, password: await hashPassword(password) });
    issueToken(res, user._id);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    console.error("Register failed:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

router.post("/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!isEmail(email) || !password) return res.status(400).json({ message: "กรอกอีเมลและรหัสผ่านให้ครบ" });

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }
    issueToken(res, user._id);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", cookieOptions);
  return res.json({ message: "ออกจากระบบแล้ว" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่" });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

router.post("/watchlist", requireAuth, async (req, res) => {
  const { accountId, ids, following } = req.body ?? {};
  if (accountId !== req.userId) return res.status(409).json({ message: "บัญชีเปลี่ยนแล้ว กรุณารีเฟรชหน้า" });
  if (typeof following !== "boolean" || !Array.isArray(ids) || !ids.length || ids.length > 300 ||
      !ids.every(id => typeof id === "string" && /^MAT-\d{16}$/.test(id))) {
    return res.status(400).json({ message: "รายการวัสดุไม่ถูกต้อง" });
  }

  const update = following
    ? { $addToSet: { watchlist: { $each: ids } } }
    : { $pull: { watchlist: { $in: ids } } };
  try {
    const result = await User.updateOne({ _id: req.userId }, update);
    if (!result.matchedCount) return res.status(401).json({ message: "กรุณาเข้าสู่ระบบใหม่" });
    return res.json({ saved: true });
  } catch (error) {
    console.error("Watchlist update failed:", error);
    return res.status(500).json({ message: "บันทึกรายการติดตามไม่สำเร็จ" });
  }
});

export default router;
