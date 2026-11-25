// Shared authentication, CSRF, response, and cookie utilities.
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "";
const COOKIE_NAME = "portfolio_session";

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separator = cookie.indexOf("=");
        const name = separator === -1 ? cookie : cookie.slice(0, separator);
        const value = separator === -1 ? "" : cookie.slice(separator + 1);
        try {
          return [name, decodeURIComponent(value)];
        } catch {
          return [name, ""];
        }
      })
  );
}

function verifySession(event) {
  if (!JWT_SECRET) return null;
  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

function requireAuth(event) {
  const session = verifySession(event);
  if (!session?.role || session.role !== "admin") return json(401, { error: "Unauthorized. Please sign in again." });
  return null;
}

function csrfToken(session) {
  if (!JWT_SECRET || !session?.csrf) return "";
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${session.sub}:${session.csrf}`)
    .digest("base64url");
}

function checkCsrf(event, session) {
  const header = event.headers["x-csrf-token"] || event.headers["X-CSRF-Token"] || "";
  const expected = csrfToken(session);
  if (!header || !expected) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

function cookieOptions(maxAge = 0) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

module.exports = {
  parseCookies,
  verifySession,
  requireAuth,
  csrfToken,
  checkCsrf,
  cookieOptions,
  json,
  COOKIE_NAME,
  JWT_SECRET,
};
