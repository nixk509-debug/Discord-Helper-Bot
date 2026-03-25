# Logged-In Dashboard Home Design

## Summary

Archivist should have three clean navigation layers:

- `/` for the public marketing landing page
- `/dashboard` for the authenticated home / command lobby
- `/dashboard/servers/:id/...` for the actual server workspace

The logged-in home should feel like a control lobby rather than a generic dashboard index. It should emphasize returning users, highlight the best continue path, and preserve the existing server workspace information architecture.

## Goals

- Stop dropping authenticated users directly into the first server workspace
- Give Archivist a stable home base for every signed-in session
- Keep the current server workspace routes and module structure unchanged
- Make the continue lane and recent work the emotional center of the authenticated home

## Page Structure

### Hero / Command Lobby

The top of `/dashboard` remains the strongest visual area. It frames the home as an operational control surface with current runtime status, a clear primary headline, and direct entry into the lead server.

### Continue Lane

This is the primary promoted module after the hero. It should show the best next action for the lead server using available context such as:

- most recent draft in Studio
- recent command activity
- the lead server itself

The panel should offer direct actions into Studio, Commands, and Settings.

### Managed Servers

Server discovery remains visible, but calmer than the continue lane. One promoted workspace can lead the page, with the rest shown in a quieter grid underneath.

### Quick Actions

Quick actions should stay short and focused:

- Custom Commands
- Design Studio
- Fun & Creative
- Settings
- Invite Bot when relevant

### System Context

System context stays lightweight and operational. It should use compact metric or status surfaces instead of becoming a full monitoring dashboard.

## Routing Behavior

- Logged out `/` -> marketing landing
- Logged in `/` -> redirect to `/dashboard`
- Logged in `/dashboard` -> authenticated home
- Existing `/dashboard/servers/:id/...` routes remain unchanged

## Implementation Notes

- Reuse the existing dashboard overview page as the authenticated home rather than creating a parallel route tree
- Remove the automatic redirect from `/dashboard` into the first server workspace
- Enrich the authenticated home with lead-server overview data and recent Studio draft context
- Keep the Steel Crimson visual system and current IA intact
