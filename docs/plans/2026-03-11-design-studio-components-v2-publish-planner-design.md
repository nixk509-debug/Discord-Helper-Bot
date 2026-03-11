# Design Studio Components V2 Publish Planner

## Summary

Audit and refactor the Design Studio Components V2 pipeline so preview and live Discord publish share one truthful source of publish behavior.

Today, Studio preview can render a richer node tree than the live Discord payload. Layout/content nodes such as containers, sections, text blocks, media galleries, and files are often flattened into plain message content or embeds during publish, while only buttons and select menus become Discord components. This makes Components V2 feel inconsistent and can mislead users into thinking preview parity exists when it does not.

The fix is not a cosmetic preview pass. It is a shared publish planning layer that classifies every node and every screen before publish, exposes whether the result is exact, downgraded, or blocked, and makes both preview and publish consume the same planner output.

## Product Rules

### Shared Planner

Add a shared planner between the Studio document model and all preview/publish flows.

For every screen, the planner must:

- inspect the Studio node tree
- accept publish context and transport capabilities
- classify each node as:
  - `exact`
  - `downgraded`
  - `blocked`
- attach a reason and severity to each non-exact node:
  - `visual-only`
  - `structural`
  - `behavior-breaking`
- classify the whole screen as:
  - `Exact V2 publish`
  - `Downgraded publish`
  - `Blocked publish`
- produce a normalized live publish model that downstream preview and publish both consume
- stay pure and deterministic
- avoid transport-side mutation or hidden fallback logic

No downstream serializer may reinterpret node outcomes or apply its own downgrade logic.

### Publish Policy

#### Exact V2 publish

Use this only when the live Discord payload can preserve the intended result without semantic loss, behavior loss, or material structure loss.

#### Downgraded publish

Allowed only for non-interactive visual/content/layout nodes where simplification does not lie about behavior and still preserves the intended meaning of the message.

Examples:

- container/section becoming grouped text content
- media gallery becoming one or more simplified image outputs
- file blocks becoming attachment links
- separators becoming text dividers

Every downgraded node must carry:

- original node type
- live transformation result
- what was lost
- severity:
  - `visual-only`
  - `structural`

Structural downgrade requires stronger confirmation than visual-only downgrade.

#### Blocked publish

Required when downgrade would misrepresent behavior, break interaction, or materially mislead the user about what the live message will do.

That includes:

- buttons
- select menus
- action rows with behavior
- custom-id-backed interactions
- interaction-linked nodes without exact live support
- any screen where the live result would imply something still works when it would not
- any cumulative downgrade severe enough that the published result no longer honestly represents the built screen

Severity:

- `behavior-breaking`

Core rule:

- visual loss can warn
- structural loss can warn harder
- behavior loss must block

Studio may simplify appearance a little, but it must never fake working interaction or misrepresent the real published result.

## UX Contract

Each screen should show a clear planner status banner near preview and diagnostics:

- `Exact V2 publish`
- `Downgraded publish`
- `Blocked publish`

Preview should split into two explicit modes:

1. `Studio view`
   - shows the authored Studio structure
2. `Live publish view`
   - shows the planner-derived result that Discord will actually receive

Default behavior:

- exact screens may default to Studio view
- downgraded screens should default to Live publish view
- blocked screens should default to Live publish view

If a screen is downgraded:

- show a downgrade summary card before publish
- include a short plain-English summary first
- list every downgraded node
- for each downgraded node show:
  - original node type
  - live transformation result
  - what was lost
  - severity
- if any downgraded node is structural, require the stronger confirmation path

If a screen is blocked:

- show blocked reasons first
- disable normal publish
- identify which nodes or behaviors caused the block
- explain whether the user must remove them, replace them, or wait for exact support

Validation summary should explicitly report:

- uses Components V2: yes/no
- uses layout nodes: yes/no
- uses content nodes: yes/no
- uses interactive nodes: yes/no
- publish mode: exact / downgraded / blocked
- downgraded node count
- blocked node count
- missing custom-id/action support
- empty interactive map where relevant
- invalid media/file config
- V2 publish flag readiness
- payload readiness for live publish

Where possible, downgraded or blocked nodes should also be highlighted directly in preview, not only in diagnostics.

Publish flow:

- exact => normal `Publish`
- downgraded => `Review simplified publish`, then `Publish simplified`
- blocked => no publish, only remediation guidance

## Architecture

