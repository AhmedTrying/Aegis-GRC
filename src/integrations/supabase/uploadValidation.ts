export type UploadValidationResult = {
  ok: boolean;
  reason?: string;
  mime?: string;
  size?: number;
  sha256?: string;
};

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const allowedExt = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".md",
  ".png", ".jpg", ".jpeg"
];
const allowedMimePrefixes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/",
  "image/"
];

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validatePolicyUpload(file: File, maxBytes: number = DEFAULT_MAX_BYTES): Promise<UploadValidationResult> {
  const mime = file.type || "application/octet-stream";
  const size = file.size;
  const ext = extOf(file.name);

  if (size > maxBytes) {
    return { ok: false, reason: `File too large (> ${Math.round(maxBytes / (1024*1024))}MB)`, mime, size };
  }

  const mimeAllowed = allowedMimePrefixes.some((p) => mime.startsWith(p));
  const extAllowed = allowedExt.includes(ext);
  if (!mimeAllowed || !extAllowed) {
    return { ok: false, reason: "File type not allowed", mime, size };
  }

  const sha256 = await sha256Hex(file);
  // Basic heuristic blocklist (example); extend with real signatures when available
  const suspicious = [".exe", ".js", ".bat", ".cmd", ".ps1"].includes(ext);
  if (suspicious) {
    return { ok: false, reason: "Executable/script files are not allowed", mime, size, sha256 };
  }

  return { ok: true, mime, size, sha256 };
}