# Archivist Canvas-First Control System Design

Date: 2026-03-11

## Summary

This pass corrects the core interaction model across Archivist's live builder, selected server settings surfaces, and the in-Discord admin command system.

The main change is structural, not cosmetic:

- the message canvas becomes the primary editor
- mobile layout issues are fixed before adding more interface weight
- Verify and Bot Settings become product surfaces instead of stacked forms
- Archivist gains a real Discord-native command spine with fully operable command flows

This should make the product feel like one coherent control system across dashboard and Discord, instead of several disconnected tools.

## Goals

- Make the builder truly canvas-first
- Remove detached editor loops as the default editing behavior
- Fix current mobile layout failures in the builder
- Make Add Part context-smart and structurally complete, including `Container`
- Turn assets into an always-near editing utility
- Redesign Verify as a guided workflow
- Redesign Bot Settings as a premium grouped control surface
- Ship a real Archivist admin/settings command spine in Discord

## Non-Goals

- Rebuilding every module internal surface in this pass
- Creating a new standalone Studio app
- Replacing the backend architecture unless required to support an existing intended flow
- Turning advanced fallback editors into the default interaction again

## Approved Product Direction

Use a command-hub plus focused workflows model.

Archivist should have a strong Discord-native command system, but not force everything through one bloated super-command. `/sys` is the backbone, but `/setup`, `/module`, `/studio`, and `/perm` remain first-class product commands with their own purpose and identity.

At the same time, the dashboard side should stop behaving like forms layered on top of a preview. The message stays central, selections happen on the message itself, and editing surfaces stay attached to that selection instead of replacing it.

## Core Interaction Rule

Stop building `editor over canvas`.

Start building `canvas with inline inspectors`.

The message canvas must be the main editing surface.

### Default Editing Loop

1. The user taps or clicks a visible part on the live message canvas.
2. That part becomes selected directly on the canvas.
3. The message stays visible.
4. A bottom inspector or anchored inline editing surface opens for the selected part.
5. Changes apply live immediately on the canvas.

Full detached editors remain available only for advanced cases, not for normal editing.

## Builder Interaction Model

This canvas-first model applies to:

- message text
- embeds
- buttons
- dropdowns
- notice panels
- dividers
- images
- thumbnails
- galleries
- similar message parts

### Inspector Behavior

The primary editing affordance is a bottom inspector, especially on mobile.

- The inspector opens for the currently selected visible part.
- The message remains visible above it whenever practical.
- The first inspector state should be compact and focused.
- The inspector can expand when more controls are needed.
- Advanced editors may still exist, but they are launched from the inspector and treated as secondary tools.

### Examples

- tap embed title -> edit title inline or in the bottom inspector
- tap embed description -> edit without leaving the canvas
- tap thumbnail or image -> upload or replace from the inspector
- tap button row -> edit row and button details in the inspector
- tap notice panel -> edit content and style on the same screen

## Mobile-First Fixes

Mobile fixes are the top priority before adding more UI complexity.

### Required Fixes

- no overlapping text
- no cards that are too short for their content
- no broken two-column layouts on smaller phones
- improved wrapping and reduced bad truncation
- sheets and cards must not collide visually
- stronger safe-area spacing
- less wasted vertical space
- sticky controls must not collide with content

### Mobile Layout Rules

- Add Part defaults to one column on smaller phones
- descriptions shorten or hide when space is limited
- cards size to content instead of forcing overflow
- bottom sheets are sized for real phone use
- tap targets remain separated and touch-friendly
- the builder should feel intentionally phone-first

## Add Part Flow

The Add Part flow should become fast, context-smart, and message-oriented.

### Rules

- show all valid supported parts for the current context
- include `Container` anywhere it is supported
- do not hide valid structural options
- show context-valid children when a parent is selected
- simplify descriptions on mobile
- prefer one-column mobile layout over broken density

The flow should feel like adding to a live structure, not browsing a settings catalog.

## Assets Utility

Assets should become a real preloaded editing utility that stays near the active editing context.

### Asset Types

- dividers
- borders
- fonts or text styles where supported
- symbols
- emojis
- custom emojis
- saved images
- recent images
- saved colors or swatches
- favorites and recents

### Editing Integration

- text and embed description editing -> quick insert dividers, styles, symbols, and emojis
- button and select editing -> quick emoji picker
- image, thumbnail, and gallery editing -> upload, saved image library, recent images, and URL
- color editing -> wheel plus swatches

Assets should feel like a nearby tray or drawer, not a disconnected tab.

## Verify Redesign

Verify should stop reading like a long form and become a guided operational flow.

### Primary Sections

- Requirements
- Verification Message
- Result Role
- Test / Publish

