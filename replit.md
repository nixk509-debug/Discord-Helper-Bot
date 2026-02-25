# NexBot Dashboard

## Overview

NexBot is a Discord bot management dashboard. It provides a web-based interface for configuring Discord bot settings across multiple servers, including welcome/leave messages, auto-moderation, logging, and custom commands. The app follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database.

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
- **Route Registration**: Routes defined in `server/routes.ts` via `registerRoutes()`, using route definitions from `shared/routes.ts`
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
Four main tables:
1. **`servers`** — Discord servers (guilds) the bot is in: `id`, `discordId`, `name`, `iconUrl`, `memberCount`, `joinedAt`, `ownerId`
2. **`server_settings`** — Per-server configuration: prefix, welcome/leave messages, automod settings (anti-spam, anti-link, banned words), logging channel and events. References `servers` with cascade delete.
3. **`custom_commands`** — User-defined bot commands per server: `name`, `response`. References `servers` with cascade delete.
4. **`embeds`** — Saved embed templates per server: `name`, `title`, `description`, `url`, `color`, `timestamp`, footer/image/thumbnail/author fields, `fields` (jsonb array), `components` (jsonb array for Discord Components v2 — buttons and select menus). References `servers` with cascade delete.

Relations are defined with Drizzle's `relations()` API, enabling eager loading via `db.query.*.findMany({ with: { ... } })`.

### Shared Contract (`shared/`)
- **`shared/schema.ts`** — Drizzle table definitions, relations, and insert schemas
- **`shared/routes.ts`** — API route contract defining paths, methods, and Zod response schemas. Both client and server import from here to ensure type safety. Includes a `buildUrl` helper for parameterized routes and typed input/output types.

### Key Pages
- `/` — Landing page with hero section and bot stats
- `/dashboard` — Server list overview
- `/dashboard/servers/:id` — Server-specific settings with tabs for General, Automod, Logging, Custom Commands, and Embed Builder

### Embed Builder
- Located in `client/src/components/embed-builder/` with two files:
  - `embed-builder-tab.tsx` — Main form with collapsible sections for Content, Author, Fields, Images, Footer, and Components (Buttons/Select Menus)
  - `embed-preview.tsx` — Live Discord-style embed preview that mirrors actual Discord rendering
- Supports full Discord embed fields: title, description, URL, color (hex picker + presets), timestamp, footer, images, thumbnail, author, inline fields
- Components v2: Buttons (5 styles: Primary, Secondary, Success, Danger, Link) with label/emoji/customId/url; Select Menus with customId, placeholder, and multiple options (label/value/description)
- Hooks in `client/src/hooks/use-bot.ts`: `useEmbeds`, `useCreateEmbed`, `useUpdateEmbed`, `useDeleteEmbed`
- API endpoints: `GET/POST /api/servers/:serverId/embeds`, `PATCH/DELETE /api/embeds/:id`

## External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **shadcn/ui** — Component library configured via `components.json` (new-york style, TSX, Tailwind CSS variables)
- **Google Fonts** — Outfit, Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter loaded via CDN
- **Replit Plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (dev only)
- **connect-pg-simple** — PostgreSQL session store (available but session auth not fully implemented yet)
- **express-session** — Session middleware (in dependencies)