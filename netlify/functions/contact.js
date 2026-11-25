// contact.js — Handle contact form submissions, email via Nodemailer
const nodemailer = require("nodemailer");
const { json } = require("./_utils");

// Simple in-memory rate limiter
const submits = {};
const MAX_PER_IP = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function rateLimited(ip) {
  const now = Date.now();
  if (!submits[ip] || now - submits[ip].start > WINDOW_MS) {
    submits[ip] = { count: 1, start: now };
    return false;
  }
  submits[ip].count++;
  return submits[ip].count > MAX_PER_IP;
}

function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204 };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const ip = event.headers["x-forwarded-for"] || "unknown";
  if (rateLimited(ip)) return json(429, { error: "Too many submissions. Try again later." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

  const name = sanitize(body.name, 100);
  const email = sanitize(body.email, 100);
  const subject = sanitize(body.subject, 200);
  const message = sanitize(body.message, 2000);

  if (!name || !email || !message) return json(400, { error: "Name, email and message are required." });
  if (!validateEmail(email)) return json(400, { error: "Invalid email address." });
  if (subject.length < 2) return json(400, { error: "Please provide a subject." });

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    NOTIFICATION_EMAIL,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // Log the submission but don't fail silently
    console.log("Contact form (no SMTP configured):", { name, email, subject });
    // Still return success to the user — owner will see it in Netlify logs
    return json(200, { ok: true, message: "Message received! I'll get back to you soon." });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587", 10),
    secure: parseInt(SMTP_PORT || "587", 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const to = NOTIFICATION_EMAIL || SMTP_USER;

  const mailOpts = {
    from: `"Portfolio Contact" <${SMTP_USER}>`,
    to,
    replyTo: `"${name}" <${email}>`,
    subject: `Portfolio Contact: ${subject}`,
    text: `New message from your portfolio:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#fffdf9;border:1px solid #e8ddd0;border-radius:8px;">
        <h2 style="color:#2b2b2b;margin-bottom:4px;">New Portfolio Message</h2>
        <p style="color:#888;margin-top:0;">Received via your portfolio contact form</p>
        <hr style="border:none;border-top:1px solid #e8ddd0;margin:20px 0;">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border:none;border-top:1px solid #e8ddd0;margin:20px 0;">
        <p style="white-space:pre-wrap;">${message}</p>
        <hr style="border:none;border-top:1px solid #e8ddd0;margin:20px 0;">
        <p style="color:#aaa;font-size:12px;">Sent from jonishathapa.netlify.app</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOpts);
    return json(200, { ok: true, message: "Message sent! I'll get back to you soon." });
  } catch (err) {
    console.error("Mail error:", err.message);
    return json(500, { error: "Failed to send message. Please email me directly." });
  }
};
