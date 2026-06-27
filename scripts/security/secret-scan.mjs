import { basename, extname, join, relative } from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "dist", "node_modules", "ios", "android", ".next", ".vercel", "coverage"]);
const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs", ".css", ".env", ".example", ".html", ".js", ".json", ".jsx", ".mjs", ".md", ".ps1", ".sql", ".svg", ".toml", ".ts", ".tsx", ".txt", ".yml", ".yaml",
]);

const patterns = [
  { name: "Supabase service role JWT", regex: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { name: "OpenAI API key", regex: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: "Google OAuth secret", regex: /GOCSPX-[A-Za-z0-9_-]{20,}/g },
  { name: "Apple private key", regex: /-----BEGIN PRIVATE KEY-----/g },
  { name: "Supabase secret or CLI token", regex: /sb_(?:secret|service_role)_[A-Za-z0-9_-]{16,}|sbp_[A-Za-z0-9_-]{32,}/g },
  { name: "Cloudflare API token", regex: /cfat_[A-Za-z0-9_-]{20,}/g },
  { name: "Twilio credential identifier", regex: /\b(?:AC|SK|VA|AP|OR)[0-9a-fA-F]{32}\b/g },
  { name: "Generic assignment secret", regex: /(?:secret|service_role|private_key|auth_token|api_key)\s*[:=]\s*["'][^"']{16,}["']/gi },
];

const allowlist = [
  /VITE_SUPABASE_PUBLISHABLE_KEY/,
  /VITE_SUPABASE_URL/,
  /provider values needed in Supabase/,
  /provider credentials before live OAuth/,
  /sk-\[redacted\]/i,
];

const placeholderValue = /^(|placeholder|replace-with|your-|example|development|staging|production|local|false|true|null|undefined)/i;
const secretNamePattern = /(?:PASSWORD|SERVICE_ROLE|CLIENT_SECRET|AUTH_TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET|API_KEY|ACCESS_TOKEN|DOWNLOADS_TOKEN|TOKEN)$/i;

const isTextFile = (file) => {
  const name = basename(file);
  return name.startsWith(".env") || TEXT_EXTENSIONS.has(extname(file));
};

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, files);
    else if (stats.isFile() && isTextFile(full)) files.push(full);
  }
  return files;
};

const findings = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (rel === "scripts/security/secret-scan.mjs") continue;

  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (allowlist.some((allowed) => allowed.test(line))) return;
    const envAssignment = line.match(/^\s*([A-Z][A-Z0-9_]*?)\s*=\s*("?)([^"#\r\n]+)\2\s*(?:#.*)?$/);
    if (envAssignment) {
      const [, name, , rawValue] = envAssignment;
      const value = rawValue.trim();
      if (secretNamePattern.test(name) && value.length >= 16 && !placeholderValue.test(value)) {
        findings.push(`${rel}:${index + 1} dotenv secret-like assignment (${name})`);
      }
    }
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push(`${rel}:${index + 1} ${pattern.name}`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("No obvious committed secrets found.");
