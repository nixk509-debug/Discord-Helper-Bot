Date: 2026-04-05

# Archivist Plus Phase 0 Architecture Audit

## Summary

Archivist is not starting from zero.

The codebase already contains a meaningful platform core:

- a real Design Studio document and publication model
- a typed Custom Commands v2 workflow definition and executor
- broad database coverage across commands, studio, variables, automations, webhooks, economy, and server operations
- early audit, snapshot, and runtime-event concepts

The main Phase 0 problem is not lack of ambition. It is architectural sprawl.

Archivist currently behaves like one very large application with several newer platform-grade subsystems embedded inside it. The next move should be consolidation and contract-setting, not a blind rewrite.

## Audit Scope

This audit reviewed:

- `client/src/pages/dashboard/workspace.tsx`
- `client/src/lib/archivist-workspace.ts`
- `client/src/components/workspace/archivist-editor-entry-hosts.tsx`
- `client/src/components/server-shell/custom-command-workspace.tsx`
- `client/src/components/server-shell/custom-command-v2/custom-command-v2-workspace.tsx`
- `server/index.ts`
- `server/routes.ts`
- `server/storage.ts`
- `server/auditService.ts`
- `server/snapshotService.ts`
- `server/studio-service.ts`
- `server/archivist/dashboard-service.ts`
- `server/archivist/features/custom-command-v2/executor.ts`
- `server/archivist/features/custom-command-v2/runtime.ts`
- `server/archivist/lib/logger/activity-store.ts`
- `shared/schema.ts`
- `shared/routes.ts`
- `shared/custom-command-v2.ts`

## What Already Exists

### Strongest Foundations

#### Design Studio

`server/studio-service.ts` already provides the closest thing Archivist has to a mature platform object model.

It includes:

- canonical documents
- migration from older templates
- normalization
- library items
- publications
- publication snapshots
- runtime events
- render helpers

This is the best current reference model for how draft/live/versioned entities should work across the rest of the platform.

#### Custom Commands v2

`shared/custom-command-v2.ts`, `server/archivist/features/custom-command-v2/executor.ts`, and `server/archivist/features/custom-command-v2/runtime.ts` already form a real workflow engine.

They include:

- multiple trigger types
- typed workflow steps
- dry-run support
- validation output
- cooldowns
- branching
- variables
- button/select/modal continuation
- scheduling hooks
- webhook actions

This is already much closer to the product brief than the older commands surface suggests.

#### Broad Shared Data Model

`shared/schema.ts` already includes tables for many future-state platform domains:

- `studio_documents`
- `studio_publications`
- `studio_publication_snapshots`
- `studio_runtime_events`
- `custom_commands_v2`
- `custom_command_v2_sessions`
- `automations`
- `server_variables`
- `server_webhooks`
- `site_content_surfaces`
- `command_shares`
- `command_imports`
- economy, giveaways, polls, notes, and insights domains

Archivist already has more platform data than its current product shell makes obvious.

## Structural Problems

### 1. Monolithic API Orchestration

`server/routes.ts` is acting as a central controller for too many domains.

Current result:

- route ownership is unclear
- feature boundaries are soft
- reuse is harder than it should be
- cross-module coupling grows every time a new feature is added

Recommendation:

- move toward per-domain route modules with thin HTTP handlers and clearer service ownership

### 2. Monolithic Storage Layer

`server/storage.ts` is the biggest backend bottleneck in the repo.

It currently mixes:

- core server config
- commands
- studio
- moderation
- economy
- automations
- templates
- webhooks
- member-facing modules

This slows down safe refactors and makes domain behavior hard to reason about.

Recommendation:

- split `DatabaseStorage` into domain repositories behind a stable facade

### 3. Overlapping Product Generations

The client currently contains overlapping generations of the same product ideas:

- `design-studio` and `design-studio-v2`
- `custom-command-workspace` and `custom-command-v2`
- multiple route aliases and legacy compatibility paths in `client/src/lib/archivist-workspace.ts`

This creates two problems:

- maintenance cost
- product ambiguity

Recommendation:

- define canonical module surfaces and formally mark compatibility routes as legacy

### 4. Shared Shell Sprawl

`client/src/pages/dashboard/workspace.tsx` has become a massive application shell and route renderer.

