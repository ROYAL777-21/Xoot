import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const MUTATION_METHODS = ["insert", "update", "upsert", "delete"];
const TABLES = ["admin_review_queue", "integration_outbox", "messages"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const isTextFile = (file) => TEXT_EXTENSIONS.has(file.slice(file.lastIndexOf(".")));

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full, files);
    else if (stats.isFile() && isTextFile(full)) files.push(full);
  }
  return files;
};

const findings = [];
const tablePattern = TABLES.map((table) => table.replaceAll("_", "[_-]")).join("|");
const methodPattern = MUTATION_METHODS.join("|");
const mutationRegex = new RegExp(
  String.raw`from\s*\(\s*["'](?:${tablePattern})["']\s*\)[\s\S]{0,240}\.\s*(?:${methodPattern})\s*\(`,
  "i",
);

for (const file of walk(SRC_DIR)) {
  const content = readFileSync(file, "utf8");
  if (mutationRegex.test(content)) {
    findings.push(relative(ROOT, file).replaceAll("\\", "/"));
  }
}

if (findings.length > 0) {
  console.error("Frontend mutations to critical tables are not allowed. Move these writes behind audited Edge Functions:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("No frontend admin_review_queue/integration_outbox/messages mutations found.");
