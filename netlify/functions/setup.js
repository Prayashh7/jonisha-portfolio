// setup.js — One-time admin password setup
// POST /api/setup  { "password": "yourpassword", "setupKey": "..." }
// Only works when ADMIN_PASSWORD_HASH is not set yet

const bcrypt = require("bcryptjs");
const { json } = require("./_utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  // If password is already set, refuse
  if (process.env.ADMIN_PASSWORD_HASH) {
    return json(403, { error: "Admin already configured. To reset, update ADMIN_PASSWORD_HASH env var." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

  const { password, setupKey } = body;

  // Require a setup key stored as env var to prevent unauthorized setup
  const expectedKey = process.env.SETUP_KEY || "";
  if (!expectedKey || setupKey !== expectedKey) {
    return json(403, { error: "Invalid setup key." });
  }

  if (!password || password.length < 8) {
    return json(400, { error: "Password must be at least 8 characters." });
  }

  const hash = await bcrypt.hash(password, 12);

  return json(200, {
    ok: true,
    message: "Set this as your ADMIN_PASSWORD_HASH environment variable in Netlify:",
    hash,
    instruction: "After setting the env var, redeploy the site. Then this endpoint becomes disabled.",
  });
};
