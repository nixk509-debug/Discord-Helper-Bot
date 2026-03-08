ALTER TABLE server_settings
  ADD COLUMN IF NOT EXISTS welcome_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS welcome_dm_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS leave_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS verify_studio_document_id integer,
  ADD COLUMN IF NOT EXISTS verify_publication_id integer,
  ADD COLUMN IF NOT EXISTS verify_entry_view_id text;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS studio_state jsonb DEFAULT '{"recentEmoji":[],"favoriteEmoji":[]}'::jsonb;

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

CREATE INDEX IF NOT EXISTS studio_documents_server_id_idx ON studio_documents(server_id);
CREATE INDEX IF NOT EXISTS studio_documents_slug_idx ON studio_documents(slug);
CREATE INDEX IF NOT EXISTS studio_publications_server_id_idx ON studio_publications(server_id);
CREATE INDEX IF NOT EXISTS studio_publications_document_id_idx ON studio_publications(document_id);
CREATE INDEX IF NOT EXISTS studio_publication_snapshots_publication_id_idx ON studio_publication_snapshots(publication_id);
CREATE INDEX IF NOT EXISTS studio_runtime_events_server_id_idx ON studio_runtime_events(server_id);
