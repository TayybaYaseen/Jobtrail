# F2 · Works on a phone

**Status:** Approved · **Suggested verdict:** v1
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** all three
**Wishlist:** 8 (Mobile), Z3 (It's ugly)
**Needs:** F1 (the Log in, Sign up and Log out screens are restyled too)

## Context

"It's unusable on my phone" is everyone's complaint. The Applications page is
a five-column table with a stage form squeezed into one cell
(`src/views/applications.ejs`). All styling is six lines of CSS inside
`src/views/partials/header.ejs`. This feature restyles the existing screens
once. After it, "works at 360px" is a rule for every new screen (F3–F5), so
it comes before them.

## User story

As a batchmate checking JobTrail between classes, I want every page to be
easy to read and use on my phone, so that I don't have to wait until I'm at
a laptop.

## Acceptance criteria

1. **Given** any page, **when** it loads, **then** its styles come from one
   stylesheet, `/styles.css`, served from `public/`, and the page has no
   inline `<style>` blocks.
2. **Given** `styles.css`, **when** I read it, **then** every colour is a CSS
   variable on `:root` (so dark mode later is just a second set of values).
3. **Given** the Applications page, **when** it renders, **then** each
   application is a card (`<li class="app-card">`) showing company, role,
   stage, applied date and next step. There is no `<table>`.
4. **Given** a screen 360px wide, **when** I open Applications, This Week,
   Log in or Sign up, **then** nothing scrolls sideways and text is at least
   16px.
5. **Given** a screen 360px wide, **when** I use the Add form or the stage
   form, **then** fields stack one per line, and every button and field is
   at least 44px tall.
6. **Given** a screen 768px wide or wider, **when** I open Applications,
   **then** the cards sit in a grid of two or more columns.
7. **Given** any page while logged in, **when** it loads, **then** the
   navigation shows Applications, This Week and Log out, and the current page
   is marked with `aria-current="page"`.
8. **Given** every form field, **when** the page renders, **then** it has a
   visible `<label>` (not only a placeholder).

## Out of scope

- Dark mode (wishlist 9). The colour variables make it easy later.
- A CSS framework, a build step, icons or web fonts.
- An installable app, offline use, or push notifications.
- New features or fields on any screen.

## Edge cases

| Situation | What should happen |
|---|---|
| A very long company or role name | Wraps inside the card, never widens the page |
| 50+ applications | The list stays readable; no pagination in v1 |
| JavaScript turned off | Everything still works (all forms are plain posts) |
| The phone's text size is turned up | The layout reflows, nothing is cut off |

## Open questions

- [x] A colour palette and a logo. Who picks? (Proposal: neutral greys plus
      one accent colour; no logo in v1.) **Answer:** neutral greys plus a
      purple accent (`--accent: #6d28d9`), no logo in v1.

## Done means

- [x] Every acceptance criterion has a passing test where it can be tested
      in HTML (1, 3, 7, 8). The rest are checked by hand in the browser's
      DevTools at 360px and 768px, with screenshots in the PR.
- [x] Existing page tests still pass.
- [x] "Every screen works at 360px" is added to `AGENTS.md` as a convention.
- [x] `npm test` and `npm run lint` pass.
