import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.resolve(projectRoot, ".env");
const serverEntry = path.resolve(projectRoot, "dist/index.cjs");

function loadDotEnv(filePath = ".env") {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnv(envPath);
process.env.NODE_ENV = "production";

if (!existsSync(serverEntry)) {
  console.error(`[start-prod] Missing build output: ${serverEntry}`);
  console.error("[start-prod] Run `npm run build` before `npm run start`.");
  process.exit(1);
}

const child = spawn(process.execPath, [serverEntry], {
  stdio: "inherit",
  env: process.env,
  cwd: projectRoot,
});

const forward = (signal) => {
  if (!child.killed) child.kill(signal);
};

process.on("SIGINT", forward);
process.on("SIGTERM", forward);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
