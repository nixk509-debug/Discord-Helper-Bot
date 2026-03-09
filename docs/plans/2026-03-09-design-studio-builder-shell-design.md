# Design Studio Builder Shell Design

Date: 2026-03-09

## Summary

Upgrade the actual mobile Design Studio builder UI so it feels like a premium creator app rather than a long stacked admin form. Keep the full capability set intact, but reorganize the mobile experience around focused workspaces, faster access to editing sheets, and utility destinations for preview, assets, library, and publish.

## Goals

- Make the mobile builder feel intentional, premium, and app-like
- Preserve all current editing capabilities instead of removing power
- Reduce the overwhelming feel of the current stacked mobile layout
- Keep preview one tap away
- Keep the current data model and publish/runtime flow intact
- Avoid regressing desktop behavior in this pass

## Non-Goals

- Full desktop Studio redesign
- Backend or schema migrations
- Publish payload changes
- Rebuilding Design Studio as a separate editor app

## Approved Direction

The redesign should be mobile-first and inspired by advanced bot builders like BotGhost, but should remain clearly Archivist rather than a clone. The builder should feel like a serious high-end mobile creation tool with a more focused workspace flow.

## Approved Builder Structure

### Primary Workspaces

- Content
- Embeds
- Components
- Actions

### Secondary Utilities

- Preview
- Library
- Assets
- Publish

### Project / View Controls

Project and view controls stay available, but are folded into the `Content` workspace instead of becoming a separate top-level setup tab.

## Interaction Model

On mobile, the builder should move away from one giant stacked screen. Instead:

1. The user lands inside a focused builder shell.
2. They choose a primary workspace.
3. The main screen shows only that workspace.
4. Detailed editing happens inside sheets or drawers.
5. Secondary utilities remain reachable without crowding the main composition.

This preserves all existing functionality while making the builder easier to use on a phone.

## Workspace Breakdown

### Content

The writing and setup home for the selected view. Includes:

- Project name
- Current view name
- Start view selector
- Message body
- Macro chips
- Draft state and character count

This area should feel more editorial and less like an admin configuration form.

### Embeds

The embed manager and embed editing entry point. Includes:

- Embed cards with richer visual summaries
- Add embed
- Reorder, duplicate, and delete actions
- Tap to open the embed editor in a bottom sheet

The embed editing sheet should feel more visual because images, thumbnails, and richer previews matter here.

### Components

The layout and layers workspace. Includes:

- Add component shortcuts
- Cleaner hierarchy / layers list
- Faster selection state
- Tap a node to open inspector editing in a sheet

This is the area where the builder can feel most like a modern bot creation app, but with Archivist’s cleaner, more premium identity.

### Actions

The interaction logic workspace. Includes:

- Actions list
- Modal list
- Add action
- Add modal
- Better separation between visible UI controls and their response logic

## Visual Direction

The builder shell should feel more tool-grade than the landing screen:

- Deeper graphite and black surfaces
- Thin red highlights for focus and selected states
- More structured layout rhythm
- Tighter spacing
- Cleaner chips, badges, and section markers
- Less soft glass and more precise control-surface styling

The goal is to feel inspired by premium builder tools without becoming a literal clone of another product.

## Architecture

Implement this inside the existing `DesignStudioTab` rather than building a separate editor. The safest approach is to keep the current render logic and regroup it into a mobile builder shell.

### Proposed State

- Mobile builder workspace state: `content | embeds | components | actions`
- Existing active area state continues to handle higher-level destinations
- Existing inspector / preview sheet state remains, but should be used more intentionally

### Implementation Strategy

- Reuse the current builder section renderers where possible
- Regroup and restyle them for mobile
- Introduce a focused workspace switcher
- Add a bottom utility bar for preview/library/assets/publish
- Move detailed editing into sheets instead of stacking more cards into the page

## Error Handling

- If a workspace is empty, show a strong empty state with a clear next action
- Keep existing save/create/publish error handling through the current toast system
- If preview or editor assets fail to load, fail visually without crashing the shell

## Verification

- Mobile builder opens into the new workspace shell
- Content, Embeds, Components, and Actions are all reachable
- Preview, Library, Assets, and Publish remain reachable
- Embed editing still works through the inspector/sheet flow
- Component and action editing still works
- Modals remain editable
- Existing drafts still open normally
- Desktop Studio is not regressed in this pass
