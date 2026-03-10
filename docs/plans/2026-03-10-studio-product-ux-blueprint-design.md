# Studio Product UX Blueprint

Date: 2026-03-10

## Summary

Define Studio as a layered Discord builder that feels effortless for basic message and embed creation, while still scaling into interactive flows, reusable systems, and advanced publishing. The core correction is to stop exposing structural concepts like views before users have actually created something that requires them.

## Assumption

- One project equals one publishable Discord experience.

## 1. Core Product Philosophy

Studio is a Discord creation system that starts as a fast message and embed builder and grows into an interaction system only when the user needs more.

Studio is not:

- A workflow IDE
- A bot architecture dashboard
- A tool that requires users to understand its internal model before they write content

### Design Principles

- Start with content, not structure.
- Reveal complexity only after user intent makes it necessary.
- Keep one clear primary job on screen at a time.
- Make the Discord result visible early with live preview.
- Use product language users already understand instead of internal engineering terms.

If making one embed feels heavier than Discohook, Studio is failing.

## 2. Mental Model

- `Project`: one publishable Discord experience
- `View`: one visible screen or state inside that project
- `Content`: the visible message material, including text, embeds, fields, media, and layout blocks
- `Embed`: a rich content block inside a screen
- `Component`: an interactive or structural UI block such as buttons, menus, containers, sections, files, and galleries
- `Action`: what happens after interaction, such as opening another screen, opening a modal, assigning a role, or triggering later logic
- `Template`: a prebuilt starting point for a project

### Relationship In Plain English

A project contains one or more screens. Each screen contains content and optional interactive blocks. Actions connect interactions to outcomes. Templates are starter versions of those projects.

## 3. The Role Of Views

`View` is the wrong beginner-facing concept. Internally the model can remain `view`, but the UI should call it `Screen`.

### What A Screen Should Mean

- Another visible state in the same Discord experience
- A place a button, menu, or flow can lead to

### When Screens Should Appear

- The user adds a second visible state
- A button or menu needs somewhere else to go
- A template already contains multiple states
- The project becomes a flow rather than a single message

### When Users Should Not Think About Screens

- One plain message
- One embed
- One info panel
- One message with link buttons only

### Recommended Behavior

- Every project silently starts with one hidden default screen called `Main`
- No screen dropdown in the header
- No start-screen selector until there are at least two screens
- No flow map until the project actually branches

### Strong Recommendation

Hide screens by default. Reveal them only through user intent such as `Add screen`, `Button opens screen`, or `Create follow-up screen`.

The current product mistake is exposing an internal runtime concept as a primary editing concept.

## 4. Product Modes And Levels

Studio should use layered complexity instead of forcing users into an advanced model up front.

### Compose Mode

For plain messages and embeds:

- Message text
- Embed builder
- Simple buttons and menus
- Live preview
- Publish
- No screens UI
- No actions UI unless needed

### Interactive Mode

For multi-step or stateful Discord experiences:

- Screens
- Component behavior
- Modals
- Screen-to-screen navigation
- Stateful preview

### System Mode

For power users building reusable infrastructure:

- Reusable blocks
- Template authoring
- Asset library
- Advanced publishing
- Conditions and logic later
- Shared systems later

### Graduation Rules

- Adding a second screen moves a project from Compose to Interactive
- Adding a non-link interaction reveals Behavior and Screens
- Saving or managing reusable systems reveals System tools

Users should graduate by building, not by choosing a complexity mode up front.

## 5. Creation Flows

### Plain Message

1. Open Studio.
2. Tap `Plain Message`.
3. Tap `Create new`.
4. Land in a simple composer with message body focused.
5. Preview live.
6. Publish.

### Embed

1. Open Studio.
2. Tap `Embed`.
3. Tap `Create new`.
4. Land in an embed-first builder with one starter embed already open.
5. Fill fields top to bottom.
6. Preview live.
7. Publish.

### Interactive Flow

1. Open Studio.
2. Tap `Interactive Message` or `Components`.
3. Tap `Create new`.
4. Start on one main screen instead of a flow map.
5. Add buttons, menus, containers, and sections.
6. When an interaction needs another destination, offer `Create another screen`.
7. Reveal Screens and Behavior only then.
8. Preview interactions.
9. Publish.

### Template

1. Open Studio.
2. Choose `Templates`.
3. Browse templates by purpose, not by system architecture.
4. Pick one.
5. Land in a prefilled project with guided editing hints.
6. Reveal screens and behaviors only if that template actually uses them.
7. Publish after editing.

## 6. Information Architecture

### Studio Home

- Create
- Recent Drafts
- Templates
- Search

### Inside A Project

- Build
- Preview
- Publish

### Conditional Sections

- `Screens` appears only in interactive projects
- `Behavior` appears only when non-link interactions exist
- `Assets` and `Library` live as utilities rather than primary tabs for beginners

### Recommended Build Structure

