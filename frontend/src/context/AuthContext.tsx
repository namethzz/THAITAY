import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const API_BASE = (import.meta.env.VITE_AUTH_API_BASE || "/api/auth").replace(/\/$/, "");

import type { EstimateLine, EstimateMeta } from "@/types";

export interface AccountEstimate {
  lines: EstimateLine[];
  meta: EstimateMeta;
  revision: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  estimate?: AccountEstimate;
  watchlist?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  saveWatch: (ids: string[], following: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

class AuthApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: body ? "POST" : "GET",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("เชื่อมต่อระบบบัญชีไม่ได้ กรุณาตรวจสอบว่า backend กำลังทำงาน");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message
      : response.status >= 500
        ? "ระบบบัญชีไม่ตอบสนอง กรุณาตรวจสอบ backend และ MongoDB"
        : "ไม่สามารถดำเนินการได้";
    throw new AuthApiError(message, response.status);
  }
  if (!data || typeof data !== "object") throw new Error("รูปแบบข้อมูลจากระบบบัญชีไม่ถูกต้อง");
  return data as T;
}

export function saveAccountEstimate(accountId: string, estimate: AccountEstimate, nextRevision: string) {
  return request("/estimate", { accountId, ...estimate, nextRevision });
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    request<{ user: AuthUser }>("/me")
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AuthApiError && cause.status === 401) {
          setUser(null);
          return;
        }
        setError(cause instanceof Error ? cause.message : "ตรวจสอบบัญชีไม่สำเร็จ");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError("");
    try {
      const { user: authenticatedUser } = await request<{ user: AuthUser }>("/login", { email, password });
      setUser(authenticatedUser);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เข้าสู่ระบบไม่สำเร็จ");
      throw cause;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setError("");
    try {
      const { user: registeredUser } = await request<{ user: AuthUser }>("/register", { name, email, password });
      setUser(registeredUser);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สมัครสมาชิกไม่สำเร็จ");
      throw cause;
    }
  }, []);

  const logout = useCallback(async () => {
    setError("");
    try {
      await request<{ message: string }>("/logout", {});
      setUser(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ออกจากระบบไม่สำเร็จ");
      throw cause;
    }
  }, []);

  const accountId = user?.id;
  const saveWatch = useCallback(async (ids: string[], following: boolean) => {
    if (!accountId) throw new Error("กรุณาเข้าสู่ระบบก่อน");
    await request("/watchlist", { accountId, ids, following });
    setUser(current => {
      if (!current || current.id !== accountId) return current;
      const previous = current.watchlist ?? [];
      const watchlist = following
        ? [...new Set([...previous, ...ids])]
        : previous.filter(id => !ids.includes(id));
      return { ...current, watchlist };
    });
  }, [accountId]);

  const value = useMemo(() => ({ user, loading, error, login, register, saveWatch, logout }), [user, loading, error, login, register, saveWatch, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth ต้องใช้ภายใน AuthProvider");
  return context;
}
