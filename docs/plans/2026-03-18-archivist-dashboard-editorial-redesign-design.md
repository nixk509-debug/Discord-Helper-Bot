# Archivist Dashboard Editorial Redesign

Date: 2026-03-18

## Summary

Redesign the current Archivist dashboard into a calmer, premium, mobile-first control surface. The redesign keeps the existing feature set, but replaces the fragmented page chrome, heavy visual noise, and inconsistent mobile flows with one shared shell, one shared editorial card system, and one task-first interaction pattern per page.

This is not a cosmetic polish pass. It is a structural redesign of the dashboard shell and major dashboard surfaces so the product feels like one built-in Archivist experience instead of several loosely connected mini apps.

## Goals

- Make the full dashboard feel cohesive across Overview, Custom Commands, Studio, Creative, Settings, and Site Editor.
- Make mobile the primary layout target without degrading desktop.
- Reduce visual noise and control overload.
- Improve task clarity so each screen has one obvious next action.
- Reuse one shared design system across the dashboard rather than feature-specific UI rules.
- Preserve existing functionality while simplifying the surface around it.

## Non-Goals

- No rewrite of the underlying bot/runtime systems.
- No raw CMS-style page builder for dashboard features.
- No feature removals unless a control is truly duplicated or dead weight.
- No separate visual language per page.

## Product Direction

Archivist should feel like a premium editorial control room:

- dark, but quieter
- sharp and modern, not gamer-glossy
- readable on a phone without zooming or hunting
- red used as an intentional accent, not as a blanket treatment
- one shell language across all tools

The current dashboard leans too hard on glow, deep gradients, repeated pills, and stacked chrome. The redesign should keep Archivist recognizable while shifting emphasis toward hierarchy, spacing, and clarity.

## Key Problems To Solve

1. Mobile chrome is over-stacked.
   - Sticky headers, feature tabs, mobile mode switches, and fixed action bars compete for the same vertical space.

2. Navigation and mode systems are inconsistent.
   - Different tools use different mobile patterns, so users keep relearning the interface.

3. The visual system is too loud.
   - Background effects, glossy surfaces, and repeated accent treatments flatten hierarchy instead of reinforcing it.

4. Shared cards and form blocks are too dense on mobile.
   - Long helper copy, heavy borders, badges, and large padding create scroll fatigue.

5. Page structure is not task-first.
   - Many screens expose too many secondary controls before the primary action.

## Architecture

The redesign is built around one shared dashboard shell and one shared content grammar.

### Shared Shell

Every dashboard surface should inherit:

- one calm top app bar
- one content column
- one optional contextual action rail on mobile only when a screen truly has primary actions
- one consistent page intro pattern
- one shared drawer/sidebar model

There should not be competing combinations of:

- sticky header
- feature tabs
- internal tabs
- fixed bottom controls
- page-local mini navigation

Unless a page truly needs a local mode switch, it should live inside the page body and follow the same visual pattern as the rest of the app.

### Shared Surface Grammar

Archivist should use a small set of page primitives with clear jobs:

- `Hero header`
  - title, one-line summary, one primary action, optional secondary metadata
- `Lead card`
  - the main next action or entry point for the page
- `Section card`
  - grouped content or tools
- `Compact row`
  - scannable list item with one main action
- `Inline meta`
  - small supporting facts, not pill spam

The current panel/row/pill system is doing too many jobs. The redesign should separate content, navigation, status, and action patterns more clearly.

## Visual System

### Tone

Archivist should shift from `glossy dark control board` to `quiet editorial workstation`.

### Visual Changes

- remove most ember/grid/shimmer background layers
- reduce global glow and high-contrast decorative borders
- use cleaner dark surfaces with stronger contrast between base, raised, and emphasized areas
- increase body copy size and line-height on mobile
- reduce overuse of all-caps micro labels
- use red for:
  - current state
  - destructive actions
  - publish/save emphasis
  - key call-to-action moments

### Typography

The type system should become more readable and more premium:

- larger body copy on mobile
- calmer supporting labels
- fewer tiny uppercase labels
- stronger title/subtitle rhythm

Display type can still be distinctive, but body and UI text should prioritize clarity.

## Page Structure

Each major page should follow a task-first layout.

### Overview

Purpose:
- choose a server
- enter the right workspace

Pattern:
- one lead workspace card
- compact server list
- lightweight system status

The overview should stop trying to feel like a control board and instead feel like a launch surface.

### Custom Commands

Mobile pattern:
- `Library -> Editor -> Test`

Behavior:
- library remains the discovery/manage surface
- editor becomes the main focused workspace
- test/preview lives in one inspect surface instead of being spread across the page
- primary actions should be in one consistent place

### Studio

Mobile pattern:
- `Edit -> Assets -> Publish`

Behavior:
- keep message-first editing
- avoid extra preview framing
- reduce duplicated controls around the editor
- keep publish checks and publish action together

### Site Editor

Mobile pattern:
- `Sections -> Preview -> Publish`

Behavior:
- keep draft-first structure
- keep section editing in sheets
- avoid duplicated publish/save controls

### Settings

Pattern:
- compact reference page

Behavior:
- cleaner info hierarchy
- fewer decorative cards
- one obvious action area

### Creative

Pattern:
- compact module browser plus recent runtime signals

Behavior:
- avoid giving secondary features the same heavy treatment as primary tools

## Mobile Contract

The redesign should define one mobile behavior contract:

- app bar remains stable and compact
- content owns most of the viewport height
- only one persistent action rail at a time
- touch targets remain large and clear
- rows collapse gracefully instead of wrapping into cluttered clusters
- page intros stay short

Heavy editor screens should feel like guided flows, not desktop layouts squeezed into a phone column.

## Interaction Rules

- Each screen gets one primary action.
- Secondary actions should be visually quieter.
- Supportive status should be inline, not repeated in badges.
- Long helper copy should be collapsible or shortened by default.
- Save, publish, and test controls should live in predictable positions across tools.

## Technical Direction

The redesign should be implemented as a shared dashboard system, not one-off page rewrites.

Core work:

- rebuild shared shell primitives
- rebuild shared layout primitives
- refresh typography, spacing, and color tokens in the dashboard layer
- refactor the main dashboard pages onto the new system
- adapt heavy editors to the shared mobile contract

Existing business logic should be preserved. The work is primarily a shell, layout, and interface architecture pass.

## Testing

The redesign should be verified with:

- local typecheck/build
- mobile viewport checks on overview, workspace, studio, custom commands, site editor, creative, and settings
- smoke test for drawer navigation, search, save, publish, and logout placement
- live authenticated dashboard check after deployment

## Rollout

Recommended order:

1. shared shell and design tokens
2. overview, settings, and creative
3. custom commands mobile flow cleanup
4. studio shell cleanup
5. site editor cleanup
6. final cross-dashboard polish and smoke test

## Success Criteria

The redesign is successful if:

- the dashboard feels like one product
- mobile no longer feels stacked or cramped
- the main next action on each page is obvious
- heavy tools stop fighting the viewport with duplicate chrome
- Archivist feels cleaner, sharper, and more premium without losing personality
