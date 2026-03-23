# Settings Channels Bulk Operations Design

## Summary

Add a real `Settings > Channels` operations workspace to Archivist. This does not become a new top-level section. It lives under the existing `Settings` navigation group and becomes the place where users manage categories, standard channels, forum channels, and threads with live Discord changes protected by a final review step.

The experience should be mobile-first, operational, and safe. Users should be able to select one or many Discord objects, stage advanced operations, inspect a readable diff, and only then apply the plan to Discord through the connected bot.

## Goals

- Keep the top-level app IA unchanged:
  - `Custom Commands`
  - `Design Studio`
  - `Fun & Games`
  - `Settings`
- Make `Settings > Channels` a powerful nested workspace where the deeper “magic” lives.
- Support direct live Discord changes, not just local planning.
- Require a final review step before any live mutation.
- Keep the UI mobile-first and touch-friendly.
- Support advanced organization and bulk management, not just single-channel edits.

## Non-Goals

- Do not add a fifth primary navigation section.
- Do not rely on desktop-only dense table editing as the primary experience.
- Do not apply changes immediately from row-level actions without review.
- Do not build this as a fake planner that cannot execute against Discord.

## Information Architecture

The feature lives under:

- `Settings`
  - `Overview`
  - `General`
  - `Server Config`
  - `Roles`
  - `Channels`
  - `Permissions`
  - `Logging`
  - `Notifications`
  - `Advanced`
  - `Backups`

Within `Settings > Channels`, the page exposes internal views or segments rather than new global nav items:

- `All`
- `Categories`
- `Channels`
- `Forums`
- `Threads`
- `Review`

These are local workspace views, not new drawer entries.

## User Problems

Users want to:

- reorganize server structure quickly
- edit many channels at once
- move channels between categories
- rename groups of channels with patterns
- clone and archive channels in batches
- manage forum channels and threads alongside standard channels
- apply permission and visibility changes safely

Current settings surfaces are too lightweight for this kind of work.

## Product Direction

This should feel like a channel control deck:

- simple on first open
- powerful once selection begins
- mobile-friendly throughout
- visually consistent with the Archivist premium dark shell

The workspace starts as a clean grouped list. It only reveals heavier operational controls after the user selects channels or opens a single-item detail page.

## Scope

Version one supports:

- categories
- standard text channels
- voice channels where supported by the selected operation
- announcement channels where supported
- forum channels
- threads

Version one includes:

- create
- edit
- reorder
- move
- clone
- archive
- delete
- visibility changes
- lock and unlock flows
- permission preset application
- category sync controls
- final review before live apply

## Core Interaction Model

### Default Mode

The default page is a grouped list, not a spreadsheet.

Rows are grouped into:

- category sections
- uncategorized channels
- forums
- threads

Each row shows:

- type icon
- channel name
- parent/category context
- small metadata like visibility, lock state, thread/archive state, slowmode where relevant
- checkbox for bulk selection
- chevron for single-item detail

### Bulk Selection Mode

When one or more rows are selected:

- a sticky bulk action bar appears
- the UI shows selection count
- available bulk actions adapt to the selected object types
- invalid actions are hidden rather than allowed and rejected later

### Single Item Mode

Tapping a row opens a compact item detail page with:

- current state summary
- parent/category reference
- visibility and permissions summary
- actions like `Edit`, `Duplicate`, `Move`, `Delete`

Risky actions still flow through review before mutation.

## Mobile UX

### Main Page

The mobile page includes:

- sticky top bar
- title: `Channels`
- short status line like `124 items across categories, forums, and threads`
- search and filter controls
- grouped list as the primary body

The page stays single-column and thumb-friendly.

### Filters

Quick filters should include:

- all
- categories
- standard channels
- forums
- threads
- visible
- locked
- archived
- unmanaged

Additional filter sheets can support:

- parent category
- channel type
- permission sync state
- NSFW
- slowmode

### Bulk Flow

1. User selects one or more rows.
2. User taps `Bulk Action`.
3. A constrained action sheet appears.
4. User configures the action.
5. Archivist builds a staged operation plan.
6. User reviews an exact diff.
7. User confirms live apply.

