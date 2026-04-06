Date: 2026-04-05

# Design Studio Precision System Design

## Summary

This pass upgrades Archivist Design Studio from a capable editor into a premium, canvas-first product surface.

The focus is not raw speed. The focus is depth, clarity, and creative control without overwhelming the builder.

The approved direction is:

- canvas-first by default
- one contextual inspector at a time
- deeper visual control in a dedicated style layer
- stronger publish trust and diagnostics
- cleaner mobile behavior with fewer competing surfaces

## Goals

- Make the live message canvas the visual anchor of Studio
- Reduce interface noise without removing power
- Add a reusable visual system for presets, accents, spacing, and document styling
- Improve the weakest interaction zone: action rows and button editing
- Make mobile Studio feel intentional instead of compressed
- Increase perceived product value immediately

## Non-Goals

- Replacing Design Studio with a new application
- Reworking unrelated dashboard modules in this pass
- Building every possible advanced authoring feature at once
- Adding dense control-room chrome that makes Studio harder to learn

## Approved Product Direction

Use a canvas-first precision studio.

The live message stays central. The structure rail stays compact. The inspector only shows controls for the selected object. Advanced styling belongs in a dedicated mode instead of being sprayed across the default editing surface.

The main Studio modes become:

- Build
- Style
- Publish

Build is calm and contextual.

Style is where reusable visual system controls, presets, and theme overrides live.

Publish is where readiness, diagnostics, and deployment confidence live.

## Experience Model

### Core Layout

- center: live canvas
- left: compact structure rail plus focused insert tools
- right: contextual inspector only when selection requires it
- top: premium session bar with document identity, save state, mode, active preset, issues, and publish confidence

### Selection Rule

The user should always feel like they are editing the thing they can currently see.

- click embed -> embed-focused inspector and cleaner preview posture
- click action row -> action-row editing posture with clearer row logic
- click message -> message-level controls only

## Visual System

Archivist keeps one visual language:

- matte black base
- chrome white borders
- cold white text
- red as the only active accent

Studio should stop leaking off-theme colors in its own editing UI.

The style system should be layered:

- document-level preset
- view-level intent
- component-level override only when needed

Approved preset family:

- Signal
- Operator
- Broadcast
- Alert
- Clean System

## Feature Upgrades

### Session Bar

- document title
- save state
- active preset
- publish confidence
- issue count
- undo / redo
- focused mode switching

### Focused Insert Flow

Replace generic insert density with contextual groups:

- content
- interaction
- structure
- preset blocks

### Reusable Styling

- theme presets stored with the document
- editable accent, spacing, and chrome settings
- reusable look across welcome, verification, tickets, announcements, and utilities

### Action Row Overhaul

- visual row summary
- clearer slot usage
- better child cards
- inline custom ID visibility
- direct open / reorder actions
- better mobile copy and touch targets

### Publish Trust

- issues are surfaced as plain-language preflight
- downgrade and blocking states are clearer
- publish controls feel like a deployment lane, not a raw form

## Mobile Behavior

Mobile should not try to mirror desktop density.

The mobile Studio should keep:

- one primary canvas
- one companion layer at a time
- stronger add / inspect / style entry states
- larger tap targets in structure and insert surfaces
- a tighter sticky session bar

## Accessibility

- stronger focus states
- predictable keyboard reachability
- readable selected-state contrast
- tooltips or labels for icon actions
- motion that clarifies instead of distracting

## First Implementation Pass

1. Rebuild the Studio shell around Build / Style / Publish.
2. Add a reusable document style system with presets and editable theme-pack settings.
3. Upgrade structure rail and insert catalog density, hierarchy, and mobile touch targets.
4. Redesign action row and button editing to feel visual, compact, and trustworthy.
5. Fold issues into a stronger publish preflight lane.
6. Remove obvious off-theme UI color leaks in the Studio editing surfaces.
