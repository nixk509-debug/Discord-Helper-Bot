# Server Dashboard Shell Redesign Design

Date: 2026-03-11

## Summary

Redesign the server-level dashboard experience so Archivist feels like a premium Discord control center instead of a generic settings shell. This pass covers the server shell, overview experience, navigation, Design Studio entry area, shared UI primitives, and mobile-first layout behavior. It does not fully restyle individual module internals yet.

## Goals

- Make `/dashboard/servers/:id` feel dark, sharp, premium, and unmistakably Archivist
- Replace stacked settings-page energy with a command-center shell
- Strengthen visual hierarchy so the most important actions and states are obvious
- Make the server overview feel genuinely useful as a home base
- Treat Design Studio as the dominant premium feature
- Improve mobile usability with touch-first patterns rather than shrinking desktop layouts
- Establish a reusable shell and component system that later module redesigns can inherit

## Non-Goals

- Full internal restyles for Welcome, Verify, Tickets, Commands, Scheduled Messages, or other module forms
- Backend or schema changes
- Routing overhauls beyond what is needed to improve the shell
- Fake analytics or decorative data that does not reflect real server state

## Approved Direction

Use a command-center shell that extends the best parts of the current Design Studio visual language across the entire server dashboard. The shell should feel product-grade and premium on desktop, but still be designed from mobile up.

This direction keeps the existing single-page server workspace structure, which avoids an unnecessary routing rewrite in pass one, while still allowing a major upgrade in visual identity, hierarchy, responsiveness, and consistency.

## Product Structure

### Server Hero

The top of the server dashboard becomes a premium control header rather than a plain info row.

It includes:

- Server icon and server name
- Member count and core identity metadata
- Live state indicators for server connection and bot availability
- A compact strip of high-value server stats
- A priority-based action cluster for `Open Studio`, `Preview Messages`, `Publish`, and `Manage Modules`

The hero must remain intentionally scoped. It should never try to expose every possible action or metric. The goal is to orient the user and surface the next best actions quickly.

`Publish` should be state-aware. It only becomes a strong primary emphasis when the dashboard has a meaningful draft or publish-ready change. Otherwise it should appear as a quieter secondary action.

### Navigation

Navigation should become more product-first and easier to scan.

Primary visible structure:

- Overview
- Studio
- Welcome
- Verify
- Tickets
- Commands
- Scheduled
- Automations
- Media
- Settings

Existing modules that do not map perfectly to this cleaner product language can still remain accessible in secondary groups. The key change is that the top-level information architecture should present Archivist as a curated product, not as a raw list of technical features.

Desktop navigation stays in a left rail, but gets:

- tighter grouping
- stronger active states
- clearer status chips or dots
- more deliberate icon spacing
- less dead vertical emptiness

Mobile navigation becomes touch-first:

- a compact horizontal destination rail for high-priority sections
- a `Modules` trigger that opens the full grouped navigation in a sheet
- support for sticky page actions where it helps

### Overview

The current `general` module becomes the new overview home base.

The overview should include:

- server health and readiness cards
- quick module status surfaces
- a dominant Design Studio panel
- recent drafts or recent message work where data exists
- quick actions into the most valuable modules
- meaningful alerts or warnings
- shortcuts into the top server workflows

This page should be useful immediately. It should not feel decorative, empty, or like a dumping ground for settings forms.

## Visual System

The full shell should align to a darker Archivist identity:

- black and graphite foundation
- deep crimson accent
- restrained red glow
- high contrast text and controls
- stronger panel edges and separators
- sharper, more intentional radii
- less generic glass and more solid premium surfaces

The design should feel clean and dangerous rather than noisy, gamer-themed, or overly theatrical.

### Surface Rules

- Hero, overview sections, and major module frames use layered obsidian panels with subtle edge light
- Dividers are sleek and intentional, with thin contrast lines and occasional red-accent scan treatments
- Glow should be reserved for primary focus, active state, warnings, and premium actions
- Surface hierarchy should be obvious at a glance

### Copy Rules

Labels should be simple, direct, and user-facing.

Examples:

- `General` becomes `Overview`
- `Warnings & Punishments` can stay internally but should not dominate top-level product language
- technical phrases should be avoided when a cleaner product label exists

