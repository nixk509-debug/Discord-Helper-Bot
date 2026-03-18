# Archivist Site Editor Design

Date: 2026-03-18

## Summary

Build a mobile-first `Site Editor` inside Archivist so the owner can edit the public website and shared dashboard shell without touching code. The first version edits:

- `landing`
- `login`
- `dashboard_shell`

Edits save to draft only until the owner explicitly publishes. The editor is form-based on mobile, not direct tap-to-edit on the live page.

## Goals

- Make website and shell content editable from the dashboard on mobile.
- Keep the editing flow simple enough to use from a phone.
- Support safe draft, preview, publish, and reset flows.
- Avoid raw HTML, code editing, or freeform unsafe rendering.
- Store content in a structured model that can grow later.

## Non-Goals For V1

- No arbitrary block builder
- No raw JSON editing in the main flow
- No add/delete section support
- No page-level code editing
- No editing of every dashboard page yet

## Product Scope

The v1 surface set is:

- `landing`
- `login`
- `dashboard_shell`

The v1 editing capability set is:

- edit text
- edit images
- edit links
- edit color tokens
- show/hide existing sections
- reorder existing sections/cards

The v1 workflow is:

- open surface
- edit draft
- preview draft
- save draft
- publish
- reset draft back to published

## Architecture

Archivist gets a built-in `Site Editor` area that reads and writes structured content documents. Each editable surface has:

- a draft document
- a published document
- known sections
- known fields

Public pages and the shared dashboard shell read published content first. If published content is missing or invalid, the app falls back to code defaults.

This keeps the app safe and resilient while still allowing live editorial control.

## Data Model

Add a new storage model shaped around one row per surface.

Suggested table:

- `site_content_surfaces`
  - `id`
  - `surface_key`
  - `schema_version`
  - `draft_content jsonb`
  - `published_content jsonb`
  - `updated_by_user_id`
  - `published_by_user_id`
  - `created_at`
  - `updated_at`
  - `published_at`

Each content document contains:

- `schemaVersion`
- `surface`
- `sections[]`

Each section contains:

- `schemaVersion`
- `id`
- `type`
- `label`
- `visible`
- `order`
- `fields[]`

Each field contains:

- `key`
- `kind`
- `label`
- `value`

`schemaVersion` exists both at the surface document level and section level so section types can evolve independently later.

## Surface Model

Each supported surface uses a fixed section registry in code.

Examples:

### Landing

- hero
- metrics
- product_rows
- preview_panel
- copy_points
- final_cta

### Login

- hero
- trust_points
- discord_login
- owner_access
- footer_copy

### Dashboard Shell

- workspace_brand
- section_descriptions
- empty_states
- shell_copy

The editor only accepts known section types and known field keys for each surface.

## Editor UX

The `Site Editor` is mobile-first.

Top-level navigation:

- `Landing`
- `Login`
- `Dashboard Shell`

Inside a surface:

- `Draft`
- `Preview`
- `Publish`

Main interaction:

- show stacked section cards
- each card shows section label, visibility toggle, and reorder controls
- tapping a card opens a mobile sheet with the section fields

Field kinds in v1:

- text
- textarea
- image URL
- link URL
- badge text
- button label
- color token
- visibility toggle

The main flow stays form-based rather than inline page editing because it is more reliable on mobile and much easier to validate safely.

## Preview Behavior

Preview reads the draft document, not the published document.

The preview should render the real Archivist page components using the draft content model so the owner sees a faithful result before publishing.

Preview is scoped to:

- landing page preview
- login page preview
- dashboard shell preview

## Publish Behavior

Publishing copies the current validated draft into `published_content`.

Rules:

- no auto-publish
- explicit publish only
- published content must pass validation
- invalid draft content cannot be published

Reset behavior:

- `Reset Draft` restores the draft from the current published snapshot

## Validation And Safety

All site content is schema-driven and validated with Zod.

Safety rules:

- only known surfaces are accepted
- only known section types are accepted
- only known field keys are accepted
- unknown fields are rejected
- no arbitrary HTML
- no scripts
- no executable code
- URL fields stay plain strings and can be sanitized or constrained later

If database content is invalid:

- ignore it
- use code defaults
- keep the app rendering

## Access Control

The `Site Editor` is owner-only.

Allowed actors:

- owner session login
- optionally approved owner Discord IDs

The editor is not visible or accessible to normal users.

## Rendering Strategy

The current public pages and dashboard shell contain hardcoded content. V1 should move those surfaces to a pattern like:

- load published site content
- merge with code defaults
- render through existing components

This avoids a full frontend rewrite while still making the content editable.

## Extensibility

This model is intentionally more structured than a single settings blob so it can expand later into:

- more surfaces
- more section types
- add/delete sections
- global theme controls
- reusable content tokens
- richer preview and publish history

## Recommendation

Ship v1 as a structured, owner-only, mobile-first Site Editor for `landing`, `login`, and `dashboard_shell` with draft, preview, publish, reset, visibility toggles, and reorder support. This is the cleanest path to a useful feature without turning Archivist into an unsafe or messy CMS.
