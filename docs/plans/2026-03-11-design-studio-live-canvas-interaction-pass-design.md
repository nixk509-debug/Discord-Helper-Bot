# Design Studio Live Canvas Interaction Pass Design

Date: 2026-03-11

## Summary

Upgrade Design Studio so the live message itself becomes the editor. This pass replaces detached editor-heavy interaction loops with direct-on-canvas selection, anchored editing surfaces, synchronized component hierarchy behavior, integrated assets access, and mobile-first layout fixes.

## Goals

- Make the live message canvas the primary editing surface
- Support direct editing of embed regions without forcing users through detached editor loops
- Improve Components V2 understanding with a visible hierarchy and clearer nesting flow
- Make assets feel preloaded, useful, and immediately reachable during editing
- Fix current mobile layout bugs and cramped editing behavior
- Keep the user visually connected to the message while editing

## Non-Goals

- Backend or schema redesign unless absolutely required
- Rebuilding Design Studio as a separate application
- Restyling every advanced action type equally in this pass
- Returning to detached editor-first workflows

## Approved Direction

Use a hybrid live-canvas editor model.

The canvas is the primary editor in both desktop and mobile. Selections always happen on the live message itself. Once selected:

- desktop opens a persistent side properties panel
- mobile opens anchored bottom sheets or localized drawers
- both preserve the same selection logic, visual highlight language, and live-update behavior

This is the smoothest interaction model because it keeps the message central while still using screen space appropriately on each device class.

## Core Interaction Model

The message preview is no longer just a preview. It becomes the main editing canvas.

### Editing Loop

1. The user taps or clicks a part of the message.
2. That region becomes selected directly on the canvas.
3. Editing controls appear nearby without replacing the message.
4. Changes update the message immediately.
5. The user stays visually anchored to the exact message region they are editing.

This removes the old loop of selecting a thing, opening a detached editor, changing it, exiting, and then checking the result afterward.

## Embed Editing Model

Embed regions stay directly selectable on the live embed card.

Supported editable regions:

- author
- title
- description
- fields
- footer
- image
- thumbnail
- color

### Region Behavior

- Title, description, author, and footer open lightweight inline or anchored text editors tied to that specific region.
- Image and thumbnail open a media picker localized to that slot.
- Fields open focused field editing for the exact selected field, with nearby actions for add, duplicate, delete, and reorder.
- Color opens a swatch and color picker surface with recent and saved values.

At no point should the user lose the embed they are editing from view unless the device size makes it unavoidable.

## Components V2 Interaction Model

The canvas and hierarchy become two synchronized views of the same structure.

### Selection Rules

- Selecting a component on the canvas highlights it in the hierarchy.
- Selecting it in the hierarchy highlights it on the canvas.
- The selected node shows its role, parent context, and available next actions.

### Hierarchy Rules

The hierarchy must make nesting understandable.

- Root-level valid structures must be visible.
- Containers and sections must visibly communicate that they accept children.
- Action rows must visibly communicate that they accept interactive children.
- Valid nested relationships should be obvious instead of hidden behind trial and error.

### Container Availability

`Container` must be available in Add Part wherever it is supported by the system. Valid root structure options should not be hidden from the builder.

## Add Part Flow

The Add Part flow should become context-aware, faster, and more message-oriented.

### Rules

- Show all valid supported parts for the current context.
- Do not hide valid structural options such as `Container`.
- Prefer practical, creator-facing labels.
- Make the flow feel like adding directly to the canvas rather than browsing a generic settings menu.

### Example Labels

- Text
- Divider
- Section
- Container
- Button Row
- Button
- Select Menu
- Image
- Media Gallery
- Style Block

When a parent is selected, the flow should explain what can be added inside that parent. When nothing is selected, it should show valid root-level parts.

## Assets Surface

Assets should become an integrated, preloaded editing utility instead of a detached library trip.

### Asset Types

- dividers
- borders
- symbols
- emojis
- custom emojis
- saved images
- recent images
- saved swatches
- favorites
- supported formatting or style snippets

### Behavior

- Assets must be one action away from the current selection.
- Text editing can insert dividers, symbols, emojis, and style helpers directly.
- Button and select editing should expose emoji helpers quickly.
- Image slots should expose upload, saved, recent, and URL sources immediately.
- Color editing should expose picker, recent colors, and saved swatches together.

The assets surface should feel scrollable, searchable, and ready for repeated use during one editing session.

## Device-Specific Editing Surfaces

### Desktop

Desktop uses a persistent side properties panel.

Why:

- keeps the message canvas visible
- supports faster repeated edits
- uses available screen width well
- avoids excessive modal churn

### Mobile

Mobile uses anchored bottom sheets and localized drawers.

Why:

- preserves canvas context above the editing surface
- fits touch ergonomics better
- avoids overloading the screen with tiny side panels
- supports focused editing without losing place

## Mobile Fixes

This pass must explicitly address current mobile layout issues.

### Required Fixes

- overlapping text
- cards that are too short for content
- bad wrapping or truncation
- two-column layouts that do not fit phone widths
- cramped sheets and modals
- wasted vertical spacing
- tap targets that visually collide

The Studio should feel intentionally designed for phones first, not like a desktop tool compressed into a smaller frame.

## Existing Codebase Fit

This pass should build on the current Studio direction rather than starting over.

Current useful foundations already exist:

- live preview region selection in `studio-preview.tsx`
- valid `Container` node type and nesting logic in `design-studio-tab.tsx`
- mobile-focused builder shell work already present in the Studio flow

The main change is to restructure the interaction model so those capabilities feel direct, visible, and editor-first.

## Architecture

Implement this inside the existing Studio surfaces rather than splitting the editor into a new app.

### Likely Files

- `client/src/components/design-studio/design-studio-tab.tsx`
- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/components/design-studio/design-studio-mobile-home.tsx`
- related shared UI sheet, drawer, and panel components if needed

### Implementation Focus

1. unify selection state around canvas-first editing
2. connect embed regions to localized editors
3. synchronize canvas and hierarchy selection for Components V2
4. rebuild Add Part as a context-aware structure flow
5. integrate assets into active editing surfaces
6. fix mobile layout, spacing, and sheet behavior

## Verification

This pass is complete when:

- embed regions can be edited directly from the canvas
- desktop keeps the message visible while editing through a side panel
- mobile keeps the message visibly connected to anchored editing sheets
- component hierarchy and canvas selection stay synchronized
- `Container` appears anywhere it is valid in Add Part
- assets are easy to reach while editing text, media, buttons, and colors
- mobile layout bugs are materially reduced
- the builder no longer feels centered around detached editor flows

## Next Step

After this pass, Design Studio should feel like a true live message builder. Later passes can refine specific advanced editors and deeper module-specific Studio integrations on top of this interaction foundation.