The surface should still support current verification settings, but the main experience should focus on readiness, missing steps, and next actions.

## Bot Settings Redesign

Bot Settings should become a premium grouped control surface instead of a raw configuration page.

### Primary Sections

- Identity
- Behavior
- Permissions
- Integrations
- Advanced

The surface should feel like the system control center for Archivist, with cleaner grouping, clearer status, and better action framing.

## Discord Command Spine

Archivist should ship with this top-level command set:

- `/sys`
- `/setup`
- `/module`
- `/studio`
- `/panel`
- `/perm`
- `/sync`
- `/log`
- `/theme`
- `/config`

### Recommended Daily Admin Flow

- `/sys`
- `/setup`
- `/module`
- `/studio`
- `/perm`

### Command Model

#### `/sys`

Main system control entry.

Subcommands:

- `/sys server`
- `/sys channel`
- `/sys role`
- `/sys bot`

This is the god command. It should open rich control responses with status chips, quick actions, and deeper sections lower in the flow.

#### `/setup`

Fast guided setup.

Subcommands:

- `/setup welcome`
- `/setup verify`
- `/setup tickets`
- `/setup logs`
- `/setup commands`

This is the first-run and quick-fix command family.

#### `/module`

Direct module manager.

Subcommands:

- `/module welcome`
- `/module verify`
- `/module tickets`
- `/module commands`
- `/module scheduled`
- `/module logging`

This is for targeted control of one specific system.

#### `/studio`

Message and design control.

Subcommands:

- `/studio open`
- `/studio new`
- `/studio recent`
- `/studio module`

This is the branded bridge into Archivist's message and design system.

#### `/panel`

Interactive panel manager.

Subcommands:

- `/panel verify`
- `/panel tickets`
- `/panel roles`
- `/panel archive`

This manages public interactive system surfaces.

#### `/perm`

Permissions manager.

Subcommands:

- `/perm role`
- `/perm channel`
- `/perm command`
- `/perm panel`

This should make access control much faster.

#### `/sync`

Refresh and rebind systems.

Subcommands:

- `/sync channels`
- `/sync roles`
- `/sync panels`
- `/sync config`
- `/sync all`

This becomes the operational fix-drift command.

#### `/log`

Logging and audit controls.

Subcommands:

- `/log channel`
- `/log events`
- `/log archive`
- `/log status`

#### `/theme`

Visual styling and presentation settings.

Subcommands:

- `/theme server`
- `/theme studio`
- `/theme panels`
- `/theme reset`

This command gives Archivist a stronger premium identity.

#### `/config`

Broad configuration hub.

Subcommands:

- `/config view`
- `/config export`
- `/config import`
- `/config reset`

This is the deeper settings utility command.

### Context Commands

#### User Context

- `Member Panel`
- `Manage Access`
- `View Archive Status`

#### Message Context

- `Message Panel`
- `Archive With Archivist`
- `Save To Vault`
- `Open In Studio`

## Command UX Rules

- commands must be fully operable in Discord
- use embeds, buttons, selects, and modals instead of plain text replies
- first responses should show status chips and 2-4 clear next actions
- advanced controls should be present but tucked lower in the flow
- dashboard links may exist as optional handoffs, not as the default solution

## Architecture Fit

This pass should reuse what already exists rather than inventing a parallel system.

### Builder

- reuse current selection state and preview region infrastructure
- reuse existing drawer, sheet, asset, emoji, and upload patterns where helpful
- refactor the builder toward canvas-first behavior instead of layering another editor on top

### Commands

- reuse the existing Discord command and interaction system
- reorganize command registration around the new Archivist command spine
- prefer a unified internal command architecture rather than one-off command behavior

## Rollout Order

1. fix mobile layout bugs in the builder
2. clean up selection model for canvas-first editing
3. add bottom inspector flows for live message parts
4. restructure Add Part with valid structure visibility, including `Container`
5. integrate the assets tray or drawer into active editing
6. redesign Verify
7. redesign Bot Settings
8. ship the Archivist command spine and context commands
9. verify, polish, and deploy

## Verification

This pass is complete when:

- the default editing loop no longer depends on detached editors
- the message stays visible during common edits
- Add Part is stable on phone widths and includes all valid options such as `Container`
- overlapping mobile text and card collisions are removed from touched flows
- assets are immediately reachable while editing
- Verify feels guided instead of form-heavy
- Bot Settings feels like a premium control surface
- the main Archivist command set works in Discord and is meaningfully operable
- context commands make Archivist feel native inside Discord

## Next Step

The next step after this approved design is an implementation plan that sequences the builder fixes, module redesigns, and command-spine delivery without drifting back into detached editor-first workflows.
