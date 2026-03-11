# Custom Commands Command Canvas Implementation Plan

Date: 2026-03-11

## Context

The approved design for this pass is documented in `docs/plans/2026-03-11-custom-commands-command-canvas-design.md`.

This implementation plan turns the current Custom Commands module into a command-canvas experience centered on one selected command with live output, cleaner inspector grouping, and mobile-first behavior.

## Scope

This pass includes:

- command canvas layout
- searchable command rail
- live response preview as the main surface
- guided new-command creation into the canvas
- cleaner inspector grouping
- mobile-first layout cleanup
- better command status and action hierarchy

This pass does not include:

- backend redesign of command execution
- solving every advanced command edge case
- building a second command editor

## Delivery Strategy

Restructure the current module around one selected command first, then layer the live preview, guided creation flow, and mobile polish on top.

The module already has deep features, so the implementation should preserve capability while dramatically improving presentation and editing flow.

## Phase 1: Command Canvas Shell

Target files:

- `client/src/components/commands/commands-tab.tsx`
- any extracted helper components introduced during the refactor

Tasks:

- make one selected command the primary surface
- add a command rail for search, switching, status, and quick scanning
- add a dominant command canvas area for the selected command
- add an action bar for save, test, duplicate, enable or disable, and delete

Success criteria:

- the module is no longer list-first in feel
- one selected command clearly becomes the active product surface

## Phase 2: Live Output Surface

Target files:

- `client/src/components/commands/commands-tab.tsx`
- any preview helpers extracted from the module

Tasks:

- render text command responses in a Discord-like live output surface
- render embed responses in a clear full preview
- expose response type, status, cooldown, and access signals as visible chips
- keep the live output visible while editing
- use sample variable resolution where practical for preview confidence

Success criteria:

- the selected command’s output is understandable immediately
- preview stays central instead of buried in secondary controls

## Phase 3: Inspector Grouping

Target files:

- `client/src/components/commands/commands-tab.tsx`

Tasks:

- reorganize editing controls into:
  - Trigger
  - Response
  - Access
  - Behavior
  - Variables
  - Advanced
- prioritize Trigger, Response, and Live Output in the default view
- keep advanced HTTP and mapping controls accessible without dominating the first screen

Success criteria:

- the module reads like a builder, not a technical dump
- advanced features remain available without overwhelming common tasks

## Phase 4: Guided New Command Flow

Target files:

- `client/src/components/commands/commands-tab.tsx`

Tasks:

- replace cramped modal-first creation with a stronger starter flow
- ask for minimal setup:
  - command name
  - purpose
  - response type
- drop the user directly into the command canvas after creation
- keep starter logic flexible enough for future quick starters

Success criteria:

- new command creation feels fast and confident
- the user lands directly in the live builder instead of a detached setup form

## Phase 5: Mobile Cleanup

Target files:

- `client/src/components/commands/commands-tab.tsx`

Tasks:

- turn the command rail into a phone-friendly picker or sheet
- keep the live output easy to reach on mobile
- move the inspector into a bottom sheet or similar touch-first surface
- collapse multi-column layouts earlier
- keep action controls visible without covering important content
- reduce mobile clutter in variables and advanced sections

Success criteria:

- the command module feels intentionally usable on phones
- the live output remains central even on narrow screens

## Phase 6: Verification and Polish

Tasks:

- verify create, edit, save, duplicate, delete, and enable or disable flows
- verify text and embed response preview behavior
- verify variable helpers and advanced sections still work after regrouping
- verify search and command switching
- verify mobile layout behavior
- run existing repo validation commands that are feasible in the current workspace

Success criteria:

- the new command canvas is stable and clearly better than the old flow
- validation results are recorded clearly

## Risk Notes

- `commands-tab.tsx` already contains a large amount of capability, so extract helpers only where it immediately improves clarity.
- The live preview should reuse existing response data instead of introducing a second command model.
- Advanced sections must not be lost during cleanup.

## Recommended Execution Order

1. command canvas shell
2. live output surface
3. inspector regrouping
4. guided new-command flow
5. mobile cleanup
6. verification and polish

## Handoff

This plan is the fallback replacement for the missing `writing-plans` skill in the current workspace. It is the working implementation checklist for the Custom Commands redesign pass.
