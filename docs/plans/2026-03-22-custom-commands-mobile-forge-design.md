# Archivist Custom Commands Mobile Forge Design

Date: 2026-03-22

## Goal

Redesign the `Custom Commands` section into a mobile-first command forge centered on four jobs:

- Library
- Create
- Import
- Activity

This pass only applies to `Custom Commands`. It must not redesign or absorb `Design Studio`, `Fun & Creative`, or `Settings`.

## Product Boundaries

- `Custom Commands` owns behavior, triggers, conditions, actions, replies, workflows, and automation behavior.
- `Design Studio` remains the separate builder for a single polished sendable message or surface.
- `Custom Commands` may reference saved Studio assets inside action blocks.
- `Custom Commands` must not embed the full Studio editor or dump Studio content at the bottom of the builder.

## Information Architecture

The `commands` section is rebuilt around these screens:

1. `Command Hub`
2. `New Command Starter`
3. `Command Builder`
4. `Import / AI Builder`
5. `Activity / Logs`
6. `Review / Publish`

### Routing

Keep the existing Archivist top-level structure and repurpose the command routes:

- `commands/overview` -> `Command Hub`
- `commands/create-command` -> starter entry + builder + review flow
- `commands/import-export` -> `Import / AI Builder`
- `commands/logs` -> `Activity / Logs`

`Review / Publish` lives as a builder stage inside `create-command`, not as a new top-level section.

## Screen Design

### 1. Command Hub

Purpose:

- command inventory
- search and filter
- create/import entry points
- drafts/failures/unpublished visibility
- recent work lanes

Top area:

- page title
- current server context
- search field
- primary actions

Primary actions:

- `New Command`
- `Import JSON`
- `Activity`

Status chips:

- total commands
- drafts
- failures
- unpublished changes

Filters:

- All
- Drafts
- Published
- Slash
- Message
- Button
- Auto
- Failed

Command cards show:

- command name
- trigger type
- status
- action count
- last edited time
- warning badge for broken or unpublished state

Secondary lanes:

- recent drafts
- recently edited commands
- needs attention

This screen must feel like a library/workspace, not a generic overview dashboard.

### 2. New Command Starter

Open from `New Command` as a bottom sheet.

Starter options:

- Blank Command
- From Template
- Duplicate Existing
- Generate With AI
- Import JSON

Default highlighted option:

- `Blank Command`

Blank command rules:

- no fake name
- no default aliases
- no sample action
- no assumed trigger
- no fake example command like `announce`
- neutral empty preview state

### 3. Command Builder

One cohesive mobile-native workflow screen built from stacked section cards:

- Command Info
- Trigger
- Conditions
- Actions
- Preview
- Advanced

Top header:

- command name
- internal description/status context
- draft/published badge
- `Test`
- `Save`
- `Publish` when appropriate

Mobile interaction:

- limited expanded sections at a time
- bottom sheets for detailed editing
- sticky bottom action bar when the draft is dirty
- compact section summaries when collapsed

### 4. Import / AI Builder

Dedicated safe ingestion workflow with two entry modes:

- Paste JSON
- Generate Prompt

Flow:

1. Input
2. Validate
3. Preview
4. Import

Paste JSON behavior:

- accept one object only
- strip markdown code fences
- extract valid object from wrapper text when possible
- show exact parser problem and human-readable repair guidance
- explain repairs/removals

AI prompt mode:

- guided configuration inputs
- generated prompt strictly requires one valid JSON object
- forbids markdown, code fences, explanations, invented fields, and unsupported schema values
- tuned for import-safe output

Import options:

- Import as Draft
- Import and Open in Builder
- Reject with Fix Suggestions

### 5. Activity / Logs

Dedicated utility screen with segmented filters:

- Runs
- Failures
- Imports
- Draft Changes

Rows show:

- command name
- event type
- timestamp
- summary
- status chip

### 6. Review / Publish

Final trust screen before going live.

Shows:

- trigger summary
- condition summary
- action summary
- warnings
- conflicts
- preview result
- draft/published state

Outcomes:

- ready to publish
- publish with warnings
- not ready

If incomplete, review must link back to the exact failing section.

## Builder Details

### Command Info

Fields:

- command name
- internal note/description
- tags/category
- visibility/availability if supported
- draft/published state

Collapsed summary:

- command name or `Untitled draft`
- tags
- current state

### Trigger

Trigger family cards first, then type-specific fields.

Supported families:

- Slash command
- Message command / keyword trigger
- Auto response
- Button press
- Select menu
- Scheduled time
- Member join
- Role change
- Channel event
- Reaction event
- Manual/internal trigger if supported

The section summary must read like plain English.

### Conditions

Conditions are rule rows, not generic config blobs.

Each rule row includes:

- type
- one-line summary
- edit
- duplicate
- remove

The section supports multiple conditions and a simple readable group mode such as:

- all rules must pass
- any rule may pass

### Actions

Actions are stackable, reorderable, readable blocks.

Each action block includes:

- icon
- title
- one-line summary
- drag handle
- edit
- duplicate
- delete

Action categories:

- Messaging
- Studio References
- Roles
- Channels
- Flow
- Variables / Logic
- Utility / Moderation

Studio integration is limited to references:

- Send Studio Message
- Send Studio Embed
- Send Studio Components
- Send Saved Panel

Do not embed the full Studio builder.

### Preview

Use a `Build / Preview` toggle near the builder header and keep preview reachable on mobile.

Preview renders:

- text output
- embeds
- buttons
- select menus
- Studio references
- sample data substitutions when possible

If no renderable output exists, preview explains why.

### Advanced

Secondary settings only:

- cooldown
- permissions/visibility
- fallback behavior
- metadata
- publish state
- revision/version if supported

## Validation

Validation is continuous but section-local.

Each builder card can show:

- clean
- warning
- missing required field

The review screen consolidates the final validation result and supports deep-link navigation back into the builder.

## Visual Direction

Retain the Archivist visual identity:

- near-black surfaces
- red/pink accent
- premium rounded corners
- soft glow
- sharp hierarchy
- Discord-adjacent message styling

Avoid:

- repeated hero cards
- filler overview blocks
- duplicated save bars
- long desktop-style forms
- generic flat admin styling

## Implementation Direction

Build on top of the existing Custom Command v2 runtime/model instead of inventing a second command system.

Primary refactor targets:

- `client/src/components/server-shell/custom-command-v2/custom-command-v2-workspace.tsx`
- `client/src/components/server-shell/custom-command-v2/custom-command-v2-import-modal.tsx`
- `client/src/components/server-shell/custom-command-v2/custom-command-v2-ai-prompt.ts`
- `client/src/components/server-shell/custom-command-v2/custom-command-v2-model.ts`
- `client/src/pages/dashboard/workspace.tsx`

Reusable component goals:

- Command Hub header
- Command stat chip
- Command card
- Filter chip row
- Starter option card
- Builder section card
- Trigger configuration block
- Condition block
- Action block
- Add Action sheet
- Studio asset selector
- Validation warning panel
- Import repair notice
- AI prompt configuration card
- Discord preview panel
- Sticky save/publish bar
- Draft status badge
- Activity log row

## Success Criteria

The redesign succeeds if a new user can:

- understand Custom Commands quickly
- create a truly blank command
- understand what triggers the command
- build conditions/actions without facing a form wall
- preview likely output clearly
- import AI-generated JSON safely
- review and publish confidently
