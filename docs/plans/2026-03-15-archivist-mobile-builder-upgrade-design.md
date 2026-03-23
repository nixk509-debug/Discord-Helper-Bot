# Archivist Mobile Builder Upgrade Design

## Summary

Archivist should evolve into a true mobile-first Discord bot control center with a stronger premium visual system, a much more capable `Custom Commands` authoring experience, and a redesigned `Design Studio` centered around Discord Components V2 composition.

The product should not become code-first. It should stay visual, touch-friendly, and simple on first use, while becoming dramatically more customizable and feature-rich underneath. Mobile is the primary target. Desktop should be an expanded version of the same logic rather than a separate interaction model.

## Product Goals

- Make the dashboard feel more premium, more polished, and more intentional without becoming cluttered.
- Keep the entire product primarily mobile-optimized.
- Make `Design Studio` feel like a real Discord component builder rather than a generic editor.
- Make `Custom Commands` feel substantially more powerful while remaining visual and approachable.
- Prevent invalid builder states by aligning editing flows to Discord’s actual component rules.
- Increase depth and flexibility without increasing confusion.

## Core Product Direction

### Dashboard

The dashboard should remain a mobile-first control center with:

- sticky top bar
- partial-width slide-out left drawer
- strong navigation hierarchy
- highly readable content cards
- darker, richer Archivist atmosphere

The visual direction should become more dramatic and polished:

- deeper matte black and graphite foundations
- controlled crimson lighting and glow
- stronger card hierarchy and surface contrast
- more cinematic but still product-realistic backgrounds
- no poster-style hero art inside working pages

The shell should feel expensive and sharp, but operational.

### Custom Commands

`Custom Commands` should become a two-level visual authoring experience:

1. Standard mode
   - simple trigger/conditions/actions flow
   - approachable for ordinary users
   - clean list pages and focused editor pages

2. Advanced mode
   - still visual, not raw code
   - denser logic stacks
   - nested condition groups
   - variable chips and expression-style editing
   - clearer action sequencing
   - richer response composition

Both modes should persist to the same structured command model. The advanced mode should feel “programmable” without requiring a DSL or freeform code editor.

### Design Studio

`Design Studio` should become a mobile-first Discord Components V2 builder.

The editing model should map directly to Discord’s real component primitives and nesting behavior:

- `Text Display`
- `Separator`
- `Section`
- `Thumbnail`
- `Container`
- `Media Gallery`
- `Media Gallery Item`
- `Button`
- `File`
- `Attachment`
- `Action Row`
- select menus such as `Channel Select`

The Studio should remain visual, not code-first, but the structure should reflect the real V2 component hierarchy closely enough that advanced users feel they are building real Discord payloads.

## Design Studio Builder Model

### Builder Philosophy

The Studio should be a strict visual tree builder.

- Users should not freely create arbitrary invalid nests.
- Every component node should only expose valid child insertion points.
- `+ Add Child` should appear only where a valid child may be inserted.
- Child menus should only show valid Discord-supported child types.

This keeps the interface simple by removing impossible options rather than hiding power.

### Tree Structure

The tree should be the canonical editing model.

Each node row should show:

- component icon
- component type label
- short summary of configured content
- quick actions
- expand/collapse affordance for container-like nodes

Nested children should indent cleanly and stay perfectly aligned on mobile.

### Child Insertion

Every parent that accepts children should have a visible `+ Add` affordance.

Examples:

- `Container` can accept content/layout children allowed by Discord
- `Section` can accept text-display children and a single accessory
- `Action Row` can accept valid interactive children according to Discord rules

The insertion flow should be:

1. User taps `+ Add`
2. Builder opens a constrained add menu
3. User sees only valid child types for that position
4. New child inserts directly into the visible tree
5. The new child opens in properties editing immediately

This should feel immediate and obvious on mobile.

### Property Editing

Selecting a node should open a focused properties surface.

Mobile behavior:

- structure tree remains the default screen
- tapping a node opens a focused editor panel or bottom sheet
- preview remains reachable but not cramped into the editing space

Property panels should be purpose-built per component type rather than generic JSON-like forms.

Examples:

