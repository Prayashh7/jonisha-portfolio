// files.js — Serve public portfolio uploads stored in Netlify Blobs.
const { getBlobsStore } = require("./_blobs");

const PUBLIC_KEY_PATTERN = /^(?:images|resumes)\/[a-zA-Z0-9._/-]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return { statusCode: 405, headers: { Allow: "GET, HEAD" }, body: "Method not allowed" };
  }

  let key;
  try {
    key = decodeURIComponent(event.path.replace(/^.*\/files\//, ""));
  } catch {
    return { statusCode: 400, body: "Invalid file key" };
  }

  if (!PUBLIC_KEY_PATTERN.test(key) || key.includes("..")) {
    return { statusCode: 400, body: "Invalid file key" };
  }

  try {
    const store = getBlobsStore(event, "portfolio-files");
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result?.data) return { statusCode: 404, body: "File not found" };

    const contentType = result.metadata?.contentType;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    if (!allowed.has(contentType)) return { statusCode: 404, body: "File not found" };

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": contentType === "application/pdf" ? "inline" : "inline",
    };

    if (event.httpMethod === "HEAD") return { statusCode: 200, headers, body: "" };

    return {
      statusCode: 200,
      headers,
      body: Buffer.from(result.data).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("File API error:", error);
    return { statusCode: 404, body: "File not found" };
  }
};
