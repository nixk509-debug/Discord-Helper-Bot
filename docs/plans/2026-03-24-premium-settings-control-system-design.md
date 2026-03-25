# Premium Settings Control System Design

## Summary

Archivist Settings should stop behaving like a generic settings menu and become a premium mobile-first control system. The new experience replaces the old mixed `general / roles / channels / logging / backups` information architecture with one real Settings route model built around seven high-value control categories.

The visible Settings hierarchy becomes:

- `overview`
- `bot-engine`
- `channel-control`
- `role-power`
- `command-logic`
- `member-flow`
- `signals-logging`
- `safety-recovery`

Old Settings slugs remain only as compatibility redirects or internal content mappings. They are no longer first-class navigation.

## Goals

- Make Settings feel premium, advanced, strict, and deeply configurable
- Replace the old mixed Settings IA with one visible control-system model
- Keep the mobile layout single-column, predictable, and comfortable
- Create one repeated card language per screen and one repeated page grammar across all categories
- Make every category feel like unlocking a deeper control layer rather than opening a boring form list

## Route Architecture

### Canonical Settings Routes

- `/dashboard/servers/:id/settings/overview`
- `/dashboard/servers/:id/settings/bot-engine`
- `/dashboard/servers/:id/settings/channel-control`
- `/dashboard/servers/:id/settings/role-power`
- `/dashboard/servers/:id/settings/command-logic`
- `/dashboard/servers/:id/settings/member-flow`
- `/dashboard/servers/:id/settings/signals-logging`
- `/dashboard/servers/:id/settings/safety-recovery`

### Compatibility Mapping

- `general` -> `bot-engine`
- `server-config` -> `bot-engine`
- `channels` -> `channel-control`
- `roles` -> `role-power`
- `permissions` -> `command-logic`
- `logging` -> `signals-logging`
- `notifications` -> `signals-logging`
- `advanced` -> `bot-engine`
- `backups` -> `safety-recovery`

## Settings Home

The Settings home becomes a curated control hub rather than a feature dump.

### Top Area

Only one server status card appears at the top. It includes:

- server icon and server name
- bot live or offline state
- sync state
- warning count
- admin or premium posture
- compact quick actions for diagnostics, sync, backup, and site editor

### Category Stack

Below the status card is one strict vertical stack of seven category cards. Every card uses the exact same structure:

- icon
- title
- one-line explanation
- primary status chip
- secondary metric or health chip
- chevron or open action

There are no feature tiles, no mixed navigation patterns, and no giant empty panel full of nested rows.

## Category Page Grammar

Every major Settings category reuses the same internal architecture:

1. `SectionHero`
2. `Core`
3. `Advanced`
4. `Intensify`
5. `Diagnostics`
6. `Presets / Quick Actions`

This repeated grammar is what makes the product feel strict, comfortable, and expensive instead of mixed and improvised.

## Category Intent

### Bot Engine

The bot brain and behavior control system.

- Core: bot status, module enablement, sync, server link, permissions health
- Advanced: response defaults, cooldowns, fallback behavior, routing priorities
- Intensify: per-server behavior tuning, context-aware responses, conflict auto-detection, interaction overrides

### Channel Control

A routing and automation system, not a welcome-channel picker.

- Core: staff channels, verify channels, log destinations, managed routes
- Advanced: restrictions, posting defaults, interaction permissions, channel mode behavior
- Intensify: purpose profiles, hidden mirrors, conditional posting, fallback routes, per-channel tuning

### Role Power

Role logic, hierarchy, automation, and guarded access.

- Core: staff roles, verification roles, reward roles, role sync
- Advanced: grouped access behavior, bundles, hierarchy tools, role-based module access
- Intensify: temporary roles, protected roles, expiration logic, automation gates, access matrices

### Command Logic

Command execution as a rules and routing system.

- Core: enablement, visibility, cooldowns, access rules
- Advanced: context restrictions, grouped logic, custom responses, rate-limit overrides
- Intensify: execution conditions, chained actions, silent modes, failure recovery, staged replies

### Member Flow

A user journey system for onboarding and trust progression.

- Core: welcome, verify, join behavior, default roles
- Advanced: staged verification, conditional access, fallback paths
- Intensify: trust progression, suspicious joins, branch logic, staff alerts, re-entry flows

### Signals & Logging

Mission control for alerts, telemetry, and event routing.

- Core: log channels, notification channels, event families, alert types
- Advanced: severity filtering, grouped routing, silent vs loud alerts, role pings
- Intensify: forensic mode, anomaly detection, escalation behavior, event snapshots, health warnings

### Safety & Recovery

Trustworthy backup and rollback controls.

- Core: backups, exports, restores
- Advanced: restore points, snapshot naming, rollback checks, safety prompts
- Intensify: auto-snapshots, diff viewers, partial restore, import validation, guardrails, admin trail

## Component System

The redesign should be implemented as a dedicated Settings component family:

- `SettingsServerStatusCard`
- `SettingsCategoryCard`
- `SettingsSectionHero`
- `SettingsSectionBlock`
- `SettingsIntensifyBlock`
- `SettingsDiagnosticsBlock`
- `SettingsQuickActionRow`
- `SettingsStatusChip`

These components enforce one spacing system, one alignment system, and one action placement system across the entire Settings experience.

## Visual Rules

- single-column mobile-first structure
- one repeated card language per level
- dense but readable surfaces
- controlled crimson usage for actions and important states
- steel tones for structure and neutral depth
- restrained glow only where state or action deserves it
- no decorative side rails, ghost layers, or mixed tile/list patterns

## Success Criteria

The redesign succeeds when:

- the Settings home feels immediately more premium than the old version
- the category stack feels curated, strict, and high-value
- every category page feels like a deeper layer of capability
- old Settings IA is no longer visible as a competing structure
- the mobile UI feels calm, powerful, and comfortable instead of mixed and itchy
