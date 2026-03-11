# Design Studio Live Canvas Interaction Pass Implementation Plan

Date: 2026-03-11

## Context

The approved design for this pass is documented in `docs/plans/2026-03-11-design-studio-live-canvas-interaction-pass-design.md`.

The implementation goal is to make the message itself the editor by centering the live canvas, keeping selection state synchronized across the canvas and hierarchy, and removing unnecessary detached editor loops.

## Scope

This pass includes:

- direct-on-canvas embed region editing
- synchronized Components V2 canvas and hierarchy selection
- smarter Add Part flow with full valid structure availability, including `Container`
- integrated assets access during editing
- mobile-first layout and sheet fixes

This pass does not include:

- schema or backend redesign unless required for an existing supported action
- full redesign of every advanced action type
- a new standalone Studio application

## Delivery Strategy

Build this in layered phases so the selection model and layout foundations land before polish.

### Phase 1: Selection and Editor Surface Foundation

Target files:

- `client/src/components/design-studio/design-studio-tab.tsx`
- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/components/design-studio/design-studio-mobile-home.tsx`

Tasks:

- centralize the active editor state around the selected canvas region or component
- make canvas selection the primary source of truth for embed parts and component nodes
- define desktop and mobile editing surface behavior from the same selection model
- keep a persistent desktop properties panel and anchored mobile sheets tied to the current selection
- remove interaction paths that force a full detached edit-view-return loop when a localized editor can be used instead

Success criteria:

- selecting an embed region or component updates one shared selection state
- the active editing surface opens in context without replacing the live message
- desktop and mobile use the same selection logic with different presentation shells

### Phase 2: Direct Embed Region Editing

Target files:

- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/components/design-studio/design-studio-tab.tsx`

Tasks:

- wire title, description, author, footer, field, image, thumbnail, and color regions to localized editing flows
- support inline or anchored text editing for lightweight text regions
- support focused field editing with add, duplicate, delete, and reorder actions
- support image-slot editing with upload, saved, recent, and URL sources
- support color editing with picker, recent swatches, and saved swatches

Success criteria:

- embed content can be edited directly from the live canvas
- the embed remains visible while the user edits the selected region
- preview updates are immediate and selection stays visually clear

### Phase 3: Components V2 Hierarchy and Add Part

Target files:

- `client/src/components/design-studio/design-studio-tab.tsx`
- any extracted hierarchy or add-part helpers introduced during the refactor

Tasks:

- synchronize hierarchy selection with canvas selection in both directions
- make parent-child relationships more obvious in the visible tree
- surface quick actions on the selected node, including add child, duplicate, move, and delete where supported
- rebuild Add Part so it filters by valid context instead of behaving like a generic catalog
- ensure `Container` and other valid structural parts appear anywhere they are actually supported
- improve user-facing labels so they read like message-building actions

Success criteria:

- selecting in either the hierarchy or canvas keeps both views aligned
- Add Part exposes all valid options for the current context
- root and nested structure rules are clearer without trial and error

### Phase 4: Integrated Assets Utility

Target files:

- `client/src/components/design-studio/design-studio-tab.tsx`
- relevant asset picker, image picker, emoji picker, or color picker components already in the Studio

Tasks:

- preload and expose editing assets from the active context instead of requiring a disconnected flow
- connect text editing to divider, symbol, emoji, and supported style helpers
- connect button and select editing to fast emoji access
- connect image editing to upload, saved, recent, and URL sources
- connect color editing to recent and saved swatches alongside the picker
- keep assets scrollable, searchable, and fast for repeat use during one session

Success criteria:

- assets are one action away while editing
- text, media, emoji, and color asset entry points feel native to the selected region
- the user does not need to navigate away from the current editing context to reuse common assets

### Phase 5: Mobile Layout and Sheet Cleanup

Target files:

- `client/src/components/design-studio/design-studio-mobile-home.tsx`
- `client/src/components/design-studio/design-studio-tab.tsx`
- relevant shared sheet or drawer styles used by the Studio

Tasks:

- collapse non-viable two-column layouts on narrow screens
- fix overlapping text, cramped cards, and bad truncation
- tune sheet heights, internal spacing, and sticky controls for touch use
- improve tap target separation so editing actions do not visually collide
- reduce wasted vertical spacing while preserving readability
- keep the selected message region visible above the active sheet whenever practical

Success criteria:

- the Studio reads as a phone-first interface instead of a compressed desktop tool
- sheets and cards can handle real content without collisions
- common edit flows remain comfortable on narrow screens

### Phase 6: Verification and Polish

Tasks:

- verify desktop and mobile behavior for canvas selection, hierarchy sync, and Add Part
- verify embed region editing for text, fields, image, thumbnail, and color flows
- verify `Container` and other structural parts appear in valid contexts
- verify assets are reachable during editing without leaving the active builder context
- run project validation commands that are already part of the repo workflow
- document any remaining gaps caused by pre-existing type errors or unrelated build issues

Success criteria:

- the core editing loop feels canvas-first across the major Studio surfaces
- no major mobile regressions remain in the touched paths
- validation results are recorded clearly at the end of the implementation pass

## Risk Notes

- `design-studio-tab.tsx` is large and already carries multiple responsibilities, so the safest path is to extract focused helpers only when that reduces complexity immediately.
- Existing preview-region support in `studio-preview.tsx` should be reused rather than reimplemented.
- If a legacy detached flow is still needed for an edge case, it should be treated as a fallback instead of the primary path.

## Recommended Execution Order

1. selection model and editor surface foundation
2. direct embed region editing
3. hierarchy synchronization and Add Part restructuring
4. integrated assets entry points
5. mobile layout fixes
6. verification and polish

## Handoff

This plan is the fallback replacement for the missing `writing-plans` skill in the current workspace. It is intended to be the working implementation checklist for the next Design Studio build pass.
