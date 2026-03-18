# Custom Commands Advanced Runtime Implementation Plan

Date: 2026-03-18

## Goal

Implement the advanced Custom Commands runtime so the current builder surface is truthful, then expand into the next layer of advanced actions.

## Phase 1: Schema And Shared Contracts

1. Add `triggerConfig` to `custom_commands` in [shared/schema.ts](/C:/Users/Lubey/Discord-Helper-Bot/shared/schema.ts).
2. Extend the insert and update command schemas to validate typed trigger configs.
3. Update the client-side `CommandDraft` model and defaults in [custom-command-model.ts](/C:/Users/Lubey/Discord-Helper-Bot/client/src/components/server-shell/custom-command-model.ts).
4. Add normalization helpers so legacy commands without `triggerConfig` still load safely.

## Phase 2: Builder Trigger Editors

1. Replace the placeholder `TriggerSpecificPanel` in [custom-command-workspace.tsx](/C:/Users/Lubey/Discord-Helper-Bot/client/src/components/server-shell/custom-command-workspace.tsx) with real per-trigger controls.
2. Add editors for:
   - keyword match mode
   - button custom ID and scope
   - select custom ID, allowed values, and scope
   - schedule cron plus timezone
   - role-add watched roles
   - reaction emoji and scope
3. Add inline diagnostics for incomplete advanced trigger configs.
4. Keep the existing command canvas layout intact so this is a capability pass, not another large UI rewrite.

## Phase 3: Runtime Refactor

1. Split [runtime.ts](/C:/Users/Lubey/Discord-Helper-Bot/server/archivist/features/custom-command/runtime.ts) into clearer layers:
   - command loading and caching
   - trigger matching
   - guard evaluation
   - action execution
2. Introduce a richer invocation-source union for slash, keyword, button, select, join, role-add, reaction, and schedule.
3. Centralize usage updates and activity logging so all trigger types behave consistently.

## Phase 4: Trigger Intake

1. Expand [runtime.ts](/C:/Users/Lubey/Discord-Helper-Bot/server/archivist/bot/runtime.ts) interaction handling beyond chat input commands.
2. Add button and string-select interaction routing into Custom Commands.
3. Add reaction event handling and any required intents or partials.
4. Add a scheduler service for cron-based custom commands.
5. Ensure scheduler startup happens with the bot and cleans up on shutdown.

## Phase 5: Settings Fidelity

1. Implement cooldown enforcement with scope-aware in-memory keys.
2. Implement delete-invocation behavior for message-based triggers.
3. Implement premium gating against real premium resolution instead of ignoring the flag.
4. Confirm `dmResponse`, role restrictions, channel restrictions, and conditions still work across every new trigger type.

## Phase 6: Advanced Actions Expansion

1. Keep the current visible actions solid first.
2. Add runtime support and builder editors for the next supported advanced actions:
   - `react`
   - `createThread`
   - `deleteMessage`
   - `pinMessage`
   - `setVariable`
   - `httpRequest`
   - `sendWebhook`
   - `addEconomyCoins`
   - `addWarning`
   - `editPermissions`
3. Only surface each action in the main action picker after its runtime path and validation are complete.

## Phase 7: Verification

1. Expand [runtime.test.ts](/C:/Users/Lubey/Discord-Helper-Bot/server/archivist/features/custom-command/runtime.test.ts) for trigger matching, cooldowns, and schedule logic.
2. Add tests for button and select interaction flows.
3. Run:
   - `npm.cmd run check`
   - `npm.cmd run build`
   - `npm.cmd run verify:build-output`
4. Perform live smoke tests for each trigger type in Discord against a test server.

## Suggested Delivery Order

1. Schema and builder trigger configs
2. Runtime refactor
3. Button and select triggers
4. Reaction trigger
5. Schedule trigger
6. Settings fidelity pass
7. Advanced actions expansion
8. Full smoke and deploy

## Done Definition

- Builder and runtime support the same trigger list
- Cooldowns and settings are enforced for real
- Commands can be created, saved, reopened, and triggered without hidden gaps
- Advanced actions begin shipping from a stable runtime foundation instead of a placeholder UI
