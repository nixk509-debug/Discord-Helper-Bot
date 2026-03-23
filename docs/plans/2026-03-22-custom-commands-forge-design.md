# Archivist Custom Commands Forge Redesign

Date: 2026-03-22

## Goal

Redesign the mobile-first `Custom Commands` module into a premium, clear, trustworthy Discord automation forge. This pass only changes `Custom Commands`. It must not redesign `Design Studio`, `Fun & Creative`, or `Settings`, and it must not introduce new top-level product sections.

## Product Boundaries

- `Custom Commands` = behavior, triggers, conditions, actions, workflows, automation
- `Design Studio` = single-message presentation builder for embeds, buttons, menus, and reusable surfaces
- `Fun & Creative` = engagement systems
- `Settings` = admin control

Rules:

- Do not merge Studio into Commands.
- Do not embed the full Studio editor inside Commands.
- Commands may reference saved Studio assets through action blocks.
- New command creation must never auto-default to a fake command like `announce`.
- A blank command must be truly blank.

## Information Architecture

The `Custom Commands` section will revolve around six screens:

1. `Command Hub`
2. `New Command Starter`
3. `Command Builder`
4. `Import / AI Builder`
5. `Activity / Logs`
6. `Review / Publish`

These map into the existing `commands` top-level section:

- `commands/overview` -> `Command Hub`
- `commands/create-command` -> starter + builder + review
- `commands/import-export` -> `Import / AI Builder`
- `commands/logs` -> `Activity / Logs`

`Review / Publish` is a stage inside the create/builder flow, not a new top-level product module.

## Screen Design

### 1. Command Hub

Purpose:

- command inventory
- quick creation/import entry points
- search and filtering
- recent drafts and attention items

Structure:

- page title and current server context
- search field
- quick primary actions:
  - `New Command`
  - `Import JSON`
  - `Activity`
- useful status chips only:
  - total commands
  - drafts
  - failures
  - unpublished changes
- filter row:
  - all
  - drafts
  - published
  - slash
  - message
  - button
  - auto
  - failed
- command cards showing:
  - name
  - trigger type
  - status
  - action count
  - last edited time
  - warning badge when broken or unpublished
- supporting lanes:
  - recent drafts
  - recently edited
  - failed commands needing attention

This screen should feel like a workspace library, not a fake dashboard overview.

### 2. New Command Starter

This opens when the user taps `New Command`.

Options:

- `Blank Command`
- `From Template`
- `Duplicate Existing`
- `Generate With AI`
- `Import JSON`

Default highlighted option:

- `Blank Command`

Blank command rules:

- no fake name
- no fake aliases
- no prefilled trigger
- no default action
- no sample placeholder command data

### 3. Command Builder

The builder is a single cohesive flow with stacked section cards:

- `Command Info`
- `Trigger`
- `Conditions`
- `Actions`
- `Preview`
- `Advanced`

Top builder controls:

- command name
- internal note
- tags/category
- draft/published badge
- `Test`
- `Save`
- `Publish`

Mobile behavior:

- section cards collapse to readable summaries
- only one or two sections should be expanded at a time
- detailed edits happen in bottom sheets where helpful
- sticky bottom action bar appears when dirty:
  - `Save Draft`
  - `Review`
  - `Publish` when valid

### 4. Import / AI Builder

Two entry modes:

- `Paste JSON`
- `Generate Prompt`

Shared flow:

1. `Input`
2. `Validate`
3. `Preview`
4. `Import`

Paste mode requirements:

- accept one JSON object only
- strip code fences automatically
- attempt to extract valid JSON from wrapper text
- show exact parse problem location
- show human-readable repair guidance
- explain repairs or removals

AI mode requirements:

- generated prompt must demand one JSON object only
- no markdown
- no code fences
- no explanation text
- exact Archivist schema only
- no invented fields
- no unsupported triggers/conditions/actions
- safe defaults
- concise command names

Prompt configuration:

- command goal
- trigger type
- beginner-safe or advanced
- use roles
- use embeds
- use buttons
- use variables
- use Studio references

Import options:

- `Import as Draft`
- `Import and Open in Builder`
- `Reject and Fix`