It currently mixes:

- section routing
- editorial module framing
- command pages
- settings pages
- channel management tools
- builder entry logic

Recommendation:

- promote the workspace shell into composable section routers and module launch surfaces

### 5. Incomplete Observability

Observability exists, but it is partial and inconsistent.

Examples:

- `server/archivist/lib/logger/activity-store.ts` is in-memory only
- `server/auditService.ts` captures config-like before/after deltas, but not a full mutation ledger
- `server/snapshotService.ts` is useful but narrow
- `server/index.ts` only broadcasts targeted config events instead of using a generalized platform event contract

Recommendation:

- define a shared observability envelope now
- persist critical workflow and runtime telemetry durably later

### 6. Repo Hygiene Risk

The worktree currently contains many deploy archives, temp QA artifacts, and unrelated modifications.

This is a delivery risk because it:

- hides real changes
- raises review cost
- increases accidental deploy scope

Recommendation:

- define a cleanup policy in Phase 0 before more large-scale refactors land

## Current Product Mapping

### Commands

Product shell maturity: medium

Engine maturity: high

Notes:

- the v2 runtime is real
- the old workspace still exists
- the shell still undersells the depth of the engine

### Design Studio

Product shell maturity: medium-high

Engine maturity: high

Notes:

- Studio has the clearest draft/live/publication model
- the new v2 surface is already moving in the right direction
- this should become the reference standard for other modules

### Community / Fun

Product shell maturity: low-medium

System maturity: mixed

Notes:

- several features exist as separate pages
- they are not yet unified as a lifecycle-focused community platform

### Operations / System Settings

Product shell maturity: medium

System maturity: medium

Notes:

- there is meaningful server control functionality
- it is still expressed more like dashboard utilities than a true operations center

## Phase 0 Decisions

### Decision 1

Do not rewrite Archivist from scratch.

Archivist already has too much working domain logic to justify a reset.

### Decision 2

Treat Design Studio and Custom Commands v2 as the two reference subsystems for future platform standards.

They already have the strongest typed models and the clearest signs of scalable architecture.

### Decision 3

Set platform contracts before major runtime refactors.

Phase 0 should define:

- cross-module event vocabulary
- publish state vocabulary
- audit mutation vocabulary
- shared variable scopes
- permission target scopes

### Decision 4

Separate canonical surfaces from compatibility surfaces.

Archivist needs a formal distinction between:

- current flagship surfaces
- legacy routes that still exist to preserve behavior

## Recommended Phase 0 Output

This phase should produce:

1. A written architecture audit and execution plan
2. Canonical shared contracts for events, publish state, variables, permissions, and audit records
3. A cleanup map for legacy UI surfaces and route aliases
4. A module boundary plan for backend services, repositories, and API routers
5. A durable observability plan that starts with contract-setting before infrastructure rewiring

## Phase 0 Workstreams

### Workstream A: Platform Contract Layer

Create a shared contract layer for:

- modules
- entity kinds
- publish states
- variable scopes
- permission scopes
- platform events
- mutation/audit envelopes

This is the lowest-risk, highest-leverage foundation step.

### Workstream B: Module Boundary Map

Define canonical backend ownership for:

- commands
- studio
- community
- operations
- integrations
- shared platform services

### Workstream C: Legacy Surface Inventory

Inventory and mark:

- old builders
- compatibility routes
- duplicate module entry points
- dead or temp operational artifacts

### Workstream D: Observability Baseline

Define the contract for:

- event receipt
- workflow match
- execution start
- success/failure
- retry
- publish
- rollback
- mutation/audit capture

## Immediate Risks

- continuing to add features directly into `server/routes.ts`
- continuing to add CRUD into `server/storage.ts`
- allowing multiple builder generations to drift further apart
- expanding logs without defining a durable telemetry contract first
- shipping more deploy artifacts and temp QA residue in the main worktree

## Recommendation

Phase 0 should be considered successful when Archivist has:

- a clear architecture audit in the repo
- a shared contract layer for platform-wide systems
- a prioritized implementation plan for boundary extraction and observability
- a defined list of canonical versus legacy product surfaces

That is the right foundation for the larger platform restructure in the product brief.