### Review Page

The final review screen shows:

- affected items
- grouped operations
- before and after summaries
- destructive warnings
- unsupported or skipped items
- final `Apply to Discord` action

This page is mandatory for live mutation.

## Supported Operations

### Reorganization

- move channels to category
- remove channels from category
- reorder categories
- reorder channels inside category
- move selected items as a batch

### Naming

- single rename
- bulk rename with patterns
- prefix or suffix application
- numbering sequences
- slug cleanup or normalization

### Structure

- create channels
- create categories
- create forum channels
- clone selected items
- archive channels or threads where supported
- delete with explicit confirmation

### Visibility and Locking

- hide
- unhide
- lock
- unlock
- archive and unarchive threads

### Settings and Metadata

- topic updates
- slowmode updates
- NSFW toggle where valid
- forum configuration where supported

### Permissions

- apply permission preset
- sync with parent category
- break sync from parent category
- bulk overwrite application where valid

## Advanced Features

This workspace should support advanced behavior from the first serious version:

- mixed-type selection with action filtering
- per-item failure reporting after execution
- snapshots of original state before apply
- rollback support where Discord allows reversal
- operation logs for auditing
- permission safety warnings with stronger severity than cosmetic changes

## Bot and Runtime Requirements

The feature depends on the connected bot for live mutation.

Before enabling live actions, the backend should confirm:

- bot is connected
- guild is available
- bot has `Manage Channels`
- bot can edit permission overwrites where required
- forum/thread actions are supported for the selected targets

If these conditions are not met, the workspace should downgrade into a read-only planning state with clear warnings.

## Backend Architecture

Add a dedicated channel operations service on the server.

Responsibilities:

- fetch normalized guild structure
- validate staged operations against Discord rules
- split execution by object type and operation type
- generate review diffs
- execute approved plans in batches
- capture success, failure, and skipped results
- persist operation logs and rollback snapshots where possible

Suggested high-level flow:

1. Fetch current guild structure from Discord.
2. Normalize channels, categories, forums, and threads into a shared model.
3. Build a staged operation plan from user actions.
4. Validate the plan.
5. Generate a review diff.
6. Execute only after confirmation.
7. Return structured results.

## Frontend Architecture

Add a `Settings > Channels` workspace page and supporting UI model for:

- grouped channel list state
- selection state
- filter state
- staged operation queue
- review diff rendering
- execution status state

The frontend should not apply live mutations directly from row interactions. It should always go through staged plan creation and review.

## Safety Rules

- No live mutation before final review confirmation.
- Permission changes get stronger warnings than rename or move operations.
- Unsupported mixed selections must be filtered before review, not after execution starts.
- Partial failure should not cancel the entire batch when independent actions can still proceed safely.
- Destructive actions like delete should require stronger confirmation language.

## Error Handling

The workspace should handle:

- missing guild access
- missing permissions
- stale channel IDs
- invalid move targets
- unsupported thread/forum operations
- partial Discord API failures
- rate limit pacing and retries

User-facing results should distinguish:

- applied
- skipped
- failed
- needs manual intervention

## Testing

### Frontend

- mobile selection flow
- bulk action sheet behavior
- review screen rendering
- invalid mixed selections
- single-item detail to review flow

### Backend

- operation planning
- diff generation
- permission validation
- target compatibility validation
- partial execution handling
- rollback snapshot creation

### Integration

- staged review to execution pipeline
- category moves
- bulk rename
- permission preset application
- forum/thread operations

## Rollout Notes

This feature should start behind the existing `Settings > Channels` nested route so the global app structure stays stable.

Because it performs live Discord mutations, rollout should include:

- strong permission checks
- operation logging
- audit-friendly result summaries
- a conservative initial action set if Discord edge cases prove noisier than expected

## Recommendation

Build a unified `Settings > Channels` channel operations workspace with:

- mobile-first grouped list UI
- multi-select bulk editing
- advanced live Discord actions
- mandatory final review
- backend validation and logging

This gives Archivist a serious structure-management tool without bloating the top-level nav.