Add a new shared planner module, recommended path:

- `shared/studio-publish-plan.ts`

Responsibilities:

- walk the Studio node tree for a requested screen
- inspect live publish capabilities
- classify per-node outcomes
- build screen-level publish mode
- produce plain-English summaries
- emit payload readiness flags
- produce a normalized live publish model for downstream consumers

Consumers:

- preview consumes:
  - authored Studio tree
  - planner live-output tree
  - node outcome metadata
- publish consumes:
  - planner output only
  - never raw fallback reinterpretation
- `buildStudioDiscordPayload` must build from the normalized live publish model only, not re-decide node outcomes
- channel send, message edit, interaction reply/update, DM/test sends, and module-bound publish paths must all use the same planner result

## Data Model Additions

Add planner-facing types in shared code.

Suggested types:

- `StudioPublishMode = "exact_v2" | "downgraded" | "blocked"`
- `StudioPublishSeverity = "visual-only" | "structural" | "behavior-breaking"`
- `StudioNodePublishOutcome`
  - `nodeId`
  - `nodeType`
  - `outcome`
  - `severity?`
  - `reasonCode`
  - `reason`
  - `liveResultLabel?`
  - `lostCapabilities?`
- `StudioPublishCapabilities`
  - whether exact live V2 layout/content publish is supported
  - whether exact live interactive publish is supported
  - whether downgrade classes are allowed
- `StudioLivePublishModel`
  - normalized content
  - normalized embeds
  - normalized components
  - publish flags
  - downgrade metadata
- `StudioPublishPlan`
  - `viewId`
  - `mode`
  - `usesComponentsV2`
  - `usesLayoutNodes`
  - `usesContentNodes`
  - `usesInteractiveNodes`
  - `nodeOutcomes`
  - `summary`
  - `publishFlagsReady`
  - `payloadReady`
  - `live`

## Migration Strategy

### Current issue

The current pipeline is split:

- `shared/studio-document.ts` serializes the Studio tree into `content`, `embeds`, and `interactiveComponents`
- `client/src/components/design-studio/studio-preview.tsx` renders authored structure directly
- `server/studio-discord.ts` only builds real Discord component rows for interactive controls
- many non-interactive V2 layout/content nodes are flattened into plain content or embed approximations

### Refactor direction

1. Keep authored document structure unchanged.
2. Add planner to evaluate a screen before preview or publish.
3. Replace ad hoc serializer decisions with planner output.
4. Make preview show both authored Studio view and planner-derived live view.
5. Make publish fail or require confirmation based on planner mode.
6. Remove any hidden fallback reinterpretation from payload builders and send paths.

## Technical Scope

Files expected to change:

- `shared/studio-publish-plan.ts` (new)
- `shared/studio-document.ts`
- `shared/schema.ts`
- `client/src/components/design-studio/studio-preview.tsx`
- `client/src/components/design-studio/design-studio-tab.tsx`
- `server/studio-discord.ts`
- `server/studio-service.ts`
- `server/routes.ts`
- `server/bot/index.ts`

Potential module-bound checks:

- Welcome
- Verify
- Tickets

These should continue routing through Studio, but they must not bypass the planner when publishing or testing Studio documents.

## Diagnostics Requirements

Add planner-level diagnostics for at least:

- missing V2 flag
- publish path exact / downgraded / blocked
- unsupported node type
- node downgraded during publish
- blocked interactive node
- missing custom_id on interactive components
- missing handler binding for button/select actions
- empty interactive map
- invalid media/gallery configuration
- structural downgrade requiring stronger confirmation
- cumulative downgrade too severe to allow publish

Diagnostics should remain human-readable and specific.

## Testing

Add serialization/planning smoke tests for:

- text display only
- media gallery only
- container with text display
- container + section + thumbnail/image downgrade behavior
- action row with buttons
- select menu
- mixed content + interactive message
- blocked downgrade attempt for interactive content
- Welcome/Verify publish paths using Studio documents
- edit existing V2 message
- custom emoji inside V2 text/buttons where supported

Verification should assert:

- planner mode
- node outcomes
- payload readiness
- live payload shape
- blocked publish behavior

## Blunt Verdict

The current system is not a true end-to-end Components V2 pipeline. Preview can show richer authored structure than live publish actually preserves. The fix must make Studio truthful first: classify what can publish exactly, what can publish only as a simplified version, and what must be blocked. Only after that should preview and publish be considered reliable.
