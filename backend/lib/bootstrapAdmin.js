import User from "../models/User.js";
import { hashPassword } from "./password.js";

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function bootstrapAdmin() {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!configuredEmail && !password) return;
  if (!configuredEmail || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must both be set");
  }
  if (!isEmail(configuredEmail)) {
    throw new Error("ADMIN_EMAIL must be a valid email address");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters long");
  }

  await User.init();
  if (await User.exists({ email: configuredEmail })) {
    console.log("Bootstrap admin account already exists; leaving its password unchanged");
    return;
  }

  try {
    await User.create({
      name: "ผู้ดูแลระบบ",
      email: configuredEmail,
      password: await hashPassword(password),
    });
    console.log("Bootstrap admin account created");
  } catch (error) {
    if (error?.code === 11000) {
      console.log("Bootstrap admin account already exists; leaving its password unchanged");
      return;
    }
    throw error;
  }
}
