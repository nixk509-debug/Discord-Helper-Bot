# Dashboard Reliability Design (2026-03-07)

## Context
The dashboard had three high-impact failures:
- Members view did not show full server membership.
- Custom commands were unreliable and did not consistently send text/embed outputs.
- Role/channel ID entry in key flows was manual and slow.

## Scope
Selected approach: balanced fix for high-impact reliability and UX.
- Fix custom command execution for text/embed/both.
- Fix members API to use live Discord guild members and enrich with DB data.
- Add role/channel pickers in:
  - Custom Commands permissions
  - Welcome/Leave channel + auto role setup
  - Verify module channel/role settings

## Architecture
### Backend
- Add `GET /api/servers/:serverId/discord-context`
  - Returns live guild channels and roles for picker UIs.
- Replace `/api/servers/:serverId/members` source
  - Load guild members from Discord.
  - Merge warning/note/economy counters from DB.
  - Keep pagination/search behavior.
- Refactor custom command message handler
  - Respect `responseType` (`text`, `embed`, `both`).
  - Normalize role/channel ID checks for permission filters.
  - Build and send embed payloads safely.

### Frontend
- Add `useDiscordContext(serverId)` hook.
- Use context-backed selectors in targeted modules.
- Keep ID fields as fallback where practical.

## Data Flow
- Dashboard requests Discord context for selected server.
- Picker stores IDs but displays friendly names.
- Members page reads full guild member cache/fetch and merges DB metadata.
- Custom command execution resolves text variables, optionally constructs embed, and sends one response path.

## Error Handling
- Return explicit errors if bot is offline or not in guild.
- Skip malformed command payloads safely with logs.
- Preserve existing dashboard operations if context is unavailable.

## Validation Plan
- TypeScript check (`npm run check`).
- Manual smoke checks:
  - Command text-only, embed-only, both.
  - Members pagination/search includes full guild population.
  - Picker selection in commands/welcome/verify writes IDs correctly.

