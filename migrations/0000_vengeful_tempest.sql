CREATE TABLE "audit_log_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"enabled" boolean DEFAULT false,
	"message_log_channel" text,
	"member_log_channel" text,
	"mod_log_channel" text,
	"server_log_channel" text,
	"voice_log_channel" text,
	"enabled_events" jsonb DEFAULT '[]'::jsonb,
	"format" text DEFAULT 'detailed',
	"webhook_url" text,
	"ignored_channels" jsonb DEFAULT '[]'::jsonb,
	"ignored_roles" jsonb DEFAULT '[]'::jsonb,
	"category_webhooks" jsonb DEFAULT '{}'::jsonb,
	"ignored_users" jsonb DEFAULT '[]'::jsonb,
	"ignored_bots" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "auto_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"role_id" text NOT NULL,
	"role_name" text NOT NULL,
	"delay" integer DEFAULT 0,
	"type" text DEFAULT 'join'
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"flow" jsonb DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
	"trigger_type" text DEFAULT 'message',
	"last_run_at" timestamp,
	"run_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "category_lock_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"category_id" text NOT NULL,
	"category_name" text,
	"snapshot" jsonb,
	"locked_at" timestamp DEFAULT now(),
	"locked_by" text,
	"unlocked" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "channel_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"slowmode" integer DEFAULT 0,
	"auto_delete_after" integer DEFAULT 0,
	"automod_override" boolean,
	"locked_down" boolean DEFAULT false,
	"allowed_content_types" jsonb DEFAULT '["text","images","embeds","files","stickers","links"]'::jsonb,
	"nsfw" boolean DEFAULT false,
	"topic" text,
	"custom_permissions" jsonb,
	"adaptive_slowmode_enabled" boolean DEFAULT false,
	"adaptive_slowmode_threshold" integer DEFAULT 10,
	"adaptive_slowmode_max" integer DEFAULT 30,
	"channel_anti_link_enabled" boolean DEFAULT false,
	"channel_anti_link_whitelist" jsonb DEFAULT '[]'::jsonb,
	"auto_purge_enabled" boolean DEFAULT false,
	"auto_purge_after_minutes" integer DEFAULT 60
);
--> statement-breakpoint
CREATE TABLE "channel_sync_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "command_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"source_share_code" text NOT NULL,
	"imported_command_id" integer,
	"imported_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "command_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"command_id" integer NOT NULL,
	"share_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'utility',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_public" boolean DEFAULT true,
	"view_count" integer DEFAULT 0,
	"import_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "command_shares_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "config_audit_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"module_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"changed_keys" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "config_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"module_id" text NOT NULL,
	"version" integer DEFAULT 1,
	"data" jsonb,
	"actor_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"response" text NOT NULL,
	"response_type" text DEFAULT 'text',
	"response_variations" jsonb DEFAULT '[]'::jsonb,
	"embed_response" jsonb,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"category" text DEFAULT 'general',
	"cooldown" integer DEFAULT 0,
	"cooldown_scope" text DEFAULT 'user',
	"required_roles" jsonb DEFAULT '[]'::jsonb,
	"blocked_roles" jsonb DEFAULT '[]'::jsonb,
	"allowed_channels" jsonb DEFAULT '[]'::jsonb,
	"blocked_channels" jsonb DEFAULT '[]'::jsonb,
	"enabled" boolean DEFAULT true,
	"delete_invocation" boolean DEFAULT false,
	"dm_response" boolean DEFAULT false,
	"trigger_type" text DEFAULT 'command',
	"conditions" jsonb DEFAULT '[]'::jsonb,
	"actions" jsonb DEFAULT '[]'::jsonb,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"premium_only" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "economy" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"username" text,
	"balance" integer DEFAULT 0,
	"total_earned" integer DEFAULT 0,
	"total_spent" integer DEFAULT 0,
	"last_daily" timestamp,
	"last_work" timestamp,
	"last_rob" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "economy_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_before" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "embeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"description" text,
	"url" text,
	"color" text,
	"timestamp" boolean DEFAULT false,
	"footer_text" text,
	"footer_icon_url" text,
	"image_url" text,
	"thumbnail_url" text,
	"author_name" text,
	"author_url" text,
	"author_icon_url" text,
	"fields" jsonb DEFAULT '[]'::jsonb,
	"components" jsonb DEFAULT '[]'::jsonb,
	"interactive_components" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "giveaways" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"prize" text NOT NULL,
	"description" text,
	"winners_count" integer DEFAULT 1,
	"requirements" jsonb DEFAULT '{}'::jsonb,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"is_active" boolean DEFAULT true,
	"winner_ids" jsonb DEFAULT '[]'::jsonb,
	"entry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guild_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"server_id" integer NOT NULL,
	"guild_discord_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"max_uses" integer,
	"uses_count" integer DEFAULT 0,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"grant_roles" jsonb DEFAULT '[]'::jsonb,
	"revoked" boolean DEFAULT false,
	"format" text DEFAULT 'plain',
	CONSTRAINT "guild_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "leveling_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"enabled" boolean DEFAULT false,
	"xp_per_message" integer DEFAULT 15,
	"xp_cooldown" integer DEFAULT 60,
	"level_up_channel_id" text,
	"level_up_message" text DEFAULT 'Congratulations {user}, you reached level {level}!',
	"ignored_channels" jsonb DEFAULT '[]'::jsonb,
	"ignored_roles" jsonb DEFAULT '[]'::jsonb,
	"role_rewards" jsonb DEFAULT '[]'::jsonb,
	"xp_multipliers" jsonb DEFAULT '[]'::jsonb,
	"stack_rewards" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "member_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"target_user_id" text NOT NULL,
	"target_username" text,
	"author_id" text NOT NULL,
	"author_username" text,
	"note" text NOT NULL,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"role_id" text NOT NULL,
	"role_name" text,
	"permission" text NOT NULL,
	"effect" text DEFAULT 'allow' NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"question" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb,
	"allow_multiple" boolean DEFAULT false,
	"anonymous" boolean DEFAULT false,
	"ends_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "punishment_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"warning_threshold" integer NOT NULL,
	"action" text NOT NULL,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "reaction_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"emoji" text NOT NULL,
	"role_id" text NOT NULL,
	"role_name" text NOT NULL,
	"mode" text DEFAULT 'toggle',
	"group_id" text
);
--> statement-breakpoint
CREATE TABLE "role_shop" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"role_id" text NOT NULL,
	"role_name" text NOT NULL,
	"price" integer NOT NULL,
	"duration" integer DEFAULT 0,
	"stock" integer DEFAULT -1,
	"total_sold" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"content" text,
	"embed_data" jsonb,
	"embed_id" integer,
	"cron_expression" text NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"enabled" boolean DEFAULT true,
	"last_run_at" timestamp,
	"next_run_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "server_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"date" text NOT NULL,
	"message_count" integer DEFAULT 0,
	"member_count" integer DEFAULT 0,
	"member_joins" integer DEFAULT 0,
	"member_leaves" integer DEFAULT 0,
	"commands_used" integer DEFAULT 0,
	"top_channels" jsonb DEFAULT '[]'::jsonb,
	"hourly_activity" jsonb DEFAULT '[]'::jsonb,
	"weekday_activity" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "server_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"prefix" text DEFAULT '!' NOT NULL,
	"bot_nickname" text,
	"locale" text DEFAULT 'en',
	"welcome_enabled" boolean DEFAULT false,
	"welcome_channel_id" text,
	"welcome_message" text,
	"welcome_embed_id" integer,
	"welcome_messages" jsonb DEFAULT '[]'::jsonb,
	"welcome_dm_enabled" boolean DEFAULT false,
	"welcome_dm_message" text,
	"onboarding_dms" jsonb DEFAULT '[]'::jsonb,
	"leave_enabled" boolean DEFAULT false,
	"leave_channel_id" text,
	"leave_message" text,
	"leave_embed_id" integer,
	"automod_enabled" boolean DEFAULT false,
	"anti_spam_enabled" boolean DEFAULT false,
	"anti_link_enabled" boolean DEFAULT false,
	"anti_caps_enabled" boolean DEFAULT false,
	"anti_emoji_spam_enabled" boolean DEFAULT false,
	"anti_mass_mention_enabled" boolean DEFAULT false,
	"anti_invite_enabled" boolean DEFAULT false,
	"anti_phishing_enabled" boolean DEFAULT false,
	"anti_zalgo_enabled" boolean DEFAULT false,
	"max_mentions" integer DEFAULT 5,
	"caps_threshold" integer DEFAULT 70,
	"banned_words" jsonb DEFAULT '[]'::jsonb,
	"automod_whitelisted_roles" jsonb DEFAULT '[]'::jsonb,
	"automod_whitelisted_channels" jsonb DEFAULT '[]'::jsonb,
	"automod_action" text DEFAULT 'delete',
	"automod_action_duration" integer DEFAULT 0,
	"automod_channel_overrides" jsonb DEFAULT '[]'::jsonb,
	"automod_time_rules" jsonb DEFAULT '[]'::jsonb,
	"mute_role_id" text,
	"mod_log_channel_id" text,
	"raid_protection_enabled" boolean DEFAULT false,
	"raid_join_threshold" integer DEFAULT 10,
	"raid_join_window" integer DEFAULT 10,
	"raid_action" text DEFAULT 'lockdown',
	"raid_min_account_age" integer DEFAULT 0,
	"log_channel_id" text,
	"log_events" jsonb DEFAULT '[]'::jsonb,
	"verify_enabled" boolean DEFAULT false,
	"verify_type" text DEFAULT 'button',
	"verify_channel_id" text,
	"verify_role_id" text,
	"verify_message" text,
	"verify_embed" jsonb,
	"verify_button_label" text DEFAULT 'Verify Me',
	"verify_log_channel_id" text,
	"unverified_role_id" text,
	"verify_min_account_age" integer DEFAULT 0,
	"verify_code_word" text,
	"nsfw_enabled" boolean DEFAULT false,
	"nsfw_age_verification_enabled" boolean DEFAULT false,
	"nsfw_verification_role_id" text,
	"nsfw_channels" jsonb DEFAULT '[]'::jsonb,
	"nsfw_restricted_roles" jsonb DEFAULT '[]'::jsonb,
	"nsfw_log_channel_id" text,
	"nsfw_auto_detect" boolean DEFAULT false,
	"nsfw_warn_on_access" boolean DEFAULT true,
	"economy_enabled" boolean DEFAULT false,
	"economy_currency_name" text DEFAULT 'Coins',
	"economy_currency_symbol" text DEFAULT '🪙',
	"economy_starting_balance" integer DEFAULT 100,
	"economy_daily_min" integer DEFAULT 50,
	"economy_daily_max" integer DEFAULT 200,
	"economy_work_min" integer DEFAULT 20,
	"economy_work_max" integer DEFAULT 100,
	"economy_work_messages" jsonb DEFAULT '[]'::jsonb,
	"economy_message_reward_enabled" boolean DEFAULT false,
	"economy_message_reward_amount" integer DEFAULT 5,
	"economy_voice_reward_enabled" boolean DEFAULT false,
	"economy_voice_reward_rate" integer DEFAULT 10,
	"economy_gambling_enabled" boolean DEFAULT true,
	"economy_rob_enabled" boolean DEFAULT false,
	"economy_rob_success_chance" integer DEFAULT 40,
	"voice_xp_enabled" boolean DEFAULT false,
	"voice_xp_rate" integer DEFAULT 5,
	"double_xp_events" jsonb DEFAULT '[]'::jsonb,
	"xp_decay_enabled" boolean DEFAULT false,
	"xp_decay_days" integer DEFAULT 30,
	"xp_decay_amount" integer DEFAULT 100,
	"xp_season_number" integer DEFAULT 1,
	"xp_season_reset_date" text,
	"xp_booster_roles" jsonb DEFAULT '[]'::jsonb,
	"server_control_mode" text DEFAULT 'normal',
	"quarantine_role_id" text,
	"lockdown_enabled" boolean DEFAULT false,
	"lockdown_bypass_role_ids" jsonb DEFAULT '[]'::jsonb,
	"lockdown_notify_channel_id" text,
	"raid_log_channel_id" text,
	"config_log_channel_id" text,
	"auto_log_channel_id" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "server_variables" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"scope" text DEFAULT 'server' NOT NULL,
	"user_id" text,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "server_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'incoming' NOT NULL,
	"channel_id" text,
	"webhook_url" text,
	"target_url" text,
	"events" jsonb DEFAULT '[]'::jsonb,
	"secret" text,
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"trigger_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"name" text NOT NULL,
	"icon_url" text,
	"member_count" integer DEFAULT 0,
	"joined_at" timestamp DEFAULT now(),
	"owner_id" text NOT NULL,
	CONSTRAINT "servers_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "starboard_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"enabled" boolean DEFAULT false,
	"channel_id" text,
	"threshold" integer DEFAULT 3,
	"emoji" text DEFAULT '⭐',
	"self_star" boolean DEFAULT false,
	"ignored_channels" jsonb DEFAULT '[]'::jsonb,
	"nsfw_allowed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"server_id" integer,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"enabled" boolean DEFAULT false,
	"category_channel_id" text,
	"support_role_id" text,
	"support_role_name" text,
	"max_tickets_per_user" integer DEFAULT 3,
	"naming_scheme" text DEFAULT 'ticket-{number}',
	"transcript_channel_id" text,
	"dm_on_close" boolean DEFAULT true,
	"departments" jsonb DEFAULT '[]'::jsonb,
	"canned_responses" jsonb DEFAULT '[]'::jsonb,
	"satisfaction_rating_enabled" boolean DEFAULT false,
	"auto_close_hours" integer DEFAULT 0,
	"sla_targets" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "ticket_panels" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"button_label" text DEFAULT 'Create Ticket',
	"button_emoji" text DEFAULT '🎫',
	"button_style" integer DEFAULT 1,
	"embed_color" text DEFAULT '#dc2626'
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"username" text NOT NULL,
	"discriminator" text,
	"avatar" text,
	"email" text,
	"access_token" text,
	"refresh_token" text,
	"is_premium" boolean DEFAULT false,
	"premium_since" timestamp,
	"premium_expires_at" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"moderator_id" text NOT NULL,
	"moderator_name" text,
	"reason" text NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_log_config" ADD CONSTRAINT "audit_log_config_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_roles" ADD CONSTRAINT "auto_roles_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_lock_snapshots" ADD CONSTRAINT "category_lock_snapshots_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_settings" ADD CONSTRAINT "channel_settings_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_sync_templates" ADD CONSTRAINT "channel_sync_templates_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_imports" ADD CONSTRAINT "command_imports_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_imports" ADD CONSTRAINT "command_imports_imported_command_id_custom_commands_id_fk" FOREIGN KEY ("imported_command_id") REFERENCES "public"."custom_commands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_shares" ADD CONSTRAINT "command_shares_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_shares" ADD CONSTRAINT "command_shares_command_id_custom_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."custom_commands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_audit_entries" ADD CONSTRAINT "config_audit_entries_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_snapshots" ADD CONSTRAINT "config_snapshots_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_commands" ADD CONSTRAINT "custom_commands_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economy" ADD CONSTRAINT "economy_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economy_transactions" ADD CONSTRAINT "economy_transactions_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeds" ADD CONSTRAINT "embeds_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_codes" ADD CONSTRAINT "guild_codes_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leveling_config" ADD CONSTRAINT "leveling_config_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_rules" ADD CONSTRAINT "permission_rules_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punishment_config" ADD CONSTRAINT "punishment_config_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction_roles" ADD CONSTRAINT "reaction_roles_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_shop" ADD CONSTRAINT "role_shop_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_insights" ADD CONSTRAINT "server_insights_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_settings" ADD CONSTRAINT "server_settings_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_variables" ADD CONSTRAINT "server_variables_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_webhooks" ADD CONSTRAINT "server_webhooks_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starboard_config" ADD CONSTRAINT "starboard_config_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_config" ADD CONSTRAINT "ticket_config_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_panels" ADD CONSTRAINT "ticket_panels_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;