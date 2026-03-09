# Design Studio Mobile Home Design

Date: 2026-03-09

## Summary

Redesign the mobile Design Studio entry experience so it feels like a premium Archivist app screen instead of a generic dashboard. The landing screen should present three primary build types, recent drafts, and a floating entry point while keeping templates secondary. The creation flow should route through a bottom sheet instead of opening drafts immediately. The in-app preview should also render embed and media images so URLs are visible before publish.

## Goals

- Make the no-draft mobile state feel like a realistic high-end phone UI
- Keep desktop separate and avoid forcing the mobile composition onto the desktop layout
- Promote three primary build types: Plain Message, Embed, and Components v2
- Keep recent drafts immediately accessible from the landing screen
- Move templates out of the main landing screen
- Preserve the existing document model and publish flow where possible
- Improve preview fidelity for embed images and media URLs

## Non-Goals

- Redesign the full desktop Studio experience in this pass
- Introduce a new backend model or migration for Studio draft type classification
- Change Discord payload generation or publish behavior

## Approved User Flow

1. User opens Design Studio.
2. The mobile landing screen shows:
   - Plain Message
   - Embed
   - Components v2
   - Recent Drafts
   - Floating plus button
3. Tapping Plain Message, Embed, or Components v2 opens a bottom sheet.
4. The bottom sheet preselects the tapped type and shows:
   - Create new
   - Open existing
5. Create new opens a new builder for the selected type.
6. Open existing shows existing drafts filtered to the selected type, then opens the selected draft.
7. Recent Drafts remain visible on the landing screen and open directly when tapped.
8. Tapping the floating plus button opens the same bottom sheet with no preselected type.
9. Templates are not shown on the main landing screen.
10. Templates live behind the plus flow or another secondary template entry.
11. Welcome, Ticket, Verification, Rules, and similar entries are treated as templates rather than primary build types.

## Visual Direction

The mobile landing should feel like an Archivist-native control surface:

- Near-black and charcoal layered backgrounds
- Subtle crimson accent lighting and edge glow
- Strong rounded corners and modern mobile spacing
- Archivist branding worked into the header using the red book avatar as a compact branded mark
- Minimal clutter, no template cards on the main screen, and no desktop-style grid layout

## Architecture

Keep the redesign inside the existing `DesignStudioTab` instead of creating a separate mobile route. Replace the current mobile `!draft` landing branch with a dedicated mobile home state and add chooser state on top of the existing document loading flow.

### New UI State

- `chooserOpen`
- `selectedPrimaryType`
- `chooserStep`

### Primary Types

- `message`
- `embed`
- `components`

### Chooser Steps

- `type`
- `action`
- `existing`
- `templates`

## Draft Creation Strategy

Avoid backend changes by creating lightweight Studio starters:

- Plain Message: blank Studio document with message/body focus and no starter embed
- Embed: blank Studio document seeded with one embed and focus on embeds
- Components v2: blank Studio document seeded with a section or action-row starter and focus on components

## Existing Draft Filtering

Do not add a migration for type metadata in this pass. Infer type from document shape:

- Drafts with embeds as the dominant content classify as Embed
- Drafts with interactive nodes classify as Components v2
- All other regular drafts classify as Plain Message
- Welcome, Ticket, Verification, Rules, and similar module-bound presets are treated as templates and excluded from the primary draft lists

## Error Handling

- Show skeleton content while drafts are loading
- If no drafts match a selected type, keep Create new available and show an empty-state message
- If draft creation fails, keep the chooser open and surface the existing toast feedback
- If preview assets fail to load, keep layout intact and fail visually without crashing

## Preview Fidelity Improvements

Upgrade `StudioPreview` so it renders:

- Embed thumbnails
- Embed images
- Footer and author metadata when present
- Media gallery items as image tiles rather than raw URLs

This closes the gap where an asset URL appears correctly in Discord but remains invisible inside the in-app preview.

## Verification

- Verify the mobile landing screen shows the three build cards, recent drafts, and floating plus button
- Verify tapping a build card opens the chooser with that type preselected
- Verify tapping the floating plus button starts at type selection
- Verify Create new opens the correct starter for each type
- Verify Open existing filters drafts by inferred type
- Verify recent drafts still open directly
- Verify templates are absent from the main landing screen
- Verify embed images and thumbnails render in preview when valid URLs are provided
