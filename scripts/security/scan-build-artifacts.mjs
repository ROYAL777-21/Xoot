import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

const ROOT = process.cwd();
const targetArg = process.argv[2] || "dist";
const targetDir = join(ROOT, targetArg);

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const allowPublicSourceMaps = process.env.ZOOT_ALLOW_PUBLIC_SOURCEMAPS === "true";

const patterns = [
  { name: "Supabase secret or CLI token", regex: /sb_(?:secret|service_role)_[A-Za-z0-9_-]{16,}|sbp_[A-Za-z0-9_-]{32,}/g },
  { name: "Mapbox secret token", regex: /\bsk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}\b/g },
  { name: "OpenAI API key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: "Cloudflare API token", regex: /cfat_[A-Za-z0-9_-]{20,}/g },
  { name: "PostHog private API key", regex: /\bphx_[A-Za-z0-9_-]{20,}\b/g },
  { name: "Twilio credential identifier", regex: /\b(?:AC|SK|VA|AP|OR)[0-9a-fA-F]{32}\b/g },
  { name: "Private key material", regex: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/g },
  { name: "Database connection URL", regex: /\bpostgres(?:ql)?:\/\/[^"'\s)]+/gi },
  {
    name: "Server-only environment variable name",
    regex:
      /\b(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|SUPABASE_ACCESS_TOKEN|SENTRY_AUTH_TOKEN|OPENAI_API_KEY|TWILIO_AUTH_TOKEN|TWILIO_API_KEY_SECRET|BREVO_API_KEY|OZOW_(?:PRIVATE_)?KEY|STITCH_(?:CLIENT_)?SECRET|MAPBOX_DOWNLOADS_TOKEN|CLOUDFLARE_API_TOKEN|KIE_API_KEY)\b/g,
  },
];

const jwtRegex = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

const isTextArtifact = (file) => TEXT_EXTENSIONS.has(extname(file)) || basename(file).startsWith(".");

const decodeBase64UrlJson = (value) => {
  try {
    const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
    const json = Buffer.from(padded.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, files);
    } else if (stats.isFile()) {
      files.push(full);
    }
  }
  return files;
};

if (!existsSync(targetDir)) {
  console.error(`Build artifact directory not found: ${targetArg}`);
  process.exit(1);
}

const findings = [];
for (const file of walk(targetDir)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");

  if (extname(file) === ".map" && !allowPublicSourceMaps) {
    findings.push(`${rel}: source map artifact is present`);
    continue;
  }

  if (!isTextArtifact(file)) continue;
  // Inspect and read the same opened object; a path replacement between stat
  // and read must not switch what the security check inspects.
  const descriptor = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  let content;
  try {
    const stats = fstatSync(descriptor);
    if (!stats.isFile() || stats.size > MAX_FILE_BYTES) continue;
    content = readFileSync(descriptor, "utf8");
  } finally { closeSync(descriptor); }

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(content)) {
      findings.push(`${rel}: ${pattern.name}`);
    }
  }

  jwtRegex.lastIndex = 0;
  for (const match of content.matchAll(jwtRegex)) {
    const [, payload] = match[0].split(".");
    const parsedPayload = decodeBase64UrlJson(payload);
    if (parsedPayload?.role === "service_role") {
      findings.push(`${rel}: Supabase service-role JWT`);
    }
  }
}

if (findings.length > 0) {
  console.error("Build artifact security scan failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Build artifact security scan passed for ${targetArg}.`);
