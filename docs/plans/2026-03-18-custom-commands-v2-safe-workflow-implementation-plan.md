# Custom Commands V2 Safe Workflow Implementation Plan

Date: 2026-03-18

## Goal

Build a production-style Custom Commands V2 system with safe workflow execution, importable JSON commands, dashboard editing, runtime caching, and future migration support.

## Phase 1: Shared Contracts

1. Add a new shared command domain module for V2:
   - payload types
   - trigger types
   - step types
   - fallback types
   - validation issue types
2. Add Zod schemas for:
   - import payload
   - editable definition
   - workflow steps
   - compiled snapshot
3. Add migration helpers:
   - validate schema version
   - normalize version 1
   - stub future migration entrypoint

## Phase 2: Database Model

1. Add `custom_commands_v2` storage shape to the schema layer.
2. Include:
   - `definition`
   - `compiled`
   - `importSource`
   - `lastValidation`
   - metadata and auditing fields
3. Add insert/update schemas for V2 commands.
4. Add storage methods for:
   - list
   - get by id
   - create
   - update
   - delete
   - enable/disable
   - log import

## Phase 3: Import Pipeline

1. Create a backend import service that:
   - unwraps code fences
   - parses JSON
   - validates the payload
   - normalizes defaults
   - compiles the runtime snapshot
   - returns preview + issues before save
2. Add routes for:
   - preview import
   - save import
   - test import payload without saving
3. Record import source metadata for auditing and future debugging.

## Phase 4: Compiler

1. Create a compiler that transforms `definition` into `compiled`.
2. Flatten runtime hints:
   - trigger indexes
   - guard hints
   - step registry payloads
   - transition maps
3. Reject unsupported or inconsistent workflow graphs.
4. Emit structured warnings for non-blocking issues.

## Phase 5: Runtime Executor

1. Add a V2 runtime module with:
   - trigger router
   - command matcher
   - guard engine
   - execution context builder
   - workflow executor
   - result dispatcher
2. Add safe step handlers for the first core set:
   - `send_message`
   - `send_embed`
   - `reply_ephemeral`
   - `set_variable`
   - `add_role`
   - `remove_role`
   - `check_permission`
   - `check_cooldown`
   - `branch_if`
   - `log_action`
   - `call_webhook`
   - `fallback_response`
3. Add loop protection, timeout budget, and fallback execution.

## Phase 6: Cache Layer

1. Add active command cache by server and trigger type.
2. Cache compiled snapshots only for enabled commands.
3. Invalidate on:
   - create
   - import
   - update
   - delete
   - enable/disable
4. Add helper methods for runtime match lookups.

## Phase 7: Dashboard

1. Add a V2 command list surface.
2. Add `Import Command` modal with:
   - paste JSON
   - share code
   - template tabs
3. Add preview and validation issue panels.
4. Add beginner-first editor sections:
   - Basics
   - Trigger
   - Response
   - Workflow
   - Access
   - Behavior
   - Variables
   - Fallbacks
   - Advanced
5. Add dry-run test panel if the current dashboard surface can support it cleanly in this pass.

## Phase 8: API And Hooks

1. Add shared API route contracts for V2 commands.
2. Add client hooks for:
   - list commands
   - preview import
   - save import
   - update command
   - delete command
   - toggle enabled
   - dry-run test

## Phase 9: Examples

1. Add example JSON imports for:
   - simple message command
   - embed command
   - button workflow
   - select workflow
   - modal workflow
   - webhook workflow with fallback
2. Use examples in docs and dashboard helper copy.

## Phase 10: Verification

1. Add unit tests for validation and compiler behavior.
2. Add runtime tests for core handlers and guards.
3. Run:
   - `npm.cmd run check`
   - `npm.cmd run build`
   - `npm.cmd run verify:build-output`
4. Perform manual smoke tests:
   - import JSON
   - preview
   - save
   - edit
   - run
   - inspect logs

## First Delivery Slice

The first implementation slice should ship:

- V2 schemas and storage
- import preview/save
- basic editor shell
- core runtime executor
- safe first-party step handlers
- cache invalidation

After that, iterate deeper into more advanced workflow interactions and richer UI affordances.
