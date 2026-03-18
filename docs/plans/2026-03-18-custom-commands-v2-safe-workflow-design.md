# Custom Commands V2 Safe Workflow Design

Date: 2026-03-18

## Summary

This pass introduces a production-style `Custom Commands V2` system built around safe structured workflows instead of raw code execution.

The goal is to deliver BotGhost-level flexibility with a dashboard experience that still feels approachable for normal users. Commands must be importable from a single JSON object, previewable before save, editable later in the dashboard, and executable through a typed runtime with no `eval`, no raw JS/TS execution, and no unsafe script injection.

This design is written for the current Archivist repo shape. The resulting domain model is intentionally portable to a future Next.js + Prisma implementation, but the actual implementation should land in the current app so it can ship instead of becoming a detached scaffold.

## Goals

- Build a beginner-friendly but advanced custom command system
- Accept AI-generated command imports through one structured JSON object
- Validate imports before save and show clear errors
- Keep imported commands editable in the dashboard
- Separate editor/import concerns from runtime execution concerns
- Support future migrations through explicit `schemaVersion`
- Keep the runtime safe, typed, testable, and extensible

## Non-Goals

- Executing arbitrary JavaScript or TypeScript from imports
- Replacing the existing command system in one destructive pass
- Shipping every imaginable step type in the first release
- Rebuilding the whole app around a different framework before user value lands

## Approved Direction

Use a `schema-driven workflow engine` with two data layers:

1. `Editable definition`
   - the source of truth for imports and dashboard editing
2. `Compiled runtime snapshot`
   - a normalized execution shape generated from the definition

This keeps the system safe and explainable:

- imports are one JSON object
- runtime never executes raw code
- validation is strict and actionable
- the dashboard can reopen and edit every imported command later
- the runtime stays fast because it reads compiled data instead of editor noise

## Product Model

V2 commands should support two user modes on top of the same engine.

### Simple Commands

Examples:

- send a message
- send an embed
- reply to a user
- send an ephemeral response

Simple mode should feel form-first and hide branching, variables, modal wiring, and fallback trees unless needed.

### Workflow Commands

Examples:

- buttons
- select menus
- modals/forms
- permission gates
- cooldowns
- conditional branching
- variables
- safe webhook calls
- logging
- multi-step flows
- fallback handling

The important rule is that `simple` and `workflow` are different views over the same safe command definition model.

## Architecture Overview

The system should be split into clear layers.

### Frontend

- command list
- import modal
- dashboard editor
- validation and preview panels
- dry-run test panel

### Shared Contracts

- Zod schemas
- TypeScript command types
- migration helpers
- import/export payload contracts

### Backend Application Layer

- import service
- compile service
- persistence service
- preview/test service
- cache invalidation service

### Runtime Layer

- trigger router
- matcher
- guard engine
- workflow executor
- step handler registry
- result dispatcher
- audit logging

## Data Model

V2 commands should live in a new table instead of stretching the legacy flat model past its limits.

### `custom_commands_v2`