- Message
- Embeds
- Components
- Behavior only when needed

### Anti-Pattern

Do not show Build, Flow, and Assets as equal peers before content exists.

## 7. Editor Layout

### Desktop

- Left rail for project title, section nav, and screens only when interactive
- Center workspace for the focused builder
- Right side for persistent live preview
- Context inspector as a drawer or side panel for selected block details
- Assets and templates in a modal or side tray rather than permanent clutter
- Behavior lives next to the trigger it belongs to instead of in a disconnected control panel

### Mobile

- Top bar for back, title, save state, and preview shortcut
- Main area shows one workspace at a time
- Workspace tabs for Message, Embeds, and Components
- Behavior appears only when needed
- Preview opens in a bottom sheet or full-screen sheet
- Screens live in a sheet or slide-over rather than a permanent top header
- Assets and templates live in drawers or sheets

Desktop can hold more visible structure. Mobile must stay ruthless.

## 8. Embed-First Experience

The embed builder should feel top-to-bottom and obvious.

### Recommended Order

1. Optional message text above the embed
2. Embed title
3. Description
4. Color
5. Fields
6. Author
7. Thumbnail
8. Main image
9. Footer
10. Timestamp
11. Buttons and menus as an optional next step
12. Add another embed only after the first is working

### UX Rules

- Open with one starter embed already selected
- Never show an empty dead preview
- Use placeholder scaffold content if fields are blank
- Keep the form vertical and readable
- Let users add fields inline without entering a separate management mode
- Make image URLs instantly visible in preview
- Keep multi-embed management secondary, not the first thing the user has to understand

The embed experience should feel closer to composing and seeing the result than configuring a schema.

## 9. Progressive Reveal Rules

- Hide `Screens` until a second screen exists or is explicitly created.
- Hide `Behavior` until a component does more than open a link.
- Hide `Modals` until an action opens one.
- Hide `Start screen` until there are at least two screens.
- Hide the `Flow map` until there are at least three screens or visible branching.
- Hide `Reusable blocks` until the user saves or inserts one.
- Hide `Assets` as a major destination until media or files are actively used.
- Hide multi-embed management until a second embed is added.
- Hide advanced publish options until multiple destinations or advanced publish behavior exists.
- Hide conditions and logic until the user creates branching behavior.
- Hide raw technical labels such as `state`, `view`, or `component tree` in beginner paths.
- When a new advanced area appears, explain it in one sentence right there.

## 10. Naming And Terminology

### Recommended Labels

- `View` -> `Screen`
- `Actions` -> `Behavior`
- `Components v2` -> `Interactive Message` on the entry screen
- `Project` remains internal, but should not be forced into the beginner flow
- `Content` -> `Message` in beginner-facing places
- `Flow` should only appear once the project is actually multi-screen
- `Template` is fine
- `Publish` is fine

`Components v2` is technical and cold. It makes sense internally, but it is weak beginner language.

## 11. MVP Vs Future Roadmap

### MVP Essentials

- Great Studio home
- Fast plain message flow
- Fast embed flow
- Good live preview
- Simple buttons and menus
- Clean publish flow
- Hidden default screen model
- Basic templates
- Mobile-first usability

### Next Phase

- Multi-screen projects
- Behavior panel
- Modal builder
- Better preview states
- Reusable blocks
- Asset library
- Template editing

### Later Advanced Phase

- Conditions and branching logic
- Variables and dynamic content
- Role-aware or permission-aware flows
- Advanced publishing workflows
- Reusable systems across projects
- Analytics and debugging tools
- Shared or team workflows if needed

### What To Postpone

- Full flow maps for everyone
- Heavy logic systems
- Anything that makes the first embed harder
- Anything that exposes internal architecture before it creates user value

## 12. UX Risks And Mistakes To Avoid

- Making the beginner path slower than competitor embed tools
- Exposing `view`, `state`, `project`, or `flow` language too early
- Showing empty preview surfaces with no explanation
- Making users choose structure before writing content
- Splitting actions away from the component that triggers them
- Showing too many top-level tabs on mobile
- Treating templates like the main product instead of an accelerator
- Using a left-nav full-dashboard layout as the default mental model for simple creation
- Letting internal data model terms leak into the UI
- Building power by adding visible complexity instead of progressive reveal

The fastest way to bloat Studio is to mistake capable for visible.

## 13. Final Recommendation

If Studio should become the best builder in this space, the first thing it must get right is making one message and one embed feel effortless.

That is the foundation. Not flows. Not reusable systems. Not logic. Not architecture.

### Final Product Call

- Hide screens by default
- Stop teaching structure before content exists
- Organize the product around `Build -> Preview -> Publish`
- Let interactive power emerge only when the user creates interaction
- Beat Discohook-level simplicity for basic embeds, then layer up into BotGhost-level power

If Studio wins the first five minutes, users will trust it with the advanced stuff. If it loses the first five minutes, the advanced stuff will not matter.
