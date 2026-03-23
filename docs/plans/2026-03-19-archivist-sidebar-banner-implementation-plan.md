# Archivist Sidebar Banner Implementation Plan

1. Update `app-sidebar.tsx` header structure to introduce a layered crimson banner shell behind the brand block.
2. Move `Invite` and `Log out` into compact square quick-action controls near the logo.
3. Remove the large footer utility cards and keep owner-only `Site Editor` access as a quieter secondary control.
4. Preserve server switching, section navigation, and tool navigation behavior.
5. Verify with:
   - `npm.cmd run check`
   - `npm.cmd run build`
   - `npm.cmd run verify:build-output`
6. Smoke the live mobile sidebar after deploy to confirm:
   - header art renders cleanly
   - action buttons are visible at the top
   - no footer clutter remains
   - navigation still works
