# Archivist Dashboard Editorial Redesign Implementation Plan

Date: 2026-03-18

## Goal

Implement the approved Archivist dashboard redesign as a shared mobile-first shell and visual system, then refit the major dashboard pages onto that system without rewriting the underlying feature logic.

## Phase 1: Shared Shell And Tokens

### Objectives

- Create one consistent dashboard shell contract.
- Reduce background noise and visual clutter.
- Improve mobile readability and spacing.

### Tasks

- Update dashboard-level CSS tokens in `client/src/index.css`
  - reduce decorative background effects
  - simplify card/background treatments
  - improve body text sizing and contrast
  - tighten the type scale for mobile
- Refactor `client/src/components/layout/dashboard-layout.tsx`
  - simplify the mobile app bar
  - reduce duplicate top chrome
  - keep search and account controls predictable
- Refactor `client/src/components/layout/app-sidebar.tsx`
  - simplify section presentation
  - reduce stacked footers and decorative noise
  - keep logout and site editor access obvious
- Refactor `client/src/components/layout/archivist-surfaces.tsx`
  - establish cleaner shared panel, header, row, and meta primitives

### Verification

- No overlapping shell chrome at mobile widths
- Sidebar remains usable on mobile and desktop
- Search, logout, and navigation still work

## Phase 2: Overview, Settings, Creative

### Objectives

- Move the simpler dashboard pages onto the new shared system first.
- Establish the new page rhythm before refitting the heaviest tools.

### Tasks

- Refactor `client/src/pages/dashboard/index.tsx`
  - convert to one lead workspace card plus compact server list
- Refactor `client/src/pages/dashboard/settings.tsx`
  - condense runtime and server reference content
- Refactor `client/src/pages/dashboard/creative.tsx`
  - lighten the module list and recent activity presentation

### Verification

- All three pages are easier to scan on mobile
- Actions do not wrap into cluttered meta clusters

## Phase 3: Custom Commands Mobile Cleanup

### Objectives

- Make Custom Commands feel like a guided mobile workflow.
- Remove action duplication and reduce editor sprawl.

### Tasks

- Refactor `client/src/components/server-shell/custom-command-v2/custom-command-v2-workspace.tsx`
  - strengthen `Library -> Editor -> Test`
  - simplify page intro and meta load
  - unify save/test/delete action placement
  - reduce vertical bloat in field groups and cards

### Verification

- The primary action is obvious in each mode
- Preview/test is reachable and understandable on mobile

## Phase 4: Studio Shell Cleanup

### Objectives

- Keep the existing Studio behavior but reduce surrounding chrome and duplicate framing.

### Tasks

- Refactor `client/src/pages/dashboard/studio.tsx`
  - simplify the page intro and support cards
- Refine Studio launch framing and any shared surrounding wrappers used by `DesignStudioTab`

### Verification

- Studio opens inside the calmer shell cleanly
- Mobile top and bottom controls do not fight each other

## Phase 5: Site Editor Cleanup

### Objectives

- Bring Site Editor into the same shell grammar as the rest of Archivist.
- Remove duplicated action emphasis.

### Tasks

- Refactor `client/src/components/site-editor/site-editor-workspace.tsx`
  - simplify intro and stats
  - make `Sections -> Preview -> Publish` feel lighter and more consistent
  - unify save/reset/publish actions into one predictable action region

### Verification

- Editing sections, previewing, and publishing remain clear on mobile

## Phase 6: Cross-Dashboard Polish

### Objectives

- Ensure the redesign feels consistent across the full dashboard.

### Tasks

- Align spacing, headings, and meta language across all touched pages
- Remove leftover visual noise or inconsistent controls
- Check owner-only items like Site Editor placement

### Verification

- Cross-page UI feels consistent
- No page stands out as using the old shell language

## Phase 7: Local Verification And Deployment

### Tasks

- Run:
  - `npm.cmd run check`
  - `npm.cmd run build`
  - `npm.cmd run verify:build-output`
- Do a local viewport smoke pass where practical
- Deploy to `root@137.184.29.158`
- Restart `pm2` process `archivist`
- Verify:
  - local `/health`
  - public `/health`
  - authenticated owner dashboard shell

## Risks

- Shared shell changes can unintentionally affect multiple pages at once.
- Existing long-form editors may still need secondary cleanup after the first layout pass.
- The current workspace page is especially large and may need follow-up extraction if it resists the shared system cleanly.

## Fallback Strategy

- Keep functionality unchanged while iterating on shell/layout.
- Avoid rewriting backend logic during the redesign pass.
- If one page becomes unstable, preserve the new shell and temporarily keep that page’s internal content structure until the next pass.
