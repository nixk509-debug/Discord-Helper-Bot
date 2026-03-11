# Custom Commands Command Canvas Design

Date: 2026-03-11

## Summary

This pass redesigns the Custom Commands module around one command at a time with a premium live setup flow.

The current module is powerful but dense. It behaves more like a technical editor than a product surface. The redesign makes the selected command the main surface, keeps a live response preview visible, and moves supporting controls into a cleaner inspector model.

## Goals

- Make one selected command the primary editing surface
- Keep a live response preview visible while editing
- Make new command creation feel fast and high-confidence
- Reduce visual clutter and technical overload
- Improve mobile usability
- Preserve advanced power where needed without making it the default experience

## Non-Goals

- Full backend redesign of command execution
- Replacing every advanced command feature in one pass
- Building a second parallel command system
- Returning to list-first CRUD as the main interaction model

## Approved Direction

Use a `command canvas` model.

The selected command becomes the product surface. The command rail helps the user switch context, but the main experience is centered on the currently selected command and its live output.

This is better than a dense split editor because it makes Custom Commands feel closer to Studio:

- live output first
- inspector second
- advanced complexity nearby but not dominant

## Core Product Model

Custom Commands should stop feeling like a long technical editor and become a live command builder.

### Main Zones

- `Command rail`
- `Live command canvas`
- `Inspector`
- `Action bar`

### Command Rail

The rail should provide:

- search
- status indicators
- response type chips
- quick signal badges
- command switching

Its job is to help the user find the right command quickly without turning the whole page into a command table.

### Live Command Canvas

The live canvas is the dominant surface.

It should show the response the selected command sends in a Discord-style presentation:

- text commands render like real Discord messages
- embed commands render as full embed previews
- mixed or advanced output still shows the final response shape clearly

The user should always understand:

- what the command does
- who can use it
- what it returns

### Inspector

The inspector controls command editing without overpowering the canvas.

### Action Bar

The action bar should keep critical actions obvious:

- save
- test
- duplicate
- enable or disable
- delete

## Live Preview Model

Live output is the anchor of the redesign.

### Behavior

- preview updates live while editing
- variables should render with realistic sample data where possible
- access restrictions and cooldowns should appear as visible status chips
- HTTP action or advanced behavior should be visible, but secondary until needed

This keeps confidence high and reduces the edit-check-exit loop.

## Creation Flow

`New Command` should not drop the user into a cramped modal-first editor.

### Starter Flow

The creation flow should ask for just enough to begin:

- command name
- short purpose
- response type

Then it should open the new command directly in the command canvas.

### Future-Friendly Starters

Possible later quick starters:

- Announcement
- Utility Reply
- Embed Command
- Role or Access Command
- HTTP Action Command

These are optional later helpers, not required for this pass.

## Inspector Model

The inspector should group editing into clear sections.

### Trigger

- name
- aliases
- description

### Response

- text
- embed
- mixed output where already supported

### Access

- required roles
- blocked roles
- allowed channels
- blocked channels

### Behavior

- enabled
- cooldown
- DM reply
- delete invocation

### Variables

- insert helpers
- samples

### Advanced

- HTTP action
- mappings
- edge behaviors

The primary screen should center on Trigger, Response, and Live Output.

## Mobile Behavior

Commands must feel usable on phones, not like a compressed desktop tool.

### Rules

- command rail becomes a top picker or bottom sheet
- live response canvas stays easy to reach
- inspector opens as a bottom sheet
- action bar remains visible without covering important content
- multi-column editor regions collapse early
- variables and advanced tools stay available without flooding the screen

### Mobile Flow

1. choose command
2. see live output first
3. edit trigger, response, access, and behavior through the inspector
4. test and save without losing context

## Copy Direction

Use clean operator-facing labels.

Preferred labels:

- Command
- Trigger
- Response
- Who Can Use It
- Behavior
- Variables
- Advanced
- Live Output
- Test Command

Avoid:

- technical config language on the primary screen
- raw database/editor wording
- overly jargon-heavy labels

## Architecture Fit

This redesign should build on the current module’s power rather than replacing it with a simpler but weaker system.

The main changes are:

- presentation hierarchy
- editing flow
- grouping
- mobile behavior
- stronger preview-first structure

Advanced command capabilities already present in the module should remain available, but tucked behind better primary surfaces.

## Pass Boundaries

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
- solving every advanced automation edge case
- introducing a second command builder
- hiding live output behind secondary tabs or modal loops

## Verification

This pass is complete when:

- one selected command feels like the main product surface
- live output is always easy to understand
- new command creation feels fast and guided
- existing command editing feels less cluttered
- mobile usage is materially better
- advanced controls still exist without dominating the main flow

## Next Step

After this design approval, the next step is an implementation plan for the command canvas build pass.
