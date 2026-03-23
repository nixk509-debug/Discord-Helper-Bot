# Mobile Embed Builder Simplification Implementation Plan

1. Simplify mobile Studio navigation.
   - Hide the `Issues` tab from mobile primary navigation.
   - Rename mobile `Build` affordances to `Edit` where appropriate.
   - Route diagnostics visibility into the `Publish` screen on mobile.

2. Replace the mobile embed canvas flow with a form-first composer.
   - Stop showing `Canvas` / `Parts` / inline-canvas detours for normal mobile embed editing.
   - Render a compact live message output above the mobile form.
   - Render the form editor directly below the output.

3. Expand the mobile embed form coverage.
   - Add `Author`, `Fields`, `Footer`, and `Advanced` sections to `BuildSelectionEditor` for embed selections.
   - Keep `Content`, `Media`, and `Danger zone`.
   - Make field add/remove/reorder work cleanly on mobile.

4. Add simple mobile edit-target switching.
   - Provide chips or buttons for `Message`, `Embed 1`, `Embed 2`, etc.
   - Keep selection state synchronized with the chosen target.

5. Keep assets and publish aligned with the simpler mobile flow.
   - Preserve the upgraded asset tray.
   - Surface diagnostics in the publish screen so mobile still has access to blocking issues.

6. Verify.
   - Run `npm.cmd run check`
   - Run `npm.cmd run build`
   - Run `npm.cmd run verify:build-output`
