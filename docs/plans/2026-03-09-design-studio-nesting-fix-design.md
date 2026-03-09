# Design Studio Nesting Fix

Date: 2026-03-09

## Goal

Make `Components v2` behave like a real nested builder so users can place blocks inside containers, sections, and action rows without guessing.

## Approved Behavior

- `Container` and `Section` are true parent blocks.
- `Action Row` remains the parent for buttons and menu/select controls.
- Tree rows show `Add Inside` for parent-capable nodes.
- The add drawer can open in two modes:
  - root add for the current view
  - scoped add for a selected parent node
- Scoped add only shows valid node types for that parent.
- `Container` and `Section` can contain:
  - `Container`
  - `Section`
  - `Text`
  - `Divider`
  - `Style Block`
  - `Media Gallery`
  - `File`
  - `Action Row`
- `Action Row` can contain:
  - `Button`
  - `String Menu`
  - `Role Menu`
  - `User Menu`
  - `Channel Menu`
  - `Mentionable Menu`

## Implementation Notes

- Reuse the existing node tree and add flow instead of changing the document model.
- Add a parent-target state for the quick add drawer.
- Keep recursive preview/runtime behavior unchanged.
- Preserve root-level add behavior while making nested insertion explicit and discoverable.
