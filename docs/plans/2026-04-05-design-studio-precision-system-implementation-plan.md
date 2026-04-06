Date: 2026-04-05

# Design Studio Precision System Implementation Plan

## Context

The approved design is documented in `docs/plans/2026-04-05-design-studio-precision-system-design.md`.

This pass focuses on high-impact Studio upgrades that materially improve product feel and usability while preserving the existing authoring model and working behavior.

## Scope

This implementation pass includes:

- premium Studio session bar updates
- Build / Style / Publish mode model
- document theme presets and editable theme-pack controls
- better structure rail and insert catalog presentation
- action-row and button inspector overhaul
- stronger publish preflight grouping
- mobile touch-target and copy improvements in the touched Studio surfaces
- removal of obvious off-theme color leaks inside the Studio UI

This pass does not include:

- a brand new Studio renderer
- drag-and-drop reordering across the entire builder
- a full visual diff system
- every planned preset block or token feature

## Delivery Order

### Phase 1: Shared Studio Design System Helpers

Target files:

- `client/src/components/design-studio-v2/studio-v2-style-system.ts`
- optional supporting preset helper files

Tasks:

- define reusable Studio theme presets
- add helpers for applying and editing document theme packs
- add reusable block preset definitions for contextual insert flows

### Phase 2: Studio Shell Upgrade

Target files:

- `client/src/components/design-studio-v2/design-studio-v2.tsx`

Tasks:

- convert top-level Studio modes to Build / Style / Publish
- upgrade the sticky session bar
- expose active preset, readiness, and concise status chips
- keep the build canvas as the main focus

### Phase 3: Style Mode

Target files:

- `client/src/components/design-studio-v2/design-studio-v2.tsx`

Tasks:

- add preset selection
- add theme-pack controls for accent, border style, spacing feel, and emoji style
- add a safe restyle action that syncs the active theme into embeds and notice blocks
- fold asset access into the style lane so the product keeps a cleaner top-level mode model

### Phase 4: Structure And Insert Upgrade

Target files:

- `client/src/components/design-studio-v2/studio-v2-builder-primitives.tsx`
- `client/src/components/design-studio-v2/design-studio-v2.tsx`

Tasks:

- improve composition item hierarchy and active states
- enlarge insert-card touch targets on mobile
- add preset block insert options

### Phase 5: Action Row And Button Inspector Upgrade

Target files:

- `client/src/components/design-studio-v2/design-studio-v2.tsx`

Tasks:

- redesign row summary cards
- add direct open / reorder actions for row children
- expose button custom IDs more clearly
- add a stronger button summary surface before the deeper action editor

### Phase 6: Publish Trust Pass

Target files:

- `client/src/components/design-studio-v2/design-studio-v2.tsx`

Tasks:

- merge issues into publish preflight
- make blocking and downgraded states clearer
- keep publish debug available without dominating the surface

### Phase 7: Theme Cleanup

Target files:

- `client/src/components/design-studio-v2/studio-embed-inspector.tsx`
- `client/src/components/design-studio/studio-preview.tsx`
- touched Studio UI files as needed

Tasks:

- remove obvious blue, green, and amber editing-ui accents
- make red/chrome the consistent Studio editing language

## Verification

- run the project build
- verify the Studio shell still renders
- verify Build / Style / Publish mode switching
- verify preset application updates document theme state
- verify action-row and button editing still save and publish correctly
