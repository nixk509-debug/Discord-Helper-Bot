# Archivist Dashboard

## Overview

Archivist is a comprehensive Discord bot management dashboard with 20+ configurable modules, Discord OAuth login, Stripe premium subscriptions, and a discord.js v14 bot runtime. It provides a web-based interface for configuring Discord bot settings across multiple servers. Deep obsidian black + rich red gradient theme with glassmorphism effects. Features exclusive modules: visual node-based automation flow builder, full server economy, member intelligence CRM, activity heatmap, HTTP request actions in commands, persistent variable storage, interactive embed components, and a command sharing marketplace.

## Recent Work

- **Custom Commands massively upgraded**: 100+ variables across 14 color-coded categories, VariableReference component with search + beginner/advanced toggle, SymbolsBoard with 8 categories + recently-used tracking, ResponseVariations (up to 5 random alternates), Quick-Start Templates gallery with 8 pre-built commands, 6-tab command editor (Basic/Response/Symbols/HTTP/Perms/Preview)
- **Visual identity**: AI-generated archivist-avatar.png, hero-art.png, dashboard-art.png — applied to login (split-screen), premium (hero banner), dashboard overview (welcome banner), sidebar, landing (floating hero art, comparison table, "How It Works" steps, "vs. other bots" pills)
- **Landing page**: Stats bar, comparison table (Archivist vs MEE6/Carl-bot/Dyno), "How It Works" 3-step section, EXCLUSIVE badges on 4 highlight feature cards
- **All 20+ modules** in sidebar with correct group organization, active state styling with red gradient pill
- **Platform infrastructure upgrade**: Config audit/snapshot system, Code Vault (invite codes with role grants), Channel Sync templates, Smart Permissions matrix, WebSocket realtime sync, 6 new slash command groups (/fun /set /lock /code /audit /sync), 5 new dashboard pages (Server Control, Code Vault, Audit History, Channel Sync, Permissions)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a three-folder monorepo pattern:
- **`client/`** — React single-page application (frontend)
- **`server/`** — Express API server (backend)
- **`server/bot/`** — Discord bot runtime (discord.js v14)
- **`shared/`** — Shared types, schemas, and route definitions used by both client and server

### Frontend (`client/`)
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router) — important: do NOT nest `<a>` tags inside `<Link>` components
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming, dark gaming aesthetic with purple/blue neon glows and glassmorphism effects
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, located in `client/src/components/ui/`
- **Fonts**: Outfit (display), Inter (body)
- **Animations**: Framer Motion for page transitions and interactive feedback
- **Charts**: Recharts for dashboard analytics
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Build Tool**: Vite with path aliases (`@/` → `client/src/`, `@shared/` → `shared/`)

### Backend (`server/`)
- **Framework**: Express 5 on Node.js
- **Runtime**: tsx for TypeScript execution in development
- **API Pattern**: RESTful JSON API, all routes prefixed with `/api/`
- **Route Registration**: Routes defined in `server/routes.ts` via `registerRoutes(server, app)`, using route definitions from `shared/routes.ts`
- **Storage Layer**: `server/storage.ts` provides a `DatabaseStorage` class for all database operations
- **Dev Server**: Vite middleware serves the frontend in development; in production, static files are served from `dist/public`
- **Build**: Custom build script (`script/build.ts`) uses Vite for client and esbuild for server, outputting to `dist/`

