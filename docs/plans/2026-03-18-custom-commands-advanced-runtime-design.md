# Custom Commands Advanced Runtime Design

Date: 2026-03-18

## Summary

This pass turns Custom Commands from a mostly slash-and-keyword builder into a real event-driven command system.

The current dashboard already exposes advanced trigger types and command settings, but the bot runtime only executes a subset of them. The goal of this design is to make the current builder truthful first, then expand the command engine into the advanced actions the repo is already shaped to support.

## Goals

- Make every trigger currently visible in the Custom Commands builder execute at runtime
- Make every visible command setting behave the way the dashboard says it does
- Add a durable trigger configuration model for schedule, button, select, and reaction commands
- Keep Custom Commands compatible with the current dashboard instead of creating a second command system
- Reuse existing repo capabilities where they already exist, especially storage helpers and Discord-facing services

## Non-Goals

- Rebuilding the entire bot around a new automation platform
- Replacing Studio, Embeds, Scheduled Messages, or other dashboard systems
- Shipping every schema-only action in one risky lump if its backing subsystem is not real enough yet
- Tying button or select triggers to Studio-only token infrastructure as the only path

## Approved Direction

Use an `advanced event engine` model.

Custom Commands should execute from one shared runtime pipeline no matter how they were invoked:

- slash command
- keyword match
- button press
- select menu choice
- scheduled run
- member join
- role added
- reaction added

This is better than adding one-off handlers because cooldowns, permissions, conditions, token resolution, activity logs, and future actions then live in one place instead of drifting per trigger.

## Current Gaps

Today the builder exposes more than the runtime actually supports.

- Runtime supports: `slash`, `keyword`, `join`, `role_add`
- Runtime does not support: `button`, `select`, `schedule`, `reaction`
- Builder settings exposed but not fully enforced: `cooldown`, `cooldownScope`, `deleteInvocation`, `premiumOnly`
- Builder actions exposed are mostly runtime-backed already
- Shared schema already contains a wider advanced action surface than the builder currently shows

The result is a dashboard that feels more capable than the bot actually is.

## Data Model

The `custom_commands` table needs one new JSON field:

- `triggerConfig jsonb`

This keeps the existing row model intact while giving advanced triggers a typed place to store their own configuration.

### Trigger Config Shape

`triggerConfig` should be a discriminated object keyed by `triggerType`.

- `slash`
  - no extra config required beyond command name/description
- `keyword`
  - `matchMode`: `contains` | `starts_with` | `exact`
  - `caseSensitive`: boolean
- `button`
  - `customId`: string
  - `channelId?`: string
  - `messageId?`: string
  - `allowAnyMessage`: boolean
- `select`
  - `customId`: string
  - `allowedValues`: string[]
  - `channelId?`: string
  - `messageId?`: string
  - `allowAnyMessage`: boolean
- `schedule`
  - `cronExpression`: string
  - `timezone`: string
  - `runMissedOnBoot`: boolean
  - `channelId?`: string
- `join`
  - no extra config required
- `role_add`
  - `watchedRoleIds`: string[]
- `reaction`
  - `emoji`: string
  - `channelId?`: string
  - `messageId?`: string
  - `event`: `add`

Raw `customId` matching is the primary button/select strategy for this pass. That keeps triggers compatible with dashboard-built components, existing embeds, and external Discord messages without depending on the unfinished Studio interaction runtime.

## Runtime Architecture

Custom Commands should move to a unified execution pipeline with four layers:

### 1. Trigger Intake

Bot runtime hooks fan events into Custom Commands:

- `InteractionCreate` for slash, button, and select interactions
- `MessageCreate` for keyword commands
- `GuildMemberAdd` for join commands
- `GuildMemberUpdate` for role-added commands
- `MessageReactionAdd` for reaction commands
- scheduler tick loop for schedule commands

### 2. Trigger Matching

Each event type resolves the relevant server commands, filters by `triggerType`, and applies trigger-specific matching against `triggerConfig`.

### 3. Execution Guardrail

Before actions run, every command goes through the same guardrail:

- `enabled`
- required and blocked roles
- allowed and blocked channels
- explicit conditions
- premium gate
- cooldown gate

### 4. Action Execution

Once allowed, actions execute in sequence with shared token resolution, logging, error shaping, and post-run usage updates.

## Trigger Semantics

### Slash

Slash behavior stays close to the current model, but shares the new guardrail and cooldown flow.

### Keyword

Keyword commands gain explicit match modes instead of only substring matching. The default stays forgiving, but exact and starts-with modes become available through `triggerConfig`.

