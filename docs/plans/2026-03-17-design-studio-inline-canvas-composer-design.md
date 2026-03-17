# Design Studio Inline Canvas Composer Design

Date: 2026-03-17

## Summary

This pass turns the current Design Studio builder into a real inline Discord-style composer.

The preview should stop feeling like a mostly read-only mockup with form controls attached nearby. The message itself becomes the editing surface. Users should be able to tap the exact part of the message they want to change, edit directly in place, insert emoji or formatting at the caret, and pull assets into the active region without leaving the canvas.

This pass also upgrades the Assets tab from a flat storage list into a quick-use media tray, and adds a contextual insert system for emoji, dividers, borders, ASCII, symbols, formats, and snippets.

## Goals

- Make the live message preview the primary editing surface
- Allow exact-region inline editing for message and embed content
- Add a contextual emoji board with both Unicode and server custom emoji
- Add a contextual insert tray for dividers, borders, ASCII, formats, snippets, and assets
- Make the preview feel more visually faithful to Discord
- Make Assets faster to upload, preview, search, and insert
- Keep mobile editing stable and reduce jumpy or glitchy transitions

## Non-Goals

- Full rewrite of Studio document architecture
- Building a second parallel embed editor
- Adding every possible rich-text behavior Discord itself does not support
- Replacing the current publish pipeline
- Turning every metadata field into an always-visible inline control

## Approved Direction

Use a `canvas-first inline composer`.

The live canvas becomes the dominant editing surface. The user edits the message where it appears, not in a detached side form. Supporting controls still exist, but they should only appear when relevant and should stay out of the way when they are not needed.

The key product constraint for this pass is:

- tools should be available across message and embed editing
- tools should not appear in a noisy or annoying way

That means helpers must be contextual, lightweight, and tied to the active region instead of being permanently visible.

## Interaction Model

The preview is no longer just a preview. It becomes the main message editor.

### Behavior

- tapping the message body edits the message body directly in place
- tapping embed `author`, `title`, `description`, `field`, `footer`, `image`, or `thumbnail` edits that exact region in place
- the active region receives focus immediately
- only one region is actively editable at a time
- changing regions should preserve edits instantly
- advanced fields that do not belong naturally on the message surface should appear only as contextual supporting controls for the active region

### Supporting Controls

The side panel remains useful for advanced or structural configuration, but it is no longer the default path for common editing.

Examples of fields that can stay secondary:

- author link URL
- author icon URL
- footer icon URL
- image URL
- thumbnail URL
- structural toggles such as inline field mode

## Exact-Region Selection

The current selection model is too coarse for true inline editing. It needs to move from broad object selection to exact canvas targets.

### Target Examples

- `message.body`
- `embed[0].author`
- `embed[0].title`
- `embed[0].description`
- `embed[0].field[2].name`
- `embed[0].field[2].value`
- `embed[0].footer`
- `embed[0].image`
- `embed[0].thumbnail`

### Region Rules

- the active region should swap into a borderless inline editor inside the same layout box
- the surrounding message should not remount or jump when switching regions
- field-level controls such as `move`, `remove`, and `inline` should appear near the active field only
- image and thumbnail regions should keep their current placement and reveal compact inline source controls only when active
- blank embed spacer fields should remain available as a first-class quick insert

## Emoji Board

The composer needs a real emoji board instead of relying only on raw token typing.

### Emoji Sources

- Unicode emoji
- current server custom emoji from Discord context
- recent emoji
- search results

### Behavior

- the board opens next to the active inline editor or from an insert trigger
- selection inserts at the current caret position
- custom emoji insert as real Discord tokens such as `<:name:id>` or `<a:name:id>`
- both Unicode and custom emoji should be remembered in recents
- rendered text should continue using the existing Discord token parsing pipeline

### Scope

Emoji insertion should work anywhere text is being edited:

- message body
- embed author
- embed title
- embed description
- embed field names
- embed field values
- embed footer
- text blocks and other text-based Studio nodes

## Insert and Format Tray

The emoji board should live inside a broader contextual insert system.

### Insert Categories

- `Emoji`
- `Dividers`
- `Borders`
- `ASCII / Symbols`
- `Formats`
- `Snippets`
- `Assets`

