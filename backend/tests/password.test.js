import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "../lib/password.js";

test("supports passphrases longer than bcrypt's 72-byte limit", async () => {
  const password = "ยาว".repeat(100);
  const storedHash = await hashPassword(password);

  assert.equal(await verifyPassword(password, storedHash), true);
  assert.equal(await verifyPassword(`${password}!`, storedHash), false);
});

test("continues to verify existing bcrypt password hashes", async () => {
  const password = "legacy-password";
  const storedHash = await bcrypt.hash(password, 4);

  assert.equal(await verifyPassword(password, storedHash), true);
  assert.equal(await verifyPassword("wrong-password", storedHash), false);
});

test("does not accept an extended password matching a legacy bcrypt prefix", async () => {
  const password = "a".repeat(72);
  const storedHash = await bcrypt.hash(password, 4);

  assert.equal(await verifyPassword(`${password}extra`, storedHash), false);
});
