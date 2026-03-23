import { pool } from "./db";

const RUNTIME_SCHEMA_SQL = `
ALTER TABLE server_settings
  ADD COLUMN IF NOT EXISTS bot_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS behavior_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS welcome_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS welcome_dm_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS leave_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS verify_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS verify_publication_id integer,
  ADD COLUMN IF NOT EXISTS verify_entry_view_id text,
  ADD COLUMN IF NOT EXISTS server_premium_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS server_premium_status text,
  ADD COLUMN IF NOT EXISTS server_premium_provider text,
  ADD COLUMN IF NOT EXISTS server_premium_since timestamp,
  ADD COLUMN IF NOT EXISTS server_premium_expires_at timestamp,
  ADD COLUMN IF NOT EXISTS server_premium_last_event text,
  ADD COLUMN IF NOT EXISTS server_premium_last_webhook_at timestamp,
  ADD COLUMN IF NOT EXISTS server_premium_metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE channel_settings
  ADD COLUMN IF NOT EXISTS channel_type text,
  ADD COLUMN IF NOT EXISTS parent_channel_id text,
  ADD COLUMN IF NOT EXISTS channel_meta jsonb DEFAULT '{}'::jsonb;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS studio_state jsonb DEFAULT '{"recentEmoji":[],"favoriteEmoji":[]}'::jsonb;

ALTER TABLE custom_commands
  ADD COLUMN IF NOT EXISTS trigger_config jsonb DEFAULT '{}'::jsonb;

UPDATE custom_commands
SET trigger_config = '{}'::jsonb
WHERE trigger_config IS NULL;

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
  import_source jsonb DEFAULT NULL,
  last_validation jsonb DEFAULT '[]'::jsonb,
  usage_count integer NOT NULL DEFAULT 0,
  last_run_at timestamp,
  created_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE custom_commands_v2
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_run_at timestamp;

CREATE TABLE IF NOT EXISTS custom_command_v2_sessions (
  id serial PRIMARY KEY,
  server_id integer NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  command_id integer NOT NULL REFERENCES custom_commands_v2(id) ON DELETE CASCADE,
  continuation_type text NOT NULL,
  step_id text NOT NULL,
  next_step_id text NOT NULL,
  on_timeout_step_id text,
  actor_id text,
  channel_id text,
  message_id text,
  custom_id text,
  custom_ids jsonb DEFAULT '[]'::jsonb,
  accepted_values jsonb DEFAULT '[]'::jsonb,
  definition jsonb NOT NULL,
  compiled jsonb NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  input jsonb DEFAULT '{}'::jsonb,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE ticket_panels
  ADD COLUMN IF NOT EXISTS studio_document_id integer,
  ADD COLUMN IF NOT EXISTS publication_id integer,
  ADD COLUMN IF NOT EXISTS entry_view_id text;

CREATE TABLE IF NOT EXISTS studio_documents (
  id serial PRIMARY KEY,
  server_id integer NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  owner_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'server',
  kind text NOT NULL DEFAULT 'surface',
  name text NOT NULL,
  slug text,
  module_binding text,
  document jsonb NOT NULL,
  is_archived boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_publications (
  id serial PRIMARY KEY,
  server_id integer NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  document_id integer NOT NULL REFERENCES studio_documents(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  message_id text NOT NULL,
  active boolean DEFAULT true,
  status text NOT NULL DEFAULT 'published',
  current_snapshot_id integer,
  current_view_id text,
  last_published_at timestamp DEFAULT now(),
  last_interaction_at timestamp,
  last_failure_at timestamp,
  last_failure_summary text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_publication_snapshots (
  id serial PRIMARY KEY,
  publication_id integer NOT NULL REFERENCES studio_publications(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  created_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_runtime_events (
  id serial PRIMARY KEY,
  server_id integer NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  publication_id integer REFERENCES studio_publications(id) ON DELETE SET NULL,
  document_id integer REFERENCES studio_documents(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'info',
  event_type text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  node_id text,
  action_id text,
  occurred_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_library_items (
  id serial PRIMARY KEY,
  server_id integer NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  owner_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'personal',
  category text NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  favorite boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS studio_documents_server_id_idx ON studio_documents(server_id);
CREATE INDEX IF NOT EXISTS studio_documents_slug_idx ON studio_documents(slug);
CREATE INDEX IF NOT EXISTS studio_publications_server_id_idx ON studio_publications(server_id);
CREATE INDEX IF NOT EXISTS studio_publications_document_id_idx ON studio_publications(document_id);
CREATE INDEX IF NOT EXISTS studio_publication_snapshots_publication_id_idx ON studio_publication_snapshots(publication_id);
CREATE INDEX IF NOT EXISTS studio_runtime_events_server_id_idx ON studio_runtime_events(server_id);
CREATE INDEX IF NOT EXISTS studio_library_items_server_id_idx ON studio_library_items(server_id);
CREATE INDEX IF NOT EXISTS studio_library_items_scope_idx ON studio_library_items(scope);
CREATE INDEX IF NOT EXISTS custom_commands_v2_server_id_idx ON custom_commands_v2(server_id);
CREATE INDEX IF NOT EXISTS custom_commands_v2_slug_idx ON custom_commands_v2(server_id, slug);
CREATE INDEX IF NOT EXISTS custom_command_v2_sessions_server_id_idx ON custom_command_v2_sessions(server_id);
CREATE INDEX IF NOT EXISTS custom_command_v2_sessions_command_id_idx ON custom_command_v2_sessions(command_id);
CREATE INDEX IF NOT EXISTS custom_command_v2_sessions_pending_idx ON custom_command_v2_sessions(server_id, continuation_type, consumed_at, expires_at);
`;

let schemaEnsured = false;

export async function ensureRuntimeSchema() {
  if (schemaEnsured) return;
  await pool.query(RUNTIME_SCHEMA_SQL);
  schemaEnsured = true;
  console.log("[db] Runtime schema ensured");
}
