# NexBot Dashboard

## Overview

NexBot is a comprehensive Discord bot management dashboard with 12+ configurable modules. It provides a web-based interface for configuring Discord bot settings across multiple servers. The app follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database. Dark gaming aesthetic with purple/blue neon glows and glassmorphism effects.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a three-folder monorepo pattern:
- **`client/`** — React single-page application (frontend)
- **`server/`** — Express API server (backend)
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
- **Storage Layer**: `server/storage.ts` provides a `DatabaseStorage` class implementing `IStorage` interface for all database operations
- **Dev Server**: Vite middleware serves the frontend in development; in production, static files are served from `dist/public`
- **Build**: Custom build script (`script/build.ts`) uses Vite for client and esbuild for server, outputting to `dist/`

### Database
- **Database**: PostgreSQL (required — `DATABASE_URL` environment variable must be set)
- **ORM**: Drizzle ORM with `drizzle-orm/node-postgres`
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Validation**: `drizzle-zod` generates Zod schemas from Drizzle table definitions
- **Connection**: Uses `pg.Pool` configured in `server/db.ts`

### Database Schema
15 tables total:
1. **`servers`** — Discord servers (guilds): id, discordId, name, iconUrl, memberCount, joinedAt, ownerId
2. **`server_settings`** — Per-server config: prefix, welcome/leave, automod (6 filters + raid protection), whitelists, mod settings
3. **`custom_commands`** — Commands with description, cooldown, aliases, role restrictions, channel restrictions, responseType, embedResponse, deleteInvocation, dmResponse, variables
4. **`embeds`** — Embed templates with full Components v2 support (Section, Separator, TextDisplay, MediaGallery, Container, Thumbnail, Header, ActionRow, File, Button, SelectMenu)
5. **`channel_settings`** — Per-channel overrides: slowmode, automod override, content restrictions, lockdown, NSFW
6. **`reaction_roles`** — Emoji-to-role mappings with toggle/add_only/remove_only/unique modes
7. **`auto_roles`** — Auto-assigned roles on join with delay and type filter
8. **`warnings`** — User warnings with moderator tracking
9. **`punishment_config`** — Warning threshold → action escalation rules
10. **`leveling_config`** — XP system with role rewards, multipliers, ignored channels/roles
11. **`starboard_config`** — Star reactions highlighting with threshold and custom emoji
12. **`ticket_config`** — Support ticket system configuration
13. **`ticket_panels`** — Embeddable ticket creation panels
14. **`scheduled_messages`** — Recurring/one-time messages with cron scheduling
15. **`audit_log_config`** — Multi-channel logging with event categories and webhooks

Relations are defined with Drizzle's `relations()` API.

### Shared Contract (`shared/`)
- **`shared/schema.ts`** — Drizzle table definitions, relations, and insert schemas
- **`shared/routes.ts`** — API route contract defining paths, methods, and Zod response schemas with `buildUrl` helper

### Key Pages
- `/` — Landing page with hero section, stats, and 12-module feature showcase
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

### Hooks (`client/src/hooks/use-bot.ts`)
Complete React Query hooks for all 15 tables: useStats, useServers, useServer, useUpdateSettings, useCommands (CRUD), useEmbeds (CRUD), useChannelSettings (CRUD), useReactionRoles (CRUD), useAutoRoles (CRUD), useWarnings (CRUD + clear), usePunishments (CRUD), useLeveling, useStarboard, useTicketConfig, useTicketPanels (CRUD), useScheduledMessages (CRUD), useAuditLogConfig

## External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **shadcn/ui** — Component library configured via `components.json` (new-york style, TSX, Tailwind CSS variables)
- **Google Fonts** — Outfit, Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter loaded via CDN
- **Replit Plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (dev only)
- **connect-pg-simple** — PostgreSQL session store (available but session auth not fully implemented yet)
- **express-session** — Session middleware (in dependencies)
