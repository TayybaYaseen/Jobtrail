# F6 · Dark mode

**Status:** draft · **Suggested verdict:** later
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** all screens
**Wishlist:** 9 (Dark mode)
**Needs:** F2 (all colours are CSS variables in `public/styles.css`), F1 (the choice is saved per user)

## Context

Batchmates use JobTrail late at night before interviews. After F2, every
colour is a variable on `:root` in one stylesheet, so dark mode is a second
set of values plus a setting to pick between them.

## User story

As a batchmate preparing late at night, I want JobTrail in dark colours, so
that it's comfortable to read in the dark.

## Acceptance criteria

1. **Given** I've never chosen a theme, **when** my phone or computer is set
   to dark, **then** JobTrail shows dark colours (`prefers-color-scheme`).
2. **Given** the Settings page, **when** I choose Auto, Light or Dark and
   save, **then** every page uses that choice, on every device I log in from.
3. **Given** Dark is chosen, **when** a page renders, **then** `<html>` has
   `data-theme="dark"`. With Light it's `"light"`. With Auto there's no
   attribute.
4. **Given** either theme, **when** I check text against its background,
   **then** contrast is at least 4.5:1 for body text and 3:1 for buttons and
   borders.
5. **Given** Dark is chosen, **when** a page loads, **then** it never shows a
   white flash first (the theme is set in the HTML the server sends, not by
   JavaScript afterwards).
6. **Given** the Log in and Sign up pages (no user yet), **when** they load,
   **then** they follow the system setting.

## Out of scope

- More themes, custom colours, or a high-contrast mode.
- Switching automatically by time of day.
- Restyling anything beyond colours.

## Edge cases

| Situation | What should happen |
|---|---|
| A saved theme that isn't Auto, Light or Dark | Treat as Auto |
| Pasted job post or CV text shown in a box | Readable in both themes |
| Printing a page | Always prints light |

## Open questions

- [ ] Should there also be a toggle in the nav, or is Settings enough?
      (Proposal: Settings only.)

## Done means

- [ ] Criteria 2, 3 and 6 have passing tests. 1, 4 and 5 are checked by hand
      in DevTools, with screenshots of both themes in the PR.
- [ ] No colour value appears in `styles.css` outside the theme variables.
- [ ] `npm test` and `npm run lint` pass.
