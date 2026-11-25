// auth.js — Secure administrator login, logout, and session checks.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { json, COOKIE_NAME, JWT_SECRET, csrfToken, cookieOptions, verifySession } = require("./_utils");

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(event) {
  return (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
}

function rateLimited(ip) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.startedAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, startedAt: now });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

function clearAttempts(ip) {
  attempts.delete(ip);
}

function loginPath(path) {
  return path.replace(/\/$/, "").endsWith("/login");
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path || "";

  if (method === "OPTIONS") return { statusCode: 204, headers: { Allow: "GET, POST, OPTIONS" }, body: "" };

  if (method === "POST" && loginPath(path)) {
    const ip = getClientIp(event);
    if (rateLimited(ip)) return json(429, { error: "Too many sign-in attempts. Try again in 15 minutes." });

    if (!JWT_SECRET || !process.env.ADMIN_PASSWORD_HASH) {
      console.error("Authentication environment variables are missing.");
      return json(503, { error: "Admin authentication is not configured. Set ADMIN_PASSWORD_HASH and JWT_SECRET in Netlify." });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    if (typeof body.password !== "string" || !body.password) return json(400, { error: "Password is required." });

    const valid = await bcrypt.compare(body.password, process.env.ADMIN_PASSWORD_HASH);
    if (!valid) return json(401, { error: "Invalid password." });

    clearAttempts(ip);
    const payload = {
      sub: "portfolio-admin",
      role: "admin",
      csrf: crypto.randomBytes(32).toString("base64url"),
    };
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: "8h" });

    return json(200, { ok: true, csrfToken: csrfToken(payload) }, {
      "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieOptions(8 * 60 * 60)}`,
    });
  }

  if (method === "POST" && path.replace(/\/$/, "").endsWith("/logout")) {
    return json(200, { ok: true }, {
      "Set-Cookie": `${COOKIE_NAME}=; ${cookieOptions(0)}`,
    });
  }

  if (method === "GET" && path.replace(/\/$/, "").endsWith("/session")) {
    const session = verifySession(event);
    if (!session) return json(401, { authenticated: false });
    return json(200, { authenticated: true, csrfToken: csrfToken(session) });
  }

  return json(404, { error: "Not found" });
};
