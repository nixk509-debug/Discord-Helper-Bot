# Premium Settings Control System Implementation Plan

## 1. Replace Settings Navigation

- Refactor the Settings entries in `client/src/lib/archivist-workspace.ts` to use the new premium route structure
- Add compatibility alias resolution so old slugs resolve to new canonical Settings routes
- Keep `overview` as the Settings home and redirect old routes to the new slugs automatically

## 2. Build Dedicated Settings Components

- Create a dedicated Settings control-system component module under `client/src/components/settings/`
- Implement reusable primitives for:
  - server status card
  - category cards
  - section hero
  - section blocks
  - intensify block
  - diagnostics block
  - quick action rows
  - status chips

## 3. Replace Inline Settings Content In Workspace

- Stop relying on the old inline Settings branches in `client/src/pages/dashboard/workspace.tsx` as the visible IA
- Route all visible Settings pages through the new dedicated Settings control-system component
- Keep old inline branches unreachable so the UI only exposes one Settings architecture

## 4. Map Existing Data Into New Categories

- Bot runtime, sync, and server health -> `bot-engine`
- Channel and route data -> `channel-control`
- Role and permission data -> `role-power`
- Command and permission behavior -> `command-logic`
- Welcome / verification / onboarding heuristics -> `member-flow`
- Logs, alerts, and event health -> `signals-logging`
- Backup and recovery posture -> `safety-recovery`

## 5. Add Compatibility Redirect Behavior

- Ensure old Settings slugs like `roles`, `channels`, `logging`, and `backups` resolve to their new canonical routes
- Let the existing canonical-route redirect in the workspace page normalize the URL after alias resolution

## 6. Tighten Settings Presentation

- Remove the generic workspace page header for the Settings section
- Let the new Settings home and category heroes provide their own strict top framing
- Keep the entire Settings experience single-column and visually ordered on mobile

## 7. Verify

- Build the client with `npm.cmd run build`
- Check navigation for:
  - `/settings/overview`
  - all 7 new category routes
  - old slug compatibility redirects
- Confirm the UI shows only the new Settings information architecture
