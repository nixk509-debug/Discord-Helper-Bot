# Archivist Mobile Shell Redesign Implementation Plan

1. Create new mobile shell primitives for:
   - persistent four-tab bottom navigation
   - pillar context header
   - reusable tool chooser drawer
   - overview section and action blocks
2. Replace the current sidebar-first `DashboardLayout` workspace behavior with the new shell while keeping non-workspace modes stable.
3. Refactor `archivist-workspace.ts` so the four pillars expose canonical overview metadata and tool-sheet entries.
4. Split `workspace.tsx` responsibilities into smaller shell-friendly pieces and keep only compatibility routing where needed.
5. Build clean overview screens for `commands`, `studio`, `fun`, and `server` inside the new shell.
6. Mount existing deep editors behind focused routes launched from the new shell and tool sheets.
7. Make `Design Studio` the flagship overview with clearer continue, create, asset, and publish entry points.
8. Update the shared visual tokens and shell styling toward a black-first Archivist direction with restrained red accents.
9. Verify with:
   - `npm.cmd run check`
   - `npm.cmd run build`
   - `npm.cmd run verify:build-output`