### 5. Activity / Logs

This is a utility screen, not another fake summary panel.

Tabs:

- `Runs`
- `Failures`
- `Imports`
- `Draft Changes`

Each row should show:

- command name
- event type
- timestamp
- summary
- status chip

### 6. Review / Publish

This is the final trust gate before a command goes live.

It should show:

- trigger summary
- condition summary
- action summary
- warnings
- conflicts
- missing required fields
- preview result
- draft/published state

Possible outcomes:

- ready to publish
- publish with warnings
- not ready

If not ready, the screen should deep-link the user back to the failing section.

## Builder Internals

### Command Info

Fields:

- command name
- internal note / description
- tags/category
- availability/visibility when supported
- draft/published state

Collapsed summary:

- command name or `Untitled draft`
- tag set
- draft/published state

### Trigger

Trigger families:

- slash command
- message / keyword
- auto response
- button press
- select menu
- scheduled time
- member join
- role change
- channel event
- reaction event
- manual / internal when supported

The trigger card must make it immediately obvious:

- what starts the command
- whether it is manual or automatic
- what input it expects

### Conditions

Conditions should read like rule-building, not code:

- user has role
- channel matches
- permission exists
- message contains text
- variable equals
- cooldown is ready
- option matches value

Condition rows should support:

- add
- edit
- duplicate
- remove
- readable one-line summaries

When supported, conditions should expose `all rules must pass` vs `any rule may pass` before exposing more complex grouping.

### Actions

Action blocks must be:

- block-based
- stackable
- reorderable
- editable
- duplicatable
- removable

Each action block shows:

- icon
- title
- one-line summary
- drag handle
- edit
- duplicate
- delete

Action categories:

- `Messaging`
- `Studio References`
- `Roles`
- `Channels`
- `Flow`
- `Variables / Logic`
- `Utility / Moderation`

Allowed balance with Studio:

- inline quick text
- inline simple embed
- reference saved Studio assets

Forbidden:

- full Studio editor embedded inside Commands
- dumping Studio content at the bottom of the command page

### Preview

Preview must be first-class and easy to reach.

Pattern:

- `Build / Preview` segmented control near the builder header

Preview should render:

- text output
- embeds
- buttons
- select menus
- referenced Studio assets
- sample runtime output using test data where possible

If nothing visual is produced, preview should still explain the outcome clearly.

### Advanced

Secondary settings live here:

- cooldown
- permissions
- visibility
- fallback behavior
- metadata
- revision/version state when supported

## Validation

Validation runs continuously, but surfaces lightly during editing.

Each builder section can show:

- clean
- warning
- missing required field

Review is the final consolidated validation screen before publish.

## Mobile Interaction Model

Recommended interaction model:

- one main mobile shell
- compact headers
- bottom sheets for detailed edits and starter choices
- sticky actions when dirty
- stacked cards instead of desktop form walls
- minimal repeated page intros

Screen behaviors:

- `Command Hub` is the true home
- `New Command Starter` opens as a bottom sheet
- `Builder` uses section cards
- `Import / AI Builder` uses `Paste JSON` and `Generate Prompt` tabs
- `Activity` uses segmented filters
- `Review / Publish` is a distinct final stage

## Current Code Reuse Strategy

This pass should reuse the existing v2 command runtime and schema rather than creating a second command system.

Reuse:

- current v2 command data model
- v2 CRUD hooks
- v2 dry-run/test endpoint
- current shared command summary helpers where useful

Refactor:

- current `custom-command-v2-workspace.tsx` monolith into reusable command-specific components
- current import modal into a fuller guided import flow
- current vague overview into the new hub

## Non-Goals

- no redesign of `Design Studio`
- no redesign of `Fun & Creative`
- no redesign of `Settings`
- no new top-level product modules
- no fake starter commands
- no Studio/Commands merge

## Success Criteria

After this pass, a new user should be able to:

- understand what `Custom Commands` is for quickly
- create a truly blank command
- choose a clear trigger
- build readable conditions and actions on mobile
- preview what the command will do
- import AI-generated JSON with meaningful validation and repair feedback
- review and publish with confidence
