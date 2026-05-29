import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const files = [
  ["public/.htaccess", "dist/.htaccess"],
];

for (const [sourcePath, targetPath] of files) {
  const source = join(root, sourcePath);
  const target = join(root, targetPath);

  if (!existsSync(source)) continue;

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`Copied ${sourcePath} to ${targetPath}`);
}
