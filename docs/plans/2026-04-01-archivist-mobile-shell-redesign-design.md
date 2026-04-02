# Archivist Mobile Shell Redesign Design

## Goal
Refactor Archivist into a premium black-first mobile control workspace with four true product pillars, bottom navigation, sheet-driven tool discovery, and cleaner editor entry flows.

## Approved Direction
- Replace the current sidebar-led dashboard shell with a mobile-first shell.
- Make `Custom Commands`, `Design Studio`, `Fun and Creative`, and `System Settings` the real route truth.
- Use a persistent four-tab bottom navigation as the main app structure.
- Open deeper tool discovery through reusable bottom sheets and drawers instead of nested sidebar navigation.
- Preserve working deep editors for now, but mount them inside the new shell and focused routes.
- Make `Design Studio` the flagship entry lane with stronger draft, asset, and publish visibility.

## Product Rules
- The shell leads; legacy editors adapt to it.
- Mobile clarity matters more than preserving desktop-first layout choices.
- Each pillar needs one clean overview page with recent work, status, and one strong primary action.
- Tool discovery must feel consistent across pillars.
- Route aliases can remain temporarily for compatibility, but the canonical product structure must stay four-pillar only.
- This pass fixes architecture and interaction flow first, not every deep editor.

## Architecture Shape
- `DashboardLayout` becomes a mobile-first workspace shell with:
  - compact top context area
  - full-height content lane
  - persistent bottom navigation
  - integrated tool sheet launcher
- `AppSidebar` is removed from the primary workspace flow.
- `archivist-workspace.ts` keeps the four canonical pillars and shifts toward cleaner pillar metadata and tool-group definitions.
- `workspace.tsx` stops acting as the whole app. It should be reduced into:
  - shell host
  - pillar overview renderers
  - focused editor hosts
  - compatibility glue for legacy item routes

## Interaction Model
- Level 1: bottom nav between the four pillars.
- Level 2: pillar-specific bottom sheet for sub-tools.
- Level 3: focused full-screen editor or module route.
- Level 4: contextual sheets inside editors for insert, publish, template, and action flows.

## Pillar Structure

### Custom Commands
- Overview should show recent commands, drafts, quick create, publish or validation state, and trigger mix.
- Tool sheet should expose slash commands, keyword triggers, auto responses, buttons, selects, modals, schedules, member join, role change, reactions, and internal triggers.

### Design Studio
- This is the flagship lane.
- Overview should center continue editing, new message, recent assets, draft vs publish truth, templates, and saved presets.
- Tool sheet should expose new message, embed builder, Components V2, welcome builder, ticket panels, verification panels, announcement builder, and lab or assets.

### Fun and Creative
- Overview should surface enabled systems, community activity, popular creative tools, and module depth.
- Tool sheet should expose leveling, starboard, reaction roles, counting, giveaways, leaderboards, media or greeting effects, and community event tools.

### System Settings
- Overview should highlight moderation health, verification status, logs, tickets, permissions, backups, and warnings.
- Tool sheet should expose moderation, verification, logs, tickets, permissions, channels, roles, backup/templates, and security tools.

## Visual Direction
- Black-first base with deep charcoal layering.
- Refined crimson accents only for identity, active emphasis, and risk states.
- Calm surfaces, heavier contrast, and cleaner hierarchy than the current dashboard.
- Motion should feel native and restrained.
- Sheets should feel dense and premium, not playful or marketplace-like.

## Implementation Boundaries
- Reuse working deep editors where possible.
- Do not rewrite command forge, Studio internals, or every settings tool in this pass.
- Remove sidebar-first shell behavior instead of preserving it as a fallback dependency.
- Prefer reusable shell primitives over one-off page-specific scaffolding.

## Success Criteria
- The mobile shell no longer feels like a compressed desktop admin panel.
- The four pillars are the real navigation truth.
- Tool discovery is sheet-driven and consistent.
- `Design Studio` feels like the strongest entry point.
- `workspace.tsx` shrinks materially and no longer owns the whole product experience.
