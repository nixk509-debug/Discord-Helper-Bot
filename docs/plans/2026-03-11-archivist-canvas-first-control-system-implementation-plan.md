# Archivist Canvas-First Control System Implementation Plan

Date: 2026-03-11

## Context

The approved design for this pass is documented in `docs/plans/2026-03-11-archivist-canvas-first-control-system-design.md`.

This implementation plan coordinates three linked delivery tracks:

- builder interaction correction
- Verify and Bot Settings workflow redesign
- Discord-native Archivist command spine

The goal is to deliver these as one coherent system while keeping the builder refactor and command work manageable.

## Scope

This pass includes:

- mobile layout fixes in the builder
- canvas-first message editing with bottom inspectors
- smarter Add Part behavior with valid structure visibility, including `Container`
- integrated assets access during editing
- Verify redesign
- Bot Settings redesign
- Archivist command spine:
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
- selected user and message context commands where feasible

This pass does not include:

- full redesigns of every remaining server module
- a new standalone Studio application
- a brand new backend command architecture unless current code cannot support the intended v1 flows

## Delivery Strategy

Build from interaction foundations upward.

The builder has the highest user-facing friction right now, so mobile fixes and selection-model correction land first. Module redesigns should build on that new surface language. Command work should reuse the same product framing and module structure so Discord feels like a native extension of the dashboard.

## Phase 1: Mobile Builder Stabilization

Target files:

- `client/src/components/design-studio/design-studio-tab.tsx`
- `client/src/components/design-studio/design-studio-mobile-home.tsx`
- relevant shared drawer, sheet, and layout styles touched by the builder

Tasks:

- collapse broken two-column layouts earlier on narrow screens
- convert Add Part to a one-column default on smaller phones
- remove overlapping text and card height failures
- improve content wrapping and reduce destructive truncation
- fix safe-area spacing and sticky control collisions
- tune bottom sheet sizing for real phone use
- reduce wasted vertical spacing while preserving readability

Success criteria:

- no overlapping text remains in the touched builder surfaces
- Add Part works cleanly on small phones
- cards and sheets size to content without visual collisions
- the Studio feels intentionally mobile-first

## Phase 2: Canvas-First Selection Model

Target files:

- `client/src/components/design-studio/design-studio-tab.tsx`
- `client/src/components/design-studio/studio-preview.tsx`

Tasks:

- unify selection state around the visible message canvas
- make visible-part selection the primary source of truth for editing
- keep the message visible during common edit flows
- move existing detached edit actions behind the new selection-driven inspector flows
- ensure desktop and mobile share one selection model even if presentation differs

Success criteria:

- the default edit flow starts on the live message
- selection state is consistent for embeds, message parts, and components
- detached editors are secondary, not the main loop

## Phase 3: Bottom Inspectors and Inline Editors

Target files:

- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/components/design-studio/design-studio-tab.tsx`

Tasks:

- add bottom inspector flows for common part editing
- support in-place or anchored editing for lightweight text regions
- support inspector-driven editing for embeds, buttons, dropdowns, notice panels, dividers, images, thumbnails, and galleries
- keep the selected region visibly highlighted on the canvas
- preserve advanced editors as explicit fallbacks only when the inspector is not enough

Success criteria:

- common edits happen without leaving the canvas
- the selected part stays visible and understandable while editing
- the editing model matches `canvas first, inspector second, full editor only when needed`

## Phase 4: Add Part and Structural Validity

Target files:

- `client/src/components/design-studio/design-studio-tab.tsx`
- any extracted helpers for part definitions or hierarchy rules

Tasks:

- make Add Part context-smart based on the current selection
- show all valid supported parts for the current context
- ensure `Container` appears anywhere it is supported
- expose valid child relationships more clearly
- simplify part descriptions on mobile
- make the flow feel fast and message-oriented instead of like a settings catalog

Success criteria:

- users can see valid structure options without guesswork
- mobile Add Part is stable and readable
- no valid root or child option is hidden when supported

## Phase 5: Integrated Assets Utility

Target files:

- `client/src/components/design-studio/design-studio-tab.tsx`
- relevant asset, emoji, media, and color helper components already used by the Studio

Tasks:

- turn assets into a nearby tray or drawer tied to the current edit context
- preload and expose useful assets during editing
- connect text and embed editing to dividers, styles, symbols, and emojis
- connect button and select editing to quick emoji access
- connect image, thumbnail, and gallery editing to upload, saved, recent, and URL sources
- connect color editing to picker plus recent and saved swatches

Success criteria:

- assets are one action away while editing
- asset usage feels native to the selected part
- the user does not need to leave context to reuse common assets

## Phase 6: Verify Workflow Redesign

Target files:

- `client/src/components/verify/verify-tab.tsx`
- any shared server-shell action or status components reused by the module

Tasks:

- restructure Verify into guided sections:
  - Requirements
  - Verification Message
  - Result Role
  - Test / Publish
- surface readiness, missing setup, and next actions clearly
- preserve existing settings support while reducing long-form fatigue
- improve call-to-action priority for creating, editing, testing, and publishing the verification surface

Success criteria:

- Verify feels guided and operational instead of like a flat settings form
- the user can quickly see what is configured, what is missing, and what to do next

## Phase 7: Bot Settings Workflow Redesign

Target files:

- `client/src/pages/dashboard/server.tsx`
- the current general settings surface inside that page, or any extracted replacement component created during refactor

Tasks:

- reorganize Bot Settings into:
  - Identity
  - Behavior
  - Permissions
  - Integrations
  - Advanced
- improve section hierarchy and action framing
- reduce the feeling of one long config dump
- make the surface feel like a premium control center inside the Archivist shell

Success criteria:

- Bot Settings reads as a designed control surface
- grouping and naming are clearer
- primary tasks are easier to scan and complete

## Phase 8: Archivist Command Spine

Target files:

- `server/bot/index.ts`
- `server/bot/commands/*.ts`
- any shared command helpers introduced during the refactor

Tasks:

- define and register the top-level command set:
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
- add the approved subcommand structure for each family
- design command responses as rich Discord-native control surfaces
- keep first responses clear, status-driven, and action-oriented
- implement fully operable v1 behavior inside Discord instead of dashboard-link stubs
- add the selected user and message context commands where feasible

Success criteria:

- Archivist has a coherent admin/settings command spine in Discord
- major command families are actually useful in v1
- the command language matches the dashboard and Studio product model

## Phase 9: Verification and Deployment

Tasks:

- verify mobile builder behavior on narrow layouts
- verify the new canvas-first editing loop for common part types
- verify Add Part validity and `Container` availability
- verify assets are reachable during editing
- verify Verify and Bot Settings flows with real partial and complete data
- verify slash command registration and interaction handling
- run the repo validation commands that are feasible in the current workspace
- document any remaining limitations caused by unrelated pre-existing issues
- deploy once the build is stable

Success criteria:

- the touched flows are stable across builder, dashboard, and Discord command surfaces
- validation results are recorded clearly
- deployment is repeatable and verifiable

## Risk Notes

- `client/src/components/design-studio/design-studio-tab.tsx` is already very large, so refactors should extract helpers only when doing so clearly reduces current complexity.
- Command work can sprawl quickly if every family tries to solve every edge case in v1; keep first responses focused and operational.
- Verify and Bot Settings should adopt the new product language without blocking on deeper backend changes unless they are truly required.

## Recommended Execution Order

1. mobile builder stabilization
2. canvas-first selection model
3. bottom inspectors and inline editors
4. Add Part restructuring
5. integrated assets utility
6. Verify redesign
7. Bot Settings redesign
8. Archivist command spine
9. verification and deployment

## Handoff

This plan is the fallback replacement for the missing `writing-plans` skill in the current workspace. It is the working implementation checklist for the next build pass.
