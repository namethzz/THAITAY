import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

function derivePassword(password) {
  return createHash("sha256")
    .update("thaitay-auth-password-v1\0", "utf8")
    .update(password, "utf8")
    .digest("hex");
}

export function hashPassword(password) {
  return bcrypt.hash(derivePassword(password), 12);
}

export async function verifyPassword(password, storedHash) {
  if (Buffer.byteLength(password, "utf8") <= 72 && await bcrypt.compare(password, storedHash)) {
    return true;
  }
  return bcrypt.compare(derivePassword(password), storedHash);
}