### Button

Button commands run when a Discord button interaction matches the configured `customId`, plus optional channel and message filters. This is intentionally raw and predictable so users can wire buttons from Studio, Embeds, or other messages without a fragile token dependency.

### Select

Select commands run when the menu `customId` matches and, if configured, when the selected value is one of the allowed option values.

### Schedule

Scheduled commands use a cron-style schedule with timezone support. The scheduler should evaluate due commands on a short interval, skip duplicates using command usage timing, and optionally run a missed invocation after boot when the user enables that setting.

### Join

Join remains simple: every new member entering the guild is a candidate invocation.

### Role Add

Role-add commands gain explicit watched-role targeting through `triggerConfig.watchedRoleIds` instead of overloading access-control fields to mean trigger matching.

### Reaction

Reaction commands run when the configured emoji is added to the configured message or channel scope. This pass targets reaction-add only to keep the first release reliable.

## Settings Fidelity

The dashboard settings should become real runtime behavior.

- `enabled`: command never matches when off
- `cooldown`: blocks execution until the command is available again
- `cooldownScope`
  - `user`: keyed by command + user
  - `channel`: keyed by command + channel
  - `server`: keyed by command + guild
- `deleteInvocation`
  - for keyword commands, delete the source message after a successful run when permissions allow
  - ignored for triggers that do not originate from a deletable message
- `dmResponse`
  - reply-style actions route to DMs instead of public output
- `premiumOnly`
  - use real premium resolution against the server owner or owner override list
  - if premium is globally enabled in the current install, the command still passes cleanly instead of half-failing

Cooldown storage can stay in-memory for this pass because the product currently runs as a single bot instance and already relies on short-lived runtime caches. That keeps the system simple while still making the feature real.

## Action Model

### Phase 1 Actions

Keep the currently visible builder actions fully working and better tested:

- `reply`
- `sendStudio`
- `addRole`
- `removeRole`
- `createChannel`
- `sendDM`
- `wait`
- `logEvent`

### Phase 2 Advanced Actions

After trigger parity is solid, surface the advanced action types that already have meaningful backing support in the repo:

- `react`
- `createThread`
- `deleteMessage`
- `pinMessage`
- `setVariable`
- `httpRequest`
- `sendWebhook`
- `addEconomyCoins`
- `addWarning`
- `editPermissions`

Actions should only move into the primary builder once their runtime and validation are real. The point is power with trust, not a bigger fake menu.

## Dashboard Changes

The current builder should stop saying advanced triggers are visible but not fully executed.

### Trigger Editor

`TriggerSpecificPanel` becomes a real editor surface:

- keyword match controls
- button custom ID filters
- select custom ID plus option filters
- cron and timezone schedule editor
- role-add watched role picker
- reaction emoji and scope picker

### Action Editor

The action editor keeps the current core actions first, then adds advanced actions behind a clearly labeled advanced group once runtime support lands.

### Preview and Validation

The preview remains focused on the command response, but command diagnostics should also show:

- invalid cron
- missing custom ID
- missing emoji
- invalid watched role
- unsupported action configuration

## Error Handling

Runtime failures should return or log typed command errors instead of silent skips.

- user-facing failures for slash and interactive invocations
- structured activity failures for non-interactive triggers
- warnings when delete-invocation or DM delivery cannot complete
- scheduler logs for skipped, due, executed, and failed runs

## Testing

Testing needs to move beyond token replacement and slash payload normalization.

### Unit Tests

- trigger matching for button, select, reaction, and schedule configs
- cooldown key generation and expiry
- premium gate resolution
- keyword match modes

### Integration Tests

- slash execution
- keyword execution with deletion path
- button interaction execution
- select interaction execution
- role-add and join execution
- schedule de-duplication

### Manual Smoke

- create each trigger type from the dashboard
- save and reload the command
- trigger it in Discord
- confirm logs, cooldown behavior, and output behavior

## Rollout Order

1. Add `triggerConfig` to schema, API contracts, and builder defaults
2. Refactor runtime into a unified event engine
3. Add button, select, reaction, and schedule intake paths
4. Enforce cooldowns, delete invocation, and premium gating
5. Upgrade the builder trigger panels
6. Expand advanced actions after the parity pass is green

## Success Criteria

This pass is complete when:

- every trigger visible in the builder can be configured and executed for real
- visible settings behave consistently across trigger types
- command logs reflect the real source and outcome of each run
- users no longer see builder copy that admits the runtime is unfinished
- Custom Commands feel trustworthy enough to build on for deeper advanced actions
