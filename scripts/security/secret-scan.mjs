import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "dist", "node_modules", "ios", "android", ".next", ".vercel", "coverage"]);
const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs", ".css", ".html", ".js", ".json", ".jsx", ".mjs", ".md", ".sql", ".svg", ".toml", ".ts", ".tsx", ".txt", ".yml", ".yaml",
]);

const patterns = [
  { name: "Supabase service role JWT", regex: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { name: "OpenAI API key", regex: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: "Google OAuth secret", regex: /GOCSPX-[A-Za-z0-9_-]{20,}/g },
  { name: "Apple private key", regex: /-----BEGIN PRIVATE KEY-----/g },
  { name: "Twilio auth token", regex: /SK[0-9a-fA-F]{32}|AC[0-9a-fA-F]{32}/g },
  { name: "Generic assignment secret", regex: /(?:secret|service_role|private_key|auth_token|api_key)\s*[:=]\s*["'][^"']{16,}["']/gi },
];

const allowlist = [
  /preview-anon-key/,
  /VITE_SUPABASE_PUBLISHABLE_KEY/,
  /VITE_SUPABASE_URL/,
  /provider values needed in Supabase/,
  /provider credentials before live OAuth/,
  /sk-\[redacted\]/i,
];

const isTextFile = (file) => TEXT_EXTENSIONS.has(file.slice(file.lastIndexOf(".")));

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
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (allowlist.some((allowed) => allowed.test(line))) return;
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
