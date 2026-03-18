# Archivist Site Editor Implementation Plan

Date: 2026-03-18

## Goal

Implement a mobile-first `Site Editor` for Archivist that edits `landing`, `login`, and `dashboard_shell` using structured draft and published content.

## Phase 1: Domain Model

1. Add a new shared site-content module.
2. Define Zod schemas for:
   - surface document
   - section model
   - field model
   - per-surface allowed section registries
3. Add default content builders for:
   - `landing`
   - `login`
   - `dashboard_shell`
4. Add helpers to:
   - merge stored content with defaults
   - normalize section ordering
   - reject unknown sections and fields

## Phase 2: Database And Storage

1. Add a new table:
   - `site_content_surfaces`
2. Include columns for:
   - `surface_key`
   - `schema_version`
   - `draft_content`
   - `published_content`
   - `updated_by_user_id`
   - `published_by_user_id`
   - timestamps
3. Add storage methods to:
   - get one surface
   - list surfaces
   - initialize defaults when missing
   - save draft
   - publish draft
   - reset draft to published
4. Ensure owner-session actors can update records without foreign-key issues:
   - allow nullable actor IDs for owner-session saves
   - store actor metadata safely when no real DB user exists

## Phase 3: API Layer

1. Add owner-only API routes for:
   - list site editor surfaces
   - fetch one surface
   - save draft
   - publish
   - reset draft
   - preview payload fetch if needed
2. Protect all routes with owner-only auth.
3. Validate every request with Zod.
4. Return normalized content documents in responses.

## Phase 4: Frontend Data Hooks

1. Add client hooks for:
   - `useSiteEditorSurfaces`
   - `useSiteEditorSurface`
   - `useSaveSiteEditorDraft`
   - `usePublishSiteEditorSurface`
   - `useResetSiteEditorDraft`
2. Add optimistic or fast refresh behavior for mobile editing.
3. Keep cache invalidation scoped and predictable.

## Phase 5: Mobile Editor UI

1. Add a new owner-only dashboard route:
   - `Site Editor`
2. Build a mobile-first shell with:
   - surface tabs
   - `Draft`, `Preview`, `Publish`
3. Render section cards with:
   - label
   - visibility toggle
   - reorder controls
   - tap to edit
4. Build a mobile edit sheet for section fields.
5. Keep advanced or low-value controls out of v1.

## Phase 6: Preview UI

1. Build preview components that reuse the real page rendering model.
2. Render draft content for:
   - landing
   - login
   - dashboard shell
3. Keep preview read-only.

## Phase 7: Public Surface Wiring

1. Update `landing.tsx` to read published content with code fallback.
2. Update `login.tsx` to read published content with code fallback.
3. Identify and update the shared dashboard shell components to read published shell content.
4. Preserve current visuals and behavior while swapping in content values.

## Phase 8: Reorder And Visibility

1. Add safe reorder persistence for known sections/cards.
2. Add section visibility toggles.
3. Ensure hidden sections do not render on public pages.
4. Ensure preview matches publish behavior.

## Phase 9: Access Control And Navigation

1. Show `Site Editor` only for owner session or approved owner identities.
2. Keep it out of the normal user navigation.
3. Add a direct mobile-friendly entry point in the owner dashboard shell.

## Phase 10: Verification

1. Validate the shared schemas with unit tests if practical.
2. Smoke test draft save, preview, publish, and reset.
3. Smoke test mobile editing flow.
4. Verify public pages still render when DB content is missing.
5. Verify invalid DB content falls back to defaults.
6. Verify owner session access only.

## First Build Slice

The best first slice is:

1. schema + defaults
2. DB table + storage
3. owner-only API
4. mobile `Site Editor` for `landing` only
5. publish wiring for `landing`

Then expand to:

6. `login`
7. `dashboard_shell`

This keeps the rollout controlled while still delivering visible value quickly.
