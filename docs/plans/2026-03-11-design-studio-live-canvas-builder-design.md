# Design Studio Live Canvas Builder Design

Date: 2026-03-11

## Summary

Rebuild Design Studio around direct live message editing instead of a generic block/composer workflow.

Studio Home should become simpler:
- New Design
- Continue Design / Saved

Selecting `New Design` should immediately branch into:
- Embed Message
- Interactive Message
- Plain Message

If Studio opens from a module like Welcome, Verify, or Tickets, the relevant starter can be preselected, but the mental model remains the same.

The main builder should feel like editing the Discord message itself:
- see message
- tap visible part
- edit that part
- watch it update live

The shared publish planner remains the source of truth for exact, downgraded, and blocked publish states, but diagnostics move out of the main build experience into lighter `Issues` and `Publish` surfaces.

## Goals

- Make Studio Home faster and more message-oriented.
- Rebuild the builder around a live Discord-style message canvas.
- Make embeds directly editable from visible regions.
- Make buttons and selects directly editable from the visible message.
- Integrate emoji, media, and color tools into region editing.
- Reduce validation/publish clutter during normal building.
- Preserve the planner truth model and current Studio document compatibility.

## Home Flow

Studio Home becomes two primary actions:
- `New Design`
- `Continue Design / Saved`

`New Design` opens a second step with:
- `Embed Message`
- `Interactive Message`
- `Plain Message`

`Community Shared` is demoted from a primary home action in this pass. It can remain available as a secondary browse/import surface later, but not in the first decision row.

The same home should be used by the direct Studio route and the launch card so Studio feels consistent no matter where the user enters.

## Builder Shell

The builder becomes message-first.

### Top bar
- back
- draft name
- save state
- lightweight issues pill
- publish

### Main body
- live Discord-style message canvas
- tappable editable regions
- add-part action

### Bottom actions
- Build
- Assets
- Issues
- Publish

Advanced raw editing should use the user-facing label `Code`, not `JSON`.

## Direct Editing Model

The message itself becomes the editor surface.

Examples:
- tap message body -> edit message body
- tap embed title -> edit title
- tap embed description -> edit description
- tap field -> edit that field
- tap image slot -> open media picker
- tap footer -> edit footer
- tap button -> edit button sheet
- tap dropdown -> edit select sheet

Region editing should use compact bottom sheets or focused editor trays rather than nested modal-on-modal flows.

Desktop may still show more supporting space, but the center of the experience remains the live message canvas.

## Add Flow

Add actions should be message-part oriented instead of abstract block oriented.

### Embed Message
- Add field
- Add image
- Add thumbnail
- Add footer
- Add author
- Add another embed

### Interactive Message
- Add button row
- Add dropdown
- Add image
- Add gallery
- Add section
- Add notice panel

## Editing Tools

### Emoji picker
- server custom emojis
- animated emojis
- recents
- favorites
- search
- correct target insertion for text, embed fields, button emoji, and select option emoji

### Media picker
- Upload
- Library / saved images
- URL paste

This should be used for:
- embed image
- embed thumbnail
- author icon
- footer icon
- gallery images
- other similar media fields

### Color picker
- visual color input
- hex input
- recent colors / saved swatches

These tools must feel native to the direct-edit flow, not bolted on as extra technical forms.

## Diagnostics And Planner

Keep the shared planner architecture for:
- exact
- downgraded
- blocked
- Studio view vs live publish view

Reduce its visual weight during normal building.

The main build surface should show only light status:
- no issues
- warning
- blocked

Deeper details move into:
- Issues
- Publish
- live publish comparison
- Code

The builder should not feel like a validation dashboard while editing.

## Naming

- `Composer` -> `Editor`
- `Validation Hints` -> `Issues`
- `JSON` -> `Code`
- avoid system-heavy labels like `Component Workspace`
- prefer `Message Canvas`, `Message Builder`, `Editor`, and `Actions`

## Implementation Scope

This pass should:
- redesign Studio Home to focus on `New Design` and `Continue Design / Saved`
- rebuild the main Studio builder around a live editable message canvas
- make embed regions directly editable
- make button/select regions directly editable
- integrate emoji, media, and color tools into those region editors
- keep existing Studio documents and planner compatibility

This pass should not attempt:
- a full drag-and-drop canvas rewrite
- a total rewrite of the underlying Studio document model
- migration of every legacy non-Studio editor outside Studio
- public community-sharing infrastructure

## Risks

- Leaving the old inspector as the primary editing surface would undermine the redesign.
- Fake upload flows that only work in preview would erode trust.
- Letting diagnostics dominate the build screen would keep Studio feeling like a dev tool.
- Overpreserving the current block-oriented navigation would create another halfway state instead of the intended rebuild.

## Recommendation

Implement a live-canvas shell on top of the current Studio model.

The builder should continue using the existing document and planner systems internally, but the user should mostly experience:
- a simplified home
- a live Discord-style message canvas
- tap-to-edit message regions
- focused editing sheets
- clean publish/issues surfaces when needed