### Authentication (`server/auth.ts`)
- **Strategy**: Discord OAuth2 via `passport-discord`
- **Session Store**: PostgreSQL via `connect-pg-simple`
- **Routes**: `/auth/discord`, `/auth/discord/callback`, `/auth/logout`, `/api/auth/me`, `/api/auth/guilds`
- **Middleware**: `requireAuth` (401 if not logged in), `requirePremium` (403 if not premium)
- **Guild Filtering**: Dashboard only shows servers where user has MANAGE_GUILD permission
- **Env Vars**: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`

### Discord Bot (`server/bot/index.ts`)
- **Runtime**: discord.js v14 with slash commands
- **Commands**: `/setup`, `/premium`, `/help`
- **Custom Commands**: Executed from DB with variable resolution ({user}, {server}, {channel}, {random:...})
- **Trigger Types**: command, keyword, regex, startsWith
- **Auto-setup**: When bot joins a server, auto-creates DB entry with default settings
- **Env Vars**: `DISCORD_BOT_TOKEN` (optional — bot won't start without it, dashboard still works)

### Stripe Integration (`server/stripe.ts`, `server/stripeClient.ts`)
- **Package**: `stripe` + `stripe-replit-sync` via Replit Stripe integration
- **Webhook**: `/api/stripe/webhook` registered BEFORE `express.json()` middleware
- **Routes**: `/api/premium/checkout`, `/api/premium/portal`, `/api/premium/status`, `/api/premium/products`, `/api/premium/key`
- **Schema**: `stripe-replit-sync` manages its own `stripe` schema — NEVER insert into stripe tables directly
- **Init Order**: `runMigrations()` → `getStripeSync()` → `findOrCreateManagedWebhook()` → `syncBackfill()`
- **Premium**: Owner IDs env var override always returns premium. Subscription via Stripe Checkout.

### Database
- **Database**: PostgreSQL (required — `DATABASE_URL` environment variable must be set)
- **ORM**: Drizzle ORM with `drizzle-orm/node-postgres`
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Validation**: `drizzle-zod` generates Zod schemas from Drizzle table definitions
- **Connection**: Uses `pg.Pool` configured in `server/db.ts`

### Database Schema
17 tables total:
1. **`users`** — Discord user data: id, discordId, username, discriminator, avatar, email, accessToken, refreshToken, isPremium, premiumSince, premiumExpiresAt, stripeCustomerId, stripeSubscriptionId, createdAt
2. **`templates`** — Saved embed/panel templates: id, userId, serverId, name, type, data (jsonb), createdAt. Limit: 10 for all users (free tier mode)
3. **`servers`** — Discord servers (guilds): id, discordId, name, iconUrl, memberCount, joinedAt, ownerId
4. **`server_settings`** — Per-server config: prefix, welcome/leave, automod (6 filters + raid protection), whitelists, mod settings
5. **`custom_commands`** — Commands with triggerType (command/keyword/regex/startsWith), conditions (jsonb), actions (jsonb), usageCount, lastUsedAt, premiumOnly, plus existing fields
6. **`embeds`** — Embed templates with full Components v2 support
7. **`channel_settings`** — Per-channel overrides
8. **`reaction_roles`** — Emoji-to-role mappings with modes
9. **`auto_roles`** — Auto-assigned roles on join
10. **`warnings`** — User warnings with moderator tracking
11. **`punishment_config`** — Warning threshold → action escalation rules
12. **`leveling_config`** — XP system with role rewards, multipliers
13. **`starboard_config`** — Star reactions highlighting
14. **`ticket_config`** — Support ticket system configuration
15. **`ticket_panels`** — Embeddable ticket creation panels
16. **`scheduled_messages`** — Recurring/one-time messages with cron scheduling
17. **`audit_log_config`** — Multi-channel logging with event categories and webhooks

Relations are defined with Drizzle's `relations()` API.

### Shared Contract (`shared/`)
- **`shared/schema.ts`** — Drizzle table definitions, relations, insert schemas, types
- **`shared/routes.ts`** — API route contract defining paths, methods, and Zod response schemas with `buildUrl` helper

### Key Pages
- `/` — Landing page with hero section, stats, login button, and 12-module feature showcase
- `/login` — Discord OAuth login page
- `/premium` — Premium subscription page with free/premium comparison, Stripe checkout
- `/dashboard` — Server list overview with stats cards and module badges
- `/dashboard/servers/:id` — Server settings with sidebar navigation for all modules

### Server Settings Layout
- Left sidebar navigation grouped into categories: Core, Moderation, Engagement, Utilities, Logging
- Each module has enabled/disabled status indicator (green/gray dot)
- Mobile: sidebar collapses to a sheet
- Component: `client/src/components/layout/server-settings-layout.tsx`

### Module Components
All in `client/src/components/`:
- `automod/automod-tab.tsx` — 6 filters, banned words chips, whitelists, raid protection, automod log
- `channels/channels-tab.tsx` — Per-channel settings, bulk operations, status badges
- `commands/commands-tab.tsx` — Full command builder with variables, embed responses, preview, search/sort/bulk actions
- `embed-builder/embed-builder-tab.tsx` — Full Components v2, JSON import/export, templates
- `embed-builder/embed-preview.tsx` — Live Discord-style preview for all component types
- `leveling/leveling-tab.tsx` — XP settings, role rewards, multipliers, leaderboard preview
- `logging/logging-tab.tsx` — Multi-channel logging, event categories, webhook, ignore lists
- `moderation/moderation-tab.tsx` — Warnings CRUD, punishment escalation, mod settings
- `reaction-roles/reaction-roles-tab.tsx` — Emoji-to-role mapper with modes
- `scheduled-messages/scheduled-messages-tab.tsx` — Cron scheduling with presets, timezone
- `starboard/starboard-tab.tsx` — Config with preview
- `tickets/tickets-tab.tsx` — Config + panel builder
- `welcome/welcome-tab.tsx` — Welcome/leave messages, preview, auto roles

### Hooks
- **`client/src/hooks/use-bot.ts`** — React Query hooks for all 15+ tables
- **`client/src/hooks/use-auth.ts`** — Auth hooks: useAuth, useLogout, useGuilds, usePremiumStatus, getAvatarUrl

## Environment Variables

Required:
- **`DATABASE_URL`** — PostgreSQL connection string (auto-set by Replit)
- **`SESSION_SECRET`** — Express session secret

Optional (for Discord bot):
- **`DISCORD_BOT_TOKEN`** — Bot token from Discord Developer Portal
- **`DISCORD_CLIENT_ID`** — OAuth2 application client ID
- **`DISCORD_CLIENT_SECRET`** — OAuth2 application client secret
- **`OWNER_IDS`** — Comma-separated Discord user IDs that always get premium access

Managed by Replit:
- Stripe integration credentials (via Replit Stripe connector)
- Discord integration (via Replit Discord connector)

## External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL`
- **discord.js** v14 — Discord bot runtime with slash commands
- **stripe** + **stripe-replit-sync** — Payment processing via Replit Stripe integration
- **passport-discord** — Discord OAuth2 authentication
- **express-session** + **connect-pg-simple** — Session management with PostgreSQL store
- **shadcn/ui** — Component library configured via `components.json` (new-york style)
- **Google Fonts** — Outfit, Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter loaded via CDN
- **Replit Plugins** — dev banner, runtime error modal, cartographer
