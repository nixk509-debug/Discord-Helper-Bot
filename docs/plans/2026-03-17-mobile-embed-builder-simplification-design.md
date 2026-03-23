# Mobile Embed Builder Simplification Design

## Goal

Make the mobile embed builder feel like one smooth message editor again. The current Studio mobile flow splits embed editing across too many states (`Canvas`, `Edit`, `Parts`, inline-canvas mode, detail screen preview), which makes the builder feel indirect and glitch-prone on phones.

The new direction is mobile-first and form-first:

- only `Edit`, `Assets`, and `Publish` matter on mobile
- the Discord-style message stays visible as live output, not as a separate editing mode
- embed editing happens in a mobile form composer modeled after the old embed builder and MEE6-style workflows

## Product Decisions

### Mobile Navigation

- Mobile bottom navigation should expose only:
  - `Edit`
  - `Assets`
  - `Publish`
- The existing `Issues` surface is removed from the mobile primary navigation.
- Diagnostics still exist, but they are surfaced inside `Publish` so mobile users do not have to understand a fourth workspace.

### Edit Screen

- `Edit` is the default mobile working screen.
- A compact live Discord-style output sits near the top and updates while the user types.
- Editing happens in a scrollable form under the output.
- The form uses collapsible sections instead of a giant flat screen.

Recommended embed sections:

- `Content`
- `Author`
- `Media`
- `Fields`
- `Footer`
- `Advanced`
- `Danger zone`

Recommended message sections:

- `Identity`
- `Body`

### Selection Model

- Mobile embed editing should not rely on the live canvas being the primary editor.
- Instead, mobile shows clear edit targets:
  - `Message`
  - `Embed 1`
  - `Embed 2`
  - etc.
- Choosing a target swaps the form below while the live output keeps updating.
- Tapping the live message can remain a convenience later, but it is not required for the core flow.

### Assets

- `Assets` stays as a dedicated tab.
- The improved asset search, preview cards, and quick-apply actions remain.
- Asset application should feel contextual to the current mobile target:
  - image
  - thumbnail
  - author icon
  - footer icon

### Publish

- `Publish` keeps channel selection, downgrade confirmation, and send/update actions.
- Diagnostics are shown inside `Publish` on mobile, above or alongside the publish controls.

## Implementation Notes

- Reuse `BuildSelectionEditor` for the mobile form structure instead of rebuilding a second editor system.
- Expand the mobile embed editor to cover the full embed surface, including author, fields, footer, and advanced JSON access.
- Keep the richer desktop Studio flow for now unless a later pass intentionally simplifies it too.
- Scope the behavioral simplification to mobile first so the edit path improves without destabilizing desktop Studio.

## Verification

- Edit title, description, author, fields, footer, image, and thumbnail on mobile.
- Add, remove, and reorder fields.
- Upload or apply assets into embed media/icon slots.
- Confirm the keyboard never covers the active controls.
- Confirm save, reopen, and publish still work.
- Confirm the builder no longer depends on `Canvas` / `Parts` / inline-canvas mode for normal embed editing.