- `Text Display`: content, formatting helpers, emoji insertion
- `Separator`: divider on/off, spacing size
- `Section`: text block management, accessory assignment
- `Thumbnail`: media URL or uploaded asset
- `Button`: style, label, emoji, URL/custom action
- `Channel Select`: placeholder, min/max, allowed channel types
- `Container`: accent color, order of children
- `Media Gallery`: item list and asset ordering
- `File`: attachment source and display

## Studio Feature Upgrades

The first major Studio upgrade should include:

- visible child-slot insertion
- component tree editing
- Discord-aware nesting constraints
- emoji helpers
- accent color controls
- better button editing
- select menu editing
- attachment/file component support
- media gallery editing
- improved reorder UX
- stronger live preview

The product should feel far more capable while still remaining easy to use.

## Custom Commands Upgrade Direction

### Standard Mode

Standard mode should remain optimized for clarity.

- trigger setup
- conditions
- actions
- settings
- save/test flows

This mode should be faster, cleaner, and more aligned visually with Studio.

### Advanced Mode

Advanced mode should introduce richer structured logic without becoming text-code.

Features should include:

- grouped conditions
- ordered action stacks
- nested logic sections
- more expressive response outputs
- variable chips and insertion tools
- richer command summaries
- stronger live outcome preview

Advanced mode should feel like a “builder for power users,” not a programming IDE.

### Command-to-Studio Relationship

Commands should be able to:

- send Studio V2 assets
- reference reusable Studio documents
- use richer Discord outputs more naturally

This should make Studio and Commands feel like one connected authoring ecosystem rather than separate products.

## Mobile-First UX Rules

This is the most important UX constraint.

- Mobile is the primary design target.
- Desktop is an expanded expression of the mobile flow.
- No core workflow should depend on desktop-only multi-pane density.
- No editing surface should feel like a shrunk desktop app.

### Mobile Interaction Rules

- minimum 44px tap targets
- single primary editing lane
- one dominant action per screen
- consistent spacing tokens
- clear visual alignment between icon, text, and actions
- no messy horizontal compression
- fast and smooth transitions
- predictable sticky controls only when necessary

### Mobile Studio Layout

The canonical mobile Studio flow should be:

1. sticky editor top bar
2. structure tree as the default view
3. tap node to edit
4. focused property sheet/panel opens
5. preview is available as a dedicated readable mode

The preview should never feel cramped or secondary-quality.

### Mobile Custom Commands Layout

The canonical mobile command-builder flow should be:

1. command overview/list
2. focused command editor
3. visual logic stacks
4. compact live preview/summary

Advanced mode should still be card-based, aligned, and touch-friendly.

## Dashboard Visual Upgrade Direction

The dashboard should receive a stronger visual upgrade in parallel with the builder changes.

Desired improvements:

- sharper cards
- cleaner alignment
- stronger typography hierarchy
- improved icon treatment
- richer dark surface layering
- smoother transitions and page states
- better empty states
- more premium module cards and editor shells

The experience should feel more “premium product UI” and less like an early rebuild surface.

## Accessibility and Usability Requirements

- preserve high readability
- maintain strong contrast in dark mode
- keep icon-only actions labeled
- avoid tiny controls
- avoid horizontal overflow on mobile
- preserve smooth operation with reduced complexity in default mode

## Recommended Implementation Direction

The recommended implementation direction is:

1. Keep the product visual-first
2. Upgrade `Design Studio` into a strict Discord V2 tree builder
3. Upgrade `Custom Commands` into standard and advanced visual modes
4. Push the dashboard visual quality higher
5. Treat mobile as the canonical workflow for all editing surfaces

## Non-Goals

- no raw code editor as the primary authoring path
- no desktop-first builder layouts
- no generic freeform canvas disconnected from Discord’s actual rules
- no clutter-heavy maximalism that harms readability or control

## Acceptance Criteria

- Mobile editing should feel smooth, aligned, and first-class.
- Studio should support visible, valid child insertion for Discord V2 components.
- Commands should feel significantly more powerful without becoming hard to use.
- Dashboard visuals should feel noticeably more premium.
- The product should stay visual and simple by default, but much more customizable overall.