- `id`
- `serverId`
- `name`
- `slug`
- `schemaVersion`
- `kind`
- `enabled`
- `triggerType`
- `definition jsonb`
- `compiled jsonb`
- `importSource jsonb?`
- `lastValidation jsonb?`
- `createdByUserId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

### Why Two JSON Fields

`definition` is human-editable and importable.

`compiled` is runtime-oriented and generated from the definition:

- normalized defaults
- resolved transitions
- flattened handler payloads
- fast match hints
- safe runtime guards

This is the cleanest way to support imports, editor round-tripping, migrations, and runtime performance at the same time.

## Import Contract

The importer should accept one JSON object only.

### Top Level

```json
{
  "schemaVersion": 1,
  "kind": "custom-command",
  "command": {}
}
```

### Command Definition

```json
{
  "schemaVersion": 1,
  "kind": "custom-command",
  "command": {
    "meta": {
      "name": "example",
      "description": "Example command",
      "category": "utility",
      "tags": ["example"]
    },
    "trigger": {
      "type": "slash",
      "name": "example"
    },
    "access": {
      "mode": "allow_all"
    },
    "behavior": {
      "enabled": true,
      "cooldownSeconds": 5
    },
    "variables": [],
    "workflow": {
      "entryStepId": "start",
      "steps": []
    },
    "fallbacks": {},
    "ui": {
      "mode": "simple"
    }
  }
}
```

### Import Rules

- accept raw JSON only
- unwrap markdown code fences automatically
- reject arrays and multi-command payloads
- reject unknown top-level kinds
- reject unsupported step types unless intentionally supported
- preserve `schemaVersion`
- normalize safe defaults before save

## Validation

Use Zod for the entire import and persistence path.

### Validate:

- top-level payload
- trigger shape
- access shape
- behavior shape
- variables
- workflow graph
- each step type
- fallback configuration

### Validation Output

Validation should return structured issues, not just a single string:

- `path`
- `code`
- `message`
- `severity`
- `suggestedFix?`

That lets the dashboard show human-readable errors and warnings before import confirmation.

## Workflow Model

Use a typed step graph with explicit transitions.

### Core Shape

- `entryStepId`
- `steps[]`

### Supported Step Types For First Core Pass

- `send_message`
- `send_embed`
- `reply_ephemeral`
- `add_button_row`
- `add_select_menu`
- `on_button_click`
- `on_select`
- `open_modal`
- `save_input`
- `set_variable`
- `add_role`
- `remove_role`
- `check_permission`
- `check_cooldown`
- `branch_if`
- `log_action`
- `call_webhook`
- `fallback_response`

### Graph Rules

- one entry step
- unique step IDs
- typed transitions
- explicit branch targets
- no implicit loops
- hard max step count per execution

### Beginner UX Mapping

The editor should not expose a raw graph first. It should map common flows into cards and grouped sections:

- message
- embed
- access
- buttons
- select
- modal input
- advanced conditions
- fallback

The graph is the internal model, not the default user experience.

## Runtime Architecture

The runtime should be a safe workflow executor.

### Flow

1. receive an event
2. find matching active commands from cache
3. load compiled snapshot
4. run guards
5. create execution context
6. execute steps through the handler registry
7. collect outputs and state changes
8. dispatch final responses
9. record audit trace and usage

### Runtime Components

- `trigger router`
- `matcher`
- `guard engine`
- `execution context`
- `workflow executor`
- `step registry`
- `result dispatcher`
- `audit logger`

### Safety Rules

- never execute pasted code
- handler receives typed config only
- outbound webhook step uses a hardened client with timeout and allowlisted headers
- variable access is scoped and explicit
- loop protection is mandatory
- timeout budget is mandatory

## Cache Strategy

Active commands should be cached by server and trigger type.

### Cache Layers

- server command list cache
- compiled active command cache
- trigger lookup indexes

### Cache Refresh

Refresh or invalidate on:

- create
- import
- update
- delete
- enable
- disable
- compile/migration changes

### Runtime Benefit

The matcher should not scan full definitions on every event. It should read compiled trigger hints and pre-indexed command IDs for fast matching.

## Import + Preview Flow

The import experience should be `paste -> validate -> preview -> confirm`, not `paste and hope`.

### Import Modal

Tabs:

- `Paste JSON`
- `Share Code`
- `Template`

### Preview Surface

Show before save:

- command name
- trigger summary
- enabled state
- permissions summary
- workflow summary
- warnings
- blocking errors

### Confirmation Actions

- `Import as Draft`
- `Import and Open Editor`

Never execute a command just because it was pasted.

## Dashboard UX

The dashboard should stay beginner-first.

### Main Surfaces

- command list
- import modal
- command editor
- preview panel
- validation feedback
- dry-run test panel

### Editor Sections

- `Basics`
- `Trigger`
- `Response`
- `Workflow`
- `Access`
- `Behavior`
- `Variables`
- `Fallbacks`
- `Advanced`

### UX Rules

- advanced sections collapsed by default
- help text and examples everywhere
- tooltips for risky features
- visual step cards instead of raw JSON editing
- raw JSON import/export as a secondary tool, not the default editor

## Dry-Run Testing

The dashboard should support safe test runs when practical.

### Dry-Run Capabilities

- mock interaction context
- sample member and channel values
- variable trace
- step execution trace
- previewed final outputs

Dry-run should not perform destructive writes by default. Risky handlers like role changes and webhooks should support preview mode or explicit opt-in.

## Versioning And Migration

`schemaVersion` is non-negotiable.

### Rules

- every imported command must declare `schemaVersion`
- current implementation starts at `1`
- older versions get normalized through migration helpers before validation or compile
- unsupported future versions produce a clear error

### Rollout

Ship as `Custom Commands V2`.

- keep legacy commands working
- add V2 as a parallel system
- default new imports and advanced creations to V2
- migrate legacy commands later when safe

## Testing

Testing should cover the real production risks.

### Unit

- schema validation
- normalization
- compile output
- step handlers
- guard checks
- cooldown logic
- fallback routing

### Integration

- import flow
- create/update/delete flow
- cache refresh behavior
- runtime execution by trigger type
- dry-run test flow

### Manual Smoke

- paste chatbot JSON
- preview
- import as draft
- edit in UI
- save
- trigger in Discord
- inspect logs and test output

## Success Criteria

This pass is complete when:

- AI-generated JSON imports paste into the dashboard and validate cleanly
- imported commands can be edited later in the dashboard
- runtime executes structured workflows with no raw code execution
- cache refresh keeps runtime state accurate after edits
- beginner users can build simple commands without being overwhelmed
- advanced users can compose richer flows safely

## Next Step

After this design approval, generate the implementation plan and start the actual V2 command system code:

- database model
- shared Zod schemas and types
- import service
- compile service
- runtime executor
- step handlers
- cache service
- dashboard components
