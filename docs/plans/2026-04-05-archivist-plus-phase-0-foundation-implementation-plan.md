Date: 2026-04-05

# Archivist Plus Phase 0 Foundation Implementation Plan

## Context

The Phase 0 audit is documented in `docs/plans/2026-04-05-archivist-plus-phase-0-architecture-audit-design.md`.

This implementation plan focuses on safe foundation work.

It does not attempt a risky runtime rewrite in one pass.

## Objectives

- define canonical cross-module platform contracts
- create a clean execution order for backend decomposition
- reduce ambiguity around flagship versus legacy product surfaces
- establish an observability baseline before infrastructure changes

## Scope For This Phase

This phase includes:

- shared platform contract definitions
- architecture and execution documentation
- identification of module boundaries
- observability contract planning
- legacy surface inventory planning

This phase does not include:

- replacing `server/routes.ts` outright
- replacing `server/storage.ts` outright
- moving all modules onto a new event bus immediately
- rebuilding every dashboard route
- introducing Redis, queues, or third-party telemetry in the same pass

## Delivery Order

### Phase 0.1: Shared Contract Layer

Target files:

- `shared/platform/contracts.ts`

Tasks:

- define module IDs
- define canonical entity kinds
- define shared publish states
- define shared variable scopes
- define permission target scopes
- define platform event envelope
- define mutation and audit envelope

### Phase 0.2: Canonical Module Map

Target output:

- audit doc updates or follow-up planning docs

Tasks:

- declare backend ownership by domain
- identify which services remain shared platform services
- define a future route extraction order
- define a future repository extraction order

### Phase 0.3: Legacy Surface Inventory

Target output:

- follow-up planning doc or tracked inventory

Tasks:

- mark flagship builders
- mark compatibility surfaces
- identify dead routes and temp artifacts
- define removal or migration order

### Phase 0.4: Observability Baseline

Target output:

- platform contract usage plan

Tasks:

- define which events must be emitted for commands, studio, and settings mutations
- define minimum payload for success, failure, retry, and rollback
- define which in-memory stores should become durable first

### Phase 0.5: Extraction Readiness

Target output:

- next implementation plan

Tasks:

- choose first backend slice to extract from `server/storage.ts`
- choose first route slice to extract from `server/routes.ts`
- choose first client shell slice to extract from `workspace.tsx`

## Recommended Extraction Order

### Backend

1. Studio services and routes
2. Custom Commands v2 services and routes
3. Operations and settings routes
4. Community module routes
5. Shared platform services

### Client

1. Workspace section routers
2. Studio entry and builder surfaces
3. Commands entry and builder surfaces
4. Operations center surfaces
5. Community lifecycle surfaces

## Observability Priorities

Implement in this order:

1. shared event contract
2. durable workflow execution records
3. durable failure records
4. generalized mutation audit records
5. timeline views and operator dashboards

## Verification

- TypeScript build still passes
- new shared contracts compile cleanly
- no existing runtime behavior changes
- docs reflect the actual current architecture rather than an aspirational rewrite

## Success Criteria

This Phase 0 plan is successful when:

- the repo contains an explicit architecture audit
- the repo contains a shared contract layer for platform systems
- future refactors can target stable contract names instead of inventing new terms ad hoc
- the next extraction phase has a clear order and rationale
