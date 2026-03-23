# Custom Commands Mobile Forge Implementation Plan

1. Reshape the route experience around the new command jobs.
   - Convert `commands/overview` into the `Command Hub`.
   - Convert `commands/create-command` into starter + builder + review.
   - Convert `commands/import-export` into `Import / AI Builder`.
   - Convert `commands/logs` into `Activity`.

2. Split the current v2 workspace into reusable command-specific UI components.
   - Create command hub header, stat chips, filter row, and command card components.
   - Create starter option cards and starter sheet flow.
   - Create section cards for command info, trigger, conditions, actions, preview, and advanced.
   - Create reusable validation panels, activity rows, and sticky action bar components.

3. Replace the fake-create behavior with explicit starter flow.
   - Make `New Command` always open the starter flow first.
   - Ensure blank command drafts are truly empty.
   - Remove any residual fake fallback command selection behavior.

4. Rebuild the builder around visual mobile sections.
   - Add build/review and build/preview flow affordances.
   - Convert trigger selection into trigger-family cards with human-readable summaries.
   - Convert conditions into readable rule rows with bottom-sheet editing.
   - Convert actions into reorderable visual blocks with add-action sheet.

5. Add Studio asset reference support without embedding Studio.
   - Surface Studio assets as selectable references in action configuration.
   - Keep inline messaging limited to quick text/simple embed behavior.
   - Do not mount the full Studio editor in the command builder.

6. Redesign import and AI builder flow.
   - Replace the current modal-style import UI with screen-level import flow.
   - Add repair notices, validation summaries, and safer preview/import options.
   - Add a configurable AI prompt builder that outputs strict import-safe instructions.

7. Add review and publish stage.
   - Show trigger, condition, action, warning, and preview summaries together.
   - Surface missing fields and jump-back affordances.
   - Make publish state deliberate and visible.

8. Verify.
   - Run `cmd /c node --max-old-space-size=2048 .\\node_modules\\typescript\\bin\\tsc --pretty false --noEmit`
   - Run `cmd /c npm run build`
   - Run `cmd /c npm run verify:build-output`
   - Run a live smoke test for:
     - Command Hub
     - Blank command starter flow
     - Import route
     - Activity route
     - Save/review/publish flow
