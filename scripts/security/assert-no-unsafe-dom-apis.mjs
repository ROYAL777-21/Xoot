import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const patterns = [
  { name: "React dangerouslySetInnerHTML", regex: /\bdangerouslySetInnerHTML\b/ },
  { name: "raw innerHTML assignment", regex: /\.innerHTML\b/ },
  { name: "raw outerHTML assignment", regex: /\.outerHTML\b/ },
  { name: "raw insertAdjacentHTML", regex: /\.insertAdjacentHTML\s*\(/ },
  { name: "document.write", regex: /\bdocument\.write\s*\(/ },
  { name: "eval execution", regex: /\beval\s*\(/ },
  { name: "Function constructor", regex: /\bnew\s+Function\b/ },
  { name: "string setTimeout execution", regex: /\bsetTimeout\s*\(\s*["'`]/ },
  { name: "string setInterval execution", regex: /\bsetInterval\s*\(\s*["'`]/ },
  { name: "Mapbox HTML popup", regex: /\.setHTML\s*\(/ },
];

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

for (const file of walk(SRC_DIR)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) findings.push(`${rel}:${index + 1} ${pattern.name}`);
    }
  });
}

if (findings.length > 0) {
  console.error("Unsafe DOM or string-execution APIs found in frontend source:");
  for (const finding of findings) console.error(`- ${finding}`);
  console.error("Use React text rendering, textContent, DOM node creation, or a reviewed sanitizer instead.");
  process.exit(1);
}

console.log("No unsafe frontend DOM execution APIs found.");
