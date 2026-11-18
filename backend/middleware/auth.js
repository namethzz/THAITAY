import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload !== "object" || typeof payload.id !== "string") {
      return res.status(401).json({ message: "เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
    }
    req.userId = payload.id;
    return next();
  } catch {
    return res.status(401).json({ message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}
