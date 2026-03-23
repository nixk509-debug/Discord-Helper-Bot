# Archivist Sidebar Banner Design

## Goal
Refit the mobile-first dashboard sidebar so it feels more intentional, premium, and visual without hurting readability.

## Approved Direction
- Replace the plain top header block with an Archivist-branded dark crimson banner treatment.
- Use a clean, editorial version of the red energy/drip look instead of a busy game-like background.
- Move `Invite` and `Log out` out of the footer and into two compact square quick-action buttons near the brand area.
- Keep the rest of the drawer simple: server switcher first, then section navigation, then tool links.
- Keep owner-only `Site Editor` access available, but as a low-noise secondary action instead of another bulky footer card.

## UX Rules
- Mobile comes first.
- The banner should add atmosphere without making controls hard to read.
- Quick actions must be immediately tappable and visible near the top of the drawer.
- The sidebar should no longer end in large utility cards.
- Navigation density should stay controlled so the art feels like a header, not a wallpaper.

## Visual Direction
- Deep charcoal and black base.
- Refined crimson energy streak near the top third of the header.
- Soft fog / ember glow, but darker through the center so the logo and controls stay legible.
- Avatar remains the anchor for the Archivist brand.
- Action buttons should feel like instrument controls rather than standard utility buttons.

## Implementation Shape
- Build the banner directly in the sidebar header using layered gradients and glow treatment so the UI does not depend on a new generated asset.
- Keep the existing avatar asset.
- Use compact icon actions for `Invite` and `Log out`.
- Use a slim owner-only `Site Editor` button under the server picker if needed.

