# Design Studio Direct Live Editor Design

Date: 2026-03-11

## Summary

Replace the current Design Studio canvas-first experience with a live-message-first editor.

After a user chooses a starter such as `Embed`, `Components v2`, or a community template, Studio should open directly into the authored Discord-style message. The message itself becomes the main editing surface. Users tap visible regions to edit them instead of working through a separate canvas, block tree, or debug-style builder shell.

This pass also fixes trust and navigation problems in the current experience:
- `New Design` must always do something visible.
- mobile users must always have a reliable way out of sheets and editor states
- internal labels such as `TEXT BLOCK` or `COMPONENTS` must never leak into the live message surface
- preview and publish behavior should stay truthful to one another

## Goals

- Make the live Discord-style message the primary editor surface.
- Remove the annoying canvas-first workflow.
- Route `New Design` through a clear starter choice flow.
- Make mobile editing smooth and escapable.
- Prevent internal builder labels from appearing in user-facing output.
- Keep existing documents compatible while moving them into the live-editor shell.

## Non-Goals

- Full drag-and-drop layout authoring
- Replacing the underlying Studio document model
- Rewriting every Studio-adjacent module outside this shell
- Shipping public template/community infrastructure changes beyond the opening flow

## Entry Flow

Studio home should stay simple:
- `New Design`
- `Continue Design / Saved`
- community templates as a secondary browse/open surface

Selecting `New Design` opens a starter choice step:
- `Plain Message`
- `Embed`
- `Components v2`

Selecting a starter or community template should open Studio directly into the live message editor for that document. Users should not land in a generic canvas or a block inspector before seeing the message.

## Core Editing Model

The authored message is the editor.

Examples:
- tap message body -> edit message text
- tap embed title -> edit title
- tap embed description -> edit description
- tap embed field -> edit that field
- tap embed image or thumbnail -> edit media
- tap button -> edit label, emoji, style, disabled state, and action
- tap dropdown -> edit placeholder, options, emoji, limits, and action
- tap visible Components v2 regions -> edit their content and settings

The editor must not expose internal schema language inside the message surface.

## Mobile Interaction Model

Mobile should use the smoothest path with the least chance of trapping the user:
- the live message remains the main screen
- tapping a visible region opens a bottom sheet editor for that exact region
- closing the sheet returns to the live message

Reliability rules:
- only one blocking overlay should be active at a time
- browser back should close the current overlay first
- browser back from the live message should return to Studio home
- every sheet should have a clear exit path

## Desktop Interaction Model

Desktop should keep the live message visible while editing:
- the live message stays centered
- selecting a region opens a right-side editor panel
- utility destinations such as Issues, Publish, Assets, and Code remain secondary surfaces

Desktop should feel like editing the message itself, not managing an abstract tree of components.

## Truthful Rendering

The live editor must render like an actual message, not a developer debug surface.

Requirements:
- internal labels like `TEXT BLOCK`, `COMPONENTS`, `SECTION`, and similar builder terms never appear unless the user typed them
- empty regions use polished placeholders such as `Add description`, `Add button label`, or `Tap to add field`
- if a region cannot render truthfully yet, keep it out of the visible message and surface the limitation in Issues instead
- community templates should open already looking like real messages

## Add / Remove / Reorder

Add actions should be message-part oriented rather than schema oriented.

Examples:
- add field
- add button
- add dropdown
- add image
- add section
- add notice panel

Selected regions should expose simple structural controls:
- move up
- move down
- duplicate
- delete

## Reliability Rules

- `New Design` must always produce a visible next state.
- Opening a document must create a real navigation state so browser back works.
- Failed create/open actions must leave the user on a safe, recoverable screen with a clear error.
- The live message view and publish planner should share rendering rules as much as possible.
- Existing saved documents should load into the new live-editor shell instead of falling back to the old canvas workflow.

## Testing Expectations

- `New Design` opens the starter chooser
- choosing `Plain Message`, `Embed`, `Components v2`, or a template opens the live editor
- tapping visible message parts opens the correct editor
- mobile back closes sheets correctly
- no leaked internal labels appear in the live message
- browser back exits cleanly instead of trapping the user in Studio

## Implementation Focus

1. Fix entry routing so `New Design` and starter selection are reliable.
2. Make live preview the primary editing shell.
3. Remove or demote canvas/debug-first UI from the default path.
4. Repair mobile navigation and overlay state so users can always exit cleanly.
5. Normalize placeholder and fallback rendering so Components v2 feels like a real message.
