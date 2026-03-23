import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.resolve(projectRoot, ".env");

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
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnv(envPath);

if (!process.env.DATABASE_URL) {
  console.error("[ensure-custom-command-v2-schema] DATABASE_URL is missing after loading .env");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const statements = [
  `
    CREATE TABLE IF NOT EXISTS custom_commands_v2 (
      id serial PRIMARY KEY,
      server_id integer NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      schema_version integer NOT NULL DEFAULT 1,
      kind text NOT NULL DEFAULT 'archivist-command',
      enabled boolean DEFAULT true,
      trigger_type text NOT NULL,
      definition jsonb NOT NULL,
      compiled jsonb NOT NULL,
      import_source jsonb DEFAULT null,
      last_validation jsonb DEFAULT '[]'::jsonb,
      usage_count integer NOT NULL DEFAULT 0,
      last_run_at timestamp,
      created_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `,
  `
    ALTER TABLE custom_commands_v2
    ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;
  `,
  `
    ALTER TABLE custom_commands_v2
    ADD COLUMN IF NOT EXISTS last_run_at timestamp;
  `,
  `
    ALTER TABLE custom_commands_v2
    ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
  `,
  `
    ALTER TABLE custom_commands_v2
    ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'archivist-command';
  `,
];

try {
  await client.connect();
  for (const statement of statements) {
    await client.query(statement);
  }
  console.log("[ensure-custom-command-v2-schema] custom_commands_v2 is ready.");
} finally {
  await client.end().catch(() => null);
}