## Shared Component System

This pass should establish reusable shell components and base styling that future module redesigns can build on.

### Shared Shell Components

- `Server hero surface`
- `Server action bar`
- `Module rail`
- `Status card`
- `Control card`
- `Module snapshot card`
- `Archivist chip / badge`

### Shared Primitive Upgrades

The button, card, input, textarea, select, and badge system should be upgraded to feel custom and premium rather than default.

The new primitives should provide:

- darker fills
- stronger edge treatment
- cleaner focus and active states
- touch-friendly sizing
- consistent radii
- premium hover and pressed behavior

### Action Bar

The action bar should be reusable across overview and future modules.

Potential actions include:

- Save
- Preview
- Publish
- Test
- Open Studio
- Reset
- Help

It should support contextual priority so not every action competes equally for attention.

## Overview Content Model

### Hero Stats

The hero stat strip should stay intentionally limited and use real data that already exists where possible.

Priority examples:

- Member count
- Bot live state
- Active modules count
- Studio or publish signal

### Module Snapshot Cards

Module snapshot cards must show real status instead of acting like empty entry tiles.

Each card should include:

- module name
- current state
- one or two real indicators or metrics
- a clear next action
- whether attention is needed

If real status data is unavailable, the card should say so plainly with labels like `Not configured`, `No activity yet`, or `Awaiting setup`.

### Alerts

Alerts should be meaningful and actionable. They should appear only when there is a real condition such as:

- bot offline
- missing configuration on an enabled feature
- disconnected sync state
- no publishable draft
- incomplete setup for a promoted module

Healthy states should still look polished, but quiet.

## Mobile Behavior

This pass is explicitly mobile-first.

### Mobile Shell Rules

- Hero stacks into distinct blocks with one prominent CTA
- Secondary actions become compact chips or a smaller action row
- Top navigation becomes a horizontal rail
- Full module navigation opens in a sheet
- Sticky actions appear only where they improve flow
- Cards collapse to one column with stronger section separation
- Nested-card clutter should be reduced

Desktop should feel more powerful, but it should be built from the same system rather than requiring a separate layout philosophy.

## Architecture

Implement this redesign on top of the existing server page structure rather than rebuilding the dashboard architecture from scratch.

### Primary Files

- `client/src/index.css`
- `client/src/components/ui/button.tsx`
- `client/src/components/ui/card.tsx`
- `client/src/components/ui/input.tsx`
- `client/src/components/ui/textarea.tsx`
- `client/src/components/ui/select.tsx`
- `client/src/components/ui/badge.tsx`
- `client/src/components/layout/server-settings-layout.tsx`
- `client/src/pages/dashboard/server.tsx`
- `client/src/components/design-studio/design-studio-home.tsx`
- `client/src/components/design-studio/design-studio-launch-card.tsx`

### Implementation Shape

1. Strengthen tokens and shell utility classes in `index.css`
2. Upgrade shared UI primitives so the redesign propagates naturally
3. Refactor the server settings layout into the new shell and navigation behavior
4. Replace the current plain server header with the new hero surface
5. Convert `general` into the new `overview` page structure
6. Elevate Design Studio inside the overview as the dominant feature panel
7. Wrap existing module content with stronger shell surfaces without fully restyling internal module forms
8. Polish mobile spacing, action behavior, and responsive transitions

## Data and Fallback Strategy

The overview and hero should use real server data already available through the current hooks and server payloads.

Where data is missing:

- do not fabricate activity
- do not show misleading healthy states
- prefer clear fallback labels and next actions

The shell should degrade gracefully across:

- fully configured servers
- partially configured servers
- newly connected servers with minimal setup
- offline or degraded bot states

## Verification

Pass one is complete when:

- the server page shell feels materially more premium and intentional
- the hero, nav, overview, and Design Studio entry area reflect one coherent Archivist product language
- mobile layouts feel purpose-built
- module switching and active states remain functional
- overview cards render correctly with full and partial data
- alerts and publish emphasis behave contextually
- existing module internals continue to work inside the new shell

## Pass-One Boundaries

This redesign intentionally stops short of full module-internal restyles. The next phase should upgrade modules individually on top of this stronger shell, starting with Welcome.
