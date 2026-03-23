## Summary

The mobile Design Studio embed builder is unstable while editing because the live preview can remount interactive embed cards during typing and because the mobile fixed action bars stay visible while the on-screen keyboard is open. The result is a builder that appears to jump, disappear, or visually glitch when editing author, title, and other inline embed fields.

## Chosen Approach

Use a stability-first patch that keeps the existing mobile workflow but removes the most likely sources of instability:

- Use stable React keys for embed preview cards so title edits do not remount the card.
- Keep the editor surface pinned to the studio preview while editing instead of letting publish-plan state auto-switch the preview mode underneath the user.
- Hide the mobile fixed action chrome while a text input is focused or the keyboard is open so the editor canvas is not fighting overlapping fixed layers.

## Why This Approach

This preserves the current mobile builder interaction model and avoids a larger UX rewrite. It directly addresses the symptoms reported during inline embed editing without changing the document model, publish flow, or mobile navigation structure.

## Validation

Verify on a narrow viewport/mobile device that:

- editing embed author, title, description, and field text no longer causes the active editor to disappear or reset,
- the bottom mobile controls hide while the keyboard is active and return afterward,
- saving, publishing, and tab switching still work after the focus/keyboard changes.