### Divider and ASCII Support

The builder should support quick insertion of:

- line dividers
- symbol dividers
- emoji dividers
- stacked dividers
- boxed text
- framed text
- ASCII separators
- arrows
- status symbols
- decorative symbol combinations

### Format Support

Formatting helpers should work across the composer wherever text is editable:

- bold
- italic
- underline
- strikethrough
- spoiler
- quote
- inline code
- code block

When text is selected, formatting should wrap the current selection. When nothing is selected, the helper should insert the proper token pair and place the caret inside.

### Snippets and Library Fit

This system should reuse Studio library concepts already present in the schema rather than inventing a separate preset store.

Relevant existing categories:

- `divider`
- `symbol`
- `emoji`
- `format`
- `asset_link`
- `snippet`

The insert tray should be able to surface defaults plus saved snippets without overwhelming the canvas.

### Noise Control

The insert tray must be contextual.

- show it only for active text-capable regions
- keep it collapsed or lightweight until requested
- prioritize the most relevant insert groups for the active region
- avoid permanently visible toolbars across the whole canvas

## Discord Visual Fidelity

The canvas should feel closer to Discord while remaining editable.

### Visual Direction

- tighten message spacing and embed chrome toward real Discord rhythm
- improve text hierarchy for message body, author, title, description, field labels, and footer
- keep selection affordances subtle
- avoid heavy builder borders around inactive regions
- preserve a believable Discord message shell even while editing
- keep custom emoji sizing and inline alignment close to Discord behavior

The goal is not pixel-perfect cloning. The goal is strong visual trust so the builder feels like editing a real Discord message instead of a generic admin form.

## Assets

The current Assets tab stores uploads but does not help the user apply them quickly. It should become a useful media tray.

### Behavior

- support drag-and-drop and standard upload
- show image thumbnails instead of just filenames and URLs
- support search
- support quick filters such as `All`, `Images`, `Files`, `Used in draft`, and `Recent`
- show whether an asset is already used in the current draft
- allow quick actions like:
  - `Use as embed image`
  - `Use as thumbnail`
  - `Use as author icon`
  - `Use as footer icon`
  - `Attach as file`
  - `Copy URL`
  - `Remove from draft`

### Context Awareness

If a region is active, the asset tray should adapt:

- active image region defaults to `Set image`
- active thumbnail region defaults to `Set thumbnail`
- active file block defaults to `Attach file`

If no region is active, asset activation should open a small action sheet instead of doing nothing.

## Mobile Behavior

Mobile stability is part of the design, not a follow-up polish task.

### Rules

- only one region edits at a time
- active region should remain in place while typing
- bottom mobile chrome should stay hidden while the keyboard is active
- canvas should scroll the active region into view
- switching from one region to another should not remount the whole embed
- contextual tools should stay compact and dismissible
- the Assets tray should use larger touch-friendly cards and one-tap insert actions

## Architecture Fit

This pass should extend the current Studio stack instead of replacing it.

### Main Integration Points

- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/components/design-studio-v2/design-studio-v2.tsx`
- `client/src/components/design-studio-v2/studio-v2-utils.ts`
- `client/src/components/symbols/symbol-insert-menu.tsx`
- `shared/discord-emoji.ts`
- `client/src/hooks/use-bot.ts` via `useDiscordContext`

### Implementation Shape

- extend selection from broad message or embed selection to exact region targeting
- keep Design Studio V2 as the main state owner
- make the preview own inline edit rendering
- introduce a lightweight contextual insert tray and emoji board
- reuse existing emoji parsing and Discord context data
- reuse Studio library categories for snippets and saved insertables

## Verification

This pass is complete when:

- the message surface itself is the main editor
- exact message and embed regions edit in place
- Unicode and custom server emoji insert at the caret
- dividers, borders, ASCII, formats, and snippets can be inserted without leaving the canvas
- assets are easy to preview and apply to the active region
- mobile editing no longer jumps or glitches while moving between embed parts
- the message looks materially closer to Discord during editing and preview

## Next Step

The next step is an implementation plan for the inline canvas composer pass. The dedicated `writing-plans` skill is not installed in this workspace, so the implementation plan will be documented manually as the fallback.
