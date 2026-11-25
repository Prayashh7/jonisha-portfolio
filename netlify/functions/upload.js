// upload.js — Validate and persist admin uploads in Netlify Blobs.
const { getBlobsStore } = require("./_blobs");
const { requireAuth, checkCsrf, verifySession, json } = require("./_utils");

const STORE_NAME = "portfolio-files";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_RESUME_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_RESUME_TYPES = new Set(["application/pdf"]);

function parseMultipart(body, boundary) {
  const source = Buffer.from(body || "", "base64");
  const delimiter = Buffer.from(`--${boundary}`);
  const separator = Buffer.from("\r\n\r\n");
  const parts = [];
  let cursor = 0;

  while (cursor < source.length) {
    const boundaryIndex = source.indexOf(delimiter, cursor);
    if (boundaryIndex === -1) break;

    const partStart = boundaryIndex + delimiter.length;
    if (source.slice(partStart, partStart + 2).equals(Buffer.from("--"))) break;

    const headerStart = source.slice(partStart, partStart + 2).equals(Buffer.from("\r\n"))
      ? partStart + 2
      : partStart;
    const headerEnd = source.indexOf(separator, headerStart);
    if (headerEnd === -1) break;

    const headersText = source.slice(headerStart, headerEnd).toString("utf8");
    const nextBoundary = source.indexOf(delimiter, headerEnd + separator.length);
    if (nextBoundary === -1) break;

    let dataEnd = nextBoundary;
    if (source.slice(dataEnd - 2, dataEnd).equals(Buffer.from("\r\n"))) dataEnd -= 2;
    const data = source.slice(headerEnd + separator.length, dataEnd);
    const headers = Object.fromEntries(
      headersText.split("\r\n").map((line) => {
        const index = line.indexOf(":");
        return index === -1
          ? [line.trim().toLowerCase(), ""]
          : [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
      })
    );

    const disposition = headers["content-disposition"] || "";
    const name = disposition.match(/(?:^|;)\s*name="([^"]*)"/i)?.[1];
    const filename = disposition.match(/(?:^|;)\s*filename="([^"]*)"/i)?.[1];
    if (name) {
      parts.push({ name, filename, contentType: (headers["content-type"] || "application/octet-stream").toLowerCase(), data });
    }
    cursor = nextBoundary;
  }

  return parts;
}

function sanitizeFilename(filename) {
  return (filename || "upload")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 100) || "upload";
}

function hasValidFileSignature(buffer, contentType) {
  if (contentType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (contentType === "application/pdf") return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

function extensionFor(contentType) {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[contentType];
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { Allow: "POST, OPTIONS" }, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const authError = requireAuth(event);
  if (authError) return authError;

  const session = verifySession(event);
  if (!checkCsrf(event, session)) return json(403, { error: "CSRF check failed. Please sign in again." });

  try {
    const contentType = event.headers["content-type"] || "";
    const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    const boundaryValue = boundary?.[1] || boundary?.[2];
    if (!boundaryValue) return json(400, { error: "Expected a multipart/form-data upload." });

    const parts = parseMultipart(event.body, boundaryValue);
    const file = parts.find((part) => part.name === "file" && part.filename);
    const uploadType = parts.find((part) => part.name === "type")?.data.toString("utf8").trim();
    if (!file || !["image", "resume"].includes(uploadType)) {
      return json(400, { error: "Upload must include a supported file and upload type." });
    }

    const isResume = uploadType === "resume";
    const allowedTypes = isResume ? ALLOWED_RESUME_TYPES : ALLOWED_IMAGE_TYPES;
    const maxSize = isResume ? MAX_RESUME_SIZE : MAX_IMAGE_SIZE;

    if (!allowedTypes.has(file.contentType)) return json(415, { error: "Unsupported file type." });
    if (!file.data.length) return json(400, { error: "The selected file is empty." });
    if (file.data.length > maxSize) return json(413, { error: `File is too large. Maximum size is ${maxSize / 1024 / 1024} MB.` });
    if (!hasValidFileSignature(file.data, file.contentType)) return json(415, { error: "File contents do not match the selected file type." });

    const extension = extensionFor(file.contentType);
    const key = `${uploadType}s/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const store = getBlobsStore(event, STORE_NAME);

    await store.set(key, file.data, {
      metadata: {
        contentType: file.contentType,
        originalName: sanitizeFilename(file.filename),
        uploadType,
      },
    });

    // Confirm the stored object exists before responding successfully.
    const metadata = await store.getMetadata(key);
    if (!metadata) throw new Error("File verification failed after writing to Netlify Blobs.");

    return json(200, { ok: true, key, url: `/api/files/${encodeURIComponent(key)}` }, { "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Upload API error:", error);
    return json(500, { error: "Unable to store the upload. Check the Netlify Function logs for details." });
  }
};
