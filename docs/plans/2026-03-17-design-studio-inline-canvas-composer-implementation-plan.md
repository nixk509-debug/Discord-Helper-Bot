# Design Studio Inline Canvas Composer Implementation Plan

Date: 2026-03-17

## Context

The approved design for this pass is documented in `docs/plans/2026-03-17-design-studio-inline-canvas-composer-design.md`.

This implementation plan upgrades Design Studio into a canvas-first inline composer with exact-region editing, a contextual emoji and insert system, stronger Discord visual fidelity, and a more useful Assets tray.

Because the `writing-plans` skill is not installed in this workspace, this file is the explicit fallback handoff for the approved design.

## Scope

This pass includes:

- exact-region inline editing on the live canvas
- Unicode plus server custom emoji insertion
- contextual insert tray for dividers, borders, ASCII, symbols, formats, snippets, and assets
- more useful asset upload and quick-apply flows
- Discord-fidelity preview polish
- mobile stability for inline editing

This pass does not include:

- replacing the Studio publish pipeline
- rebuilding Studio document storage
- adding unsupported Discord formatting behavior
- a full WYSIWYG rich text system based on unrestricted contenteditable

## Delivery Strategy

Upgrade the current inline editing foundation instead of replacing it.

The preview already supports partial embed inline editing and Discord emoji rendering. The plan is to formalize exact-region targeting, stabilize the inline edit flow, and then layer contextual insertion and asset flows on top.

## Phase 1: Exact Region Selection Model

Target files:

- `client/src/components/design-studio-v2/studio-v2-utils.ts`
- `client/src/components/design-studio-v2/design-studio-v2.tsx`
- `client/src/components/design-studio/studio-preview.tsx`

Tasks:

- replace the coarse `message | embed | node` editing assumption with exact canvas targets
- add target shapes for message body, embed author, title, description, field name, field value, footer, image, and thumbnail
- keep node selection compatible for existing V2 component blocks
- update diagnostic jumping and selection labels to resolve to exact targets where possible

Success criteria:

- the editor can identify and persist the exact active region
- changing regions does not require broad embed-level edit mode toggles

## Phase 2: Inline Canvas Editing Stabilization

Target files:

- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/components/design-studio-v2/design-studio-v2.tsx`

Tasks:

- make the active region render its inline editor in place
- ensure only one region is editable at a time
- prevent embed card remounts or selection loss while typing
- reveal region-specific controls only near the active region
- preserve current image, thumbnail, and footer placement while exposing compact inline controls when active
- keep the side selection panel as a fallback for advanced fields only

Success criteria:

- editing happens directly on the message surface
- switching between author, title, description, fields, and footer feels stable

## Phase 3: Emoji Board

Target files:

- new lightweight emoji board component under `client/src/components/design-studio/`
- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/hooks/use-bot.ts`
- `shared/discord-emoji.ts`

Tasks:

- build a contextual emoji board UI
- source server custom emoji from `useDiscordContext`
- support Unicode emoji, custom emoji, search, and recents
- insert emoji at the active caret position for inline inputs and textareas
- store recent emoji locally

Success criteria:

- emoji insertion works in all active text-capable canvas regions
- custom emoji render through the existing Discord token pipeline

## Phase 4: Insert and Format Tray

Target files:

- new contextual insert tray component under `client/src/components/design-studio/`
- `client/src/components/symbols/symbol-insert-menu.tsx`
- `client/src/components/design-studio/studio-preview.tsx`
- any small supporting helpers introduced during the pass

Tasks:

- replace or absorb the current symbol utility into a broader insert tray
- add divider, border, ASCII, symbol, format, and snippet groups
- support wrap-selection formatting for supported inline editors
- support caret insertion when no text is selected
- keep the tray contextual and low-noise
- surface saved insertables using existing Studio library categories where practical

Success criteria:

- insert helpers work across message and embed text editing
- the tray feels useful without becoming constant chrome

## Phase 5: Assets Tray Upgrade

Target files:

- `client/src/components/design-studio-v2/design-studio-v2.tsx`
- any extracted asset card or tray helpers introduced during the pass

Tasks:

- redesign the Assets tab into a visual media tray
- show image thumbnails and cleaner file cards
- add search and lightweight filters
- add context-aware quick actions based on the active region
- show used-in-draft signals
- support drag-and-drop uploads in addition to the hidden file input flow
- add copy URL and remove-from-draft actions

Success criteria:

- Assets helps users apply uploads quickly instead of only storing them
- active image and file targets can be filled from the asset tray in one or two taps

## Phase 6: Discord Visual Fidelity Pass

Target files:

- `client/src/components/design-studio/studio-preview.tsx`
- any small style helpers extracted during the pass

Tasks:

- tighten message shell spacing, hierarchy, and embed chrome
- reduce overly builder-like borders on inactive regions
- improve inline editor appearance so text still feels like message content
- tune emoji sizing and alignment
- improve field and footer spacing on desktop and mobile

Success criteria:

- the canvas looks materially closer to Discord
- editing still feels stable and readable

## Phase 7: Mobile Stability and Verification

Target files:

- `client/src/components/design-studio-v2/design-studio-v2.tsx`
- `client/src/components/design-studio/studio-preview.tsx`
- any new components introduced in this pass

Tasks:

- make the active region scroll into view on mobile
- keep bottom chrome hidden while keyboard editing is active
- verify one-region-at-a-time editing does not glitch or disappear
- test message body, author, title, description, fields, footer, image, and thumbnail editing
- run:
  - `npm.cmd run check`
  - `npm.cmd run build`
  - `npm.cmd run verify:build-output`

Success criteria:

- mobile editing is stable through repeated region switching
- validation commands complete successfully

## Risk Notes

- the current inline editing foundation is valuable, so this pass should extend it rather than replace it
- rich formatting helpers must stay Discord-safe and should not imply unsupported WYSIWYG behavior
- asset quick actions should stay contextual to avoid noisy UI
- exact-region targeting must preserve current node-based Studio flows instead of breaking V2 component editing

## Recommended Execution Order

1. exact region selection model
2. inline canvas editing stabilization
3. emoji board
4. insert and format tray
5. assets tray upgrade
6. Discord visual fidelity pass
7. mobile verification and validation

## Handoff

This plan is the fallback replacement for the missing `writing-plans` skill in the current workspace. It is the working implementation checklist for the Design Studio inline canvas composer pass.
