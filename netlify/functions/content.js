// content.js — Read and update site content stored in Netlify Blobs.
const { getBlobsStore } = require("./_blobs");
const { DEFAULT_CONTENT } = require("./_content");
const { requireAuth, checkCsrf, verifySession, json } = require("./_utils");

const STORE_NAME = "portfolio-content";
const CONTENT_KEY = "site-content";
const MAX_BODY_BYTES = 1_000_000;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDefaults(saved, defaults) {
  if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : clone(defaults);
  if (!isPlainObject(defaults)) return saved === undefined ? defaults : saved;

  const result = {};
  const input = isPlainObject(saved) ? saved : {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    result[key] = mergeDefaults(input[key], defaultValue);
  }
  return result;
}

function sanitizeString(value, maxLength = 10_000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeStringList(value, maxItems = 30, maxLength = 120) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => sanitizeString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeUrl(value) {
  const url = sanitizeString(value, 2_000);
  if (!url) return "";
  if (url.startsWith("/api/files/")) return url;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function sanitizeFileUrl(value) {
  const url = sanitizeString(value, 1_000);
  return url.startsWith("/api/files/") ? url : null;
}

function sanitizeContent(updates) {
  const safe = {};

  if (isPlainObject(updates.profile)) {
    safe.profile = {
      name: sanitizeString(updates.profile.name, 120),
      role: sanitizeString(updates.profile.role, 120),
      tagline: sanitizeString(updates.profile.tagline, 220),
      bio: sanitizeString(updates.profile.bio, 3_000),
      email: sanitizeString(updates.profile.email, 160),
      phone: sanitizeString(updates.profile.phone, 50),
      location: sanitizeString(updates.profile.location, 120),
    };
    for (const key of ["profileImage", "resumeUrl", "logoUrl", "faviconUrl"]) {
      if (key in updates.profile) safe.profile[key] = sanitizeFileUrl(updates.profile[key]);
    }
  }

  if (isPlainObject(updates.social)) {
    safe.social = {};
    for (const key of ["linkedin", "behance", "dribbble", "instagram", "twitter", "github"]) {
      safe.social[key] = sanitizeUrl(updates.social[key]);
    }
  }

  if (isPlainObject(updates.hero)) {
    safe.hero = {
      headline: sanitizeString(updates.hero.headline, 220),
      subheadline: sanitizeString(updates.hero.subheadline, 500),
      ctaPrimary: sanitizeString(updates.hero.ctaPrimary, 60),
      ctaSecondary: sanitizeString(updates.hero.ctaSecondary, 60),
    };
  }

  if (isPlainObject(updates.about)) {
    safe.about = {
      heading: sanitizeString(updates.about.heading, 220),
      content: sanitizeString(updates.about.content, 5_000),
      highlight1: sanitizeHighlight(updates.about.highlight1),
      highlight2: sanitizeHighlight(updates.about.highlight2),
      highlight3: sanitizeHighlight(updates.about.highlight3),
    };
  }

  if (Array.isArray(updates.skills)) {
    safe.skills = updates.skills.slice(0, 12).map((category) => ({
      category: sanitizeString(category?.category, 100),
      items: sanitizeStringList(category?.items, 30, 100),
    }));
  }

  if (Array.isArray(updates.projects)) {
    safe.projects = updates.projects.slice(0, 30).map((project) => ({
      title: sanitizeString(project?.title, 160),
      description: sanitizeString(project?.description, 600),
      fullDescription: sanitizeString(project?.fullDescription, 8_000),
      problemStatement: sanitizeString(project?.problemStatement, 1_500),
      targetUsers: sanitizeString(project?.targetUsers, 1_500),
      designGoals: sanitizeString(project?.designGoals, 1_500),
      researchApproach: sanitizeString(project?.researchApproach, 1_500),
      userFlow: sanitizeString(project?.userFlow, 1_500),
      wireframing: sanitizeString(project?.wireframing, 1_500),
      visualDesign: sanitizeString(project?.visualDesign, 1_500),
      typographyColor: sanitizeString(project?.typographyColor, 1_500),
      finalSolution: sanitizeString(project?.finalSolution, 1_500),
      keyLearnings: sanitizeString(project?.keyLearnings, 1_500),
      role: sanitizeString(project?.role, 120),
      year: sanitizeString(project?.year, 80),
      tools: sanitizeStringList(project?.tools, 20, 80),
      tags: sanitizeStringList(project?.tags, 10, 60),
      image: sanitizeFileUrl(project?.image),
      liveUrl: sanitizeUrl(project?.liveUrl),
    }));
  }

  for (const key of ["experience", "education"]) {
    if (Array.isArray(updates[key])) {
      safe[key] = updates[key].slice(0, 30).map((item) => ({
        title: sanitizeString(item?.title, 180),
        degree: sanitizeString(item?.degree, 180),
        organization: sanitizeString(item?.organization, 180),
        institution: sanitizeString(item?.institution, 180),
        period: sanitizeString(item?.period, 100),
        description: sanitizeString(item?.description, 2_000),
      }));
    }
  }

  if (Array.isArray(updates.services)) {
    safe.services = updates.services.slice(0, 20).map((service) => ({
      icon: sanitizeString(service?.icon, 16),
      title: sanitizeString(service?.title, 120),
      description: sanitizeString(service?.description, 600),
    }));
  }

  if (Array.isArray(updates.process)) {
    safe.process = updates.process.slice(0, 12).map((step) => ({
      number: sanitizeString(step?.number, 12),
      title: sanitizeString(step?.title, 100),
      description: sanitizeString(step?.description, 500),
    }));
  }

  if (Array.isArray(updates.testimonials)) {
    safe.testimonials = updates.testimonials.slice(0, 20).map((testimonial) => ({
      text: sanitizeString(testimonial?.text, 2_000),
      name: sanitizeString(testimonial?.name, 120),
      role: sanitizeString(testimonial?.role, 160),
      avatar: sanitizeFileUrl(testimonial?.avatar),
    }));
  }

  if (Array.isArray(updates.certifications)) {
    safe.certifications = updates.certifications.slice(0, 20).map((certificate) => ({
      icon: sanitizeString(certificate?.icon, 16),
      title: sanitizeString(certificate?.title, 180),
      issuer: sanitizeString(certificate?.issuer, 180),
      year: sanitizeString(certificate?.year, 50),
    }));
  }

  if (isPlainObject(updates.contact)) {
    safe.contact = {
      heading: sanitizeString(updates.contact.heading, 220),
      subheading: sanitizeString(updates.contact.subheading, 600),
      email: sanitizeString(updates.contact.email, 160),
      phone: sanitizeString(updates.contact.phone, 50),
      whatsapp: sanitizeString(updates.contact.whatsapp, 50),
    };
  }

  if (isPlainObject(updates.seo)) {
    safe.seo = {
      title: sanitizeString(updates.seo.title, 120),
      description: sanitizeString(updates.seo.description, 320),
      keywords: sanitizeString(updates.seo.keywords, 500),
      ogImage: sanitizeFileUrl(updates.seo.ogImage),
    };
  }

  if (isPlainObject(updates.theme)) {
    safe.theme = {
      colorPrimary: sanitizeColor(updates.theme.colorPrimary, "#c8a96e"),
      colorAccent: sanitizeColor(updates.theme.colorAccent, "#8b6914"),
      fontHeading: sanitizeString(updates.theme.fontHeading, 100),
      fontBody: sanitizeString(updates.theme.fontBody, 100),
    };
  }

  if (isPlainObject(updates.sections)) {
    const allowed = Object.keys(DEFAULT_CONTENT.sections.visibility);
    const candidateOrder = Array.isArray(updates.sections.order) ? updates.sections.order : [];
    const order = candidateOrder.filter((id) => allowed.includes(id));
    const missing = allowed.filter((id) => !order.includes(id));
    safe.sections = {
      order: [...order, ...missing],
      visibility: Object.fromEntries(allowed.map((id) => [id, updates.sections.visibility?.[id] !== false])),
    };
  }

  return safe;
}

function sanitizeHighlight(value) {
  return {
    number: sanitizeString(value?.number, 30),
    label: sanitizeString(value?.label, 80),
  };
}

function sanitizeColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : fallback;
}

function mergeContent(current, updates) {
  const next = clone(current);
  for (const [key, value] of Object.entries(updates)) {
    if (Array.isArray(value)) {
      next[key] = value;
    } else if (isPlainObject(value)) {
      next[key] = { ...next[key], ...value };
    }
  }
  return next;
}

async function loadContent(store) {
  const saved = await store.get(CONTENT_KEY, { type: "json" });
  return mergeDefaults(saved, DEFAULT_CONTENT);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { Allow: "GET, POST, OPTIONS" }, body: "" };

  try {
    const store = getBlobsStore(event, STORE_NAME);

    if (event.httpMethod === "GET") {
      const content = await loadContent(store);
      return json(200, content, { "Cache-Control": "no-store" });
    }

    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    const authError = requireAuth(event);
    if (authError) return authError;

    const session = verifySession(event);
    if (!checkCsrf(event, session)) return json(403, { error: "CSRF check failed. Please sign in again." });

    if ((event.body || "").length > MAX_BODY_BYTES) {
      return json(413, { error: "Content update is too large." });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    if (!isPlainObject(body)) return json(400, { error: "Expected a JSON object." });

    const current = await loadContent(store);
    const updates = sanitizeContent(body);
    if (!Object.keys(updates).length) return json(400, { error: "No supported content changes were provided." });

    const next = mergeContent(current, updates);
    await store.setJSON(CONTENT_KEY, next);

    // Read-after-write confirmation means a 200 response only occurs after the
    // actual Blob contains the requested mutation.
    const verified = await store.get(CONTENT_KEY, { type: "json" });
    if (!verified) throw new Error("Content verification failed after writing to Netlify Blobs.");

    return json(200, { ok: true, content: mergeDefaults(verified, DEFAULT_CONTENT) }, { "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Content API error:", error);
    return json(500, { error: "Unable to save portfolio content. Check the Netlify Function logs for details." });
  }
};
