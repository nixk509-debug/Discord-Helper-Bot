import fs from "node:fs";
import path from "node:path";

const target = path.resolve(process.cwd(), "dist/public/index.html");
if (!fs.existsSync(target)) {
  console.error(`[verify-build-output] Missing ${target}`);
  process.exit(1);
}

const size = fs.statSync(target).size;
if (size === 0) {
  console.error(`[verify-build-output] ${target} exists but is empty`);
  process.exit(1);
}

console.log(`[verify-build-output] OK: ${target} (${size} bytes)`);
