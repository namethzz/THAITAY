import { useState, type FormEvent } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "login" | "register";

export default function AuthPage({ mode, onSuccess }: { mode: AuthMode; onSuccess: () => void }) {
  const { login, register, loading, error: serviceError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";
  const visibleError = isRegister
    ? formError || serviceError
    : [formError, serviceError]
        .map((message) => message?.replaceAll("ไม่สามารถดำเนินการได้", "").trim())
        .find((message) => message);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (isRegister && password !== confirmPassword) {
      setFormError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      onSuccess();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "ไม่สามารถดำเนินการได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-container">
        <BrandMark className="auth-brand" />
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-heading">
          <span className="auth-eyebrow">บัญชี THAI TAY</span>
          <h1>{isRegister ? "สร้างบัญชีใหม่" : "ยินดีต้อนรับกลับมา"}</h1>
          <p className="auth-sub">
            {isRegister
              ? "สมัครเพื่อเริ่มใช้งานบัญชี THAI TAY"
              : "เข้าสู่ระบบเพื่อใช้งานบัญชี THAI TAY"}
          </p>
        </div>

        {visibleError && (
          <div className="auth-error" role="alert">
            {visibleError}
          </div>
        )}

        {isRegister && (
          <>
            <label htmlFor="auth-name">ชื่อ-นามสกุล</label>
            <input
              id="auth-name"
              name="name"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </>
        )}

        <label htmlFor="auth-email">อีเมล</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="auth-password">รหัสผ่าน</label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {isRegister && (
          <p className="auth-hint">กำหนดความยาวได้ตามต้องการ (แนะนำให้ใช้รหัสผ่านที่คาดเดายาก)</p>
        )}

        {isRegister && (
          <>
            <label htmlFor="auth-confirm-password">ยืนยันรหัสผ่าน</label>
            <input
              id="auth-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </>
        )}

        <button className="auth-submit" type="submit" disabled={submitting || loading}>
          {loading
            ? "กำลังตรวจสอบบัญชี…"
            : submitting
              ? isRegister
                ? "กำลังสมัครสมาชิก…"
                : "กำลังเข้าสู่ระบบ…"
              : isRegister
                ? "สมัครสมาชิก"
                : "เข้าสู่ระบบ"}
        </button>
        <p className="auth-switch">
          {isRegister ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}{" "}
          <a href={isRegister ? "#login" : "#register"}>
            {isRegister ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </a>
        </p>
      </form>
      <a className="auth-home-link" href="#home">
        กลับไปยังหน้าแรก
      </a>
    </div>
  );
}
