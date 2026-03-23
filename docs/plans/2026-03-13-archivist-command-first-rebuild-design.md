## Archivist Command-First Rebuild

### Goal
- Rebuild Archivist as a production Discord bot centered on slash commands.
- Ship a serious first foundation for channel and role management.
- Keep the dashboard lightweight and future-ready instead of feature-bloated.

### Why This Rebuild
- The current repo still carries an older dashboard-first architecture.
- Legacy bot behavior is concentrated in one large runtime entry and is difficult to extend safely.
- The next stable product should be command-first, with the web app acting as support infrastructure.

### New Core Shape
- `server/archivist/config`
- `server/archivist/bot`
- `server/archivist/commands`
- `server/archivist/features/channel`
- `server/archivist/features/role`
- `server/archivist/lib/discord`
- `server/archivist/lib/guards`
- `server/archivist/lib/logger`
- `server/archivist/lib/utils`

### Runtime Flow
1. Start Discord client.
2. Build command registry.
3. Register slash commands through a shared registrar.
4. On interaction:
   - create command context
   - run permission and hierarchy guards
   - validate command inputs
   - execute feature service
   - send a shared response format
   - record structured activity/failure logs

### First Working Modules
- `/channel`
  - `create`
  - `edit`
  - `clone`
  - `lock`
  - `unlock`
  - `slowmode`
  - `move`
  - `sync`
  - `perms`
  - `delete`
- `/role`
  - `create`
  - `edit`
  - `color`
  - `position`
  - `assign`
  - `remove`
  - `hoist`
  - `mentionable`
  - `perms`
  - `delete`

### Shared Safety
- Shared error model for validation, permission, hierarchy, and Discord API failures.
- Shared reply helpers for success, warning, and failure responses.
- Shared permission guards for user and bot.
- Shared hierarchy guards for manageable roles and members.
- Shared parsing helpers for permission bitfields, confirmation tokens, colors, and target validation.

### Logging
- Structured runtime logger for startup, registration, execution, and failures.
- In-memory recent activity store for the first dashboard Overview and Logs pages.
- Future-ready data shape so logs can later be persisted without changing the UI contracts.

### Dashboard Scope
- Keep the current dashboard secondary to the bot.
- First shell:
  - `Overview`
  - `Channel System`
  - `Role System`
  - `Logs`
  - `Settings`
- Only `Overview` is fully implemented in this phase.
- Remaining pages are lightweight, typed scaffolds with real routing and future-ready content boundaries.

### Cutover Plan
- Replace `server/bot/index.ts` with a small compatibility wrapper around the new Archivist core.
- Keep `server/index.ts` startup intact.
- Add focused API endpoints for Overview and Logs.
- Refactor the live dashboard routes away from Studio-centric copy and into command-system surfaces.
