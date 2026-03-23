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
  console.error("[ensure-site-content-schema] DATABASE_URL is missing after loading .env");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const statements = [
  `
    CREATE TABLE IF NOT EXISTS site_content_surfaces (
      id serial PRIMARY KEY,
      surface_key text NOT NULL UNIQUE,
      schema_version integer NOT NULL DEFAULT 1,
      draft_content jsonb NOT NULL,
      published_content jsonb NOT NULL,
      updated_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      published_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
      updated_by_label text,
      published_by_label text,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now(),
      published_at timestamp
    );
  `,
  `
    ALTER TABLE site_content_surfaces
    ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
  `,
  `
    ALTER TABLE site_content_surfaces
    ADD COLUMN IF NOT EXISTS updated_by_user_id integer REFERENCES users(id) ON DELETE SET NULL;
  `,
  `
    ALTER TABLE site_content_surfaces
    ADD COLUMN IF NOT EXISTS published_by_user_id integer REFERENCES users(id) ON DELETE SET NULL;
  `,
  `
    ALTER TABLE site_content_surfaces
    ADD COLUMN IF NOT EXISTS updated_by_label text;
  `,
  `
    ALTER TABLE site_content_surfaces
    ADD COLUMN IF NOT EXISTS published_by_label text;
  `,
  `
    ALTER TABLE site_content_surfaces
    ADD COLUMN IF NOT EXISTS published_at timestamp;
  `,
];

try {
  await client.connect();
  for (const statement of statements) {
    await client.query(statement);
  }
  console.log("[ensure-site-content-schema] site_content_surfaces is ready.");
} finally {
  await client.end().catch(() => null);
}
