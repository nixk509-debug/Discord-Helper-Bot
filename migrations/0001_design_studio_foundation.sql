ALTER TABLE server_settings
  ADD COLUMN IF NOT EXISTS bot_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS behavior_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE channel_settings
  ADD COLUMN IF NOT EXISTS channel_type text,
  ADD COLUMN IF NOT EXISTS parent_channel_id text,
  ADD COLUMN IF NOT EXISTS channel_meta jsonb DEFAULT '{}'::jsonb;
