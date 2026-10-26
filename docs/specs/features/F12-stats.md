# F12 · Stats: applications to interviews

**Status:** Approved · **Suggested verdict:** later
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** reviewing the job hunt
**Wishlist:** 10 (Stats: how many applications turn into interviews?)
**Needs:** F1, F11 (rejection reasons and the stage they came at)

## Context

An application only stores its current stage. A rejected application has
lost the fact that it reached Interview first, so you can't count "reached
interview" from today's data. This spec adds a stage history: one row each
time a stage changes. F11 already keeps `at_stage` for rejections, which
covers old rejected applications that have a reason.

## User story

As a batchmate several weeks into my job hunt, I want to see how many of my
applications turn into interviews and offers, and where I drop out, so that
I know whether to change my CV, my targets, or my interview prep.

## Acceptance criteria

1. **Given** every stage change from now on, **when** it's saved, **then** a
   stage-history row records the application, the new stage, and the date.
2. **Given** the Stats page, **when** I open it, **then** it shows how many
   applications reached each stage: Applied, Screening, Interview, Offer.
   "Reached" means the highest stage it has ever been at.
3. **Given** 20 applications of which 5 reached Interview, **then** the
   headline reads "5 of 20 applications (25%) reached an interview."
4. **Given** rejected applications with reasons, **when** I open Stats,
   **then** a table shows each reason with its count, most common first, and
   the stage the rejections came at.
5. **Given** applications from LinkedIn, Rozee.pk and added by hand, **when**
   I open Stats, **then** the interview rate is shown for each source.
6. **Given** the period picker, **when** I choose "Last 30 days", **then**
   only applications applied for in the last 30 days are counted.
7. **Given** applications from before stage history existed, **then** their
   highest stage is taken as their current stage (or `at_stage` if
   rejected), and Stats notes "Older applications may be undercounted."
8. **Given** fewer than 5 applications, **when** I open Stats, **then** it
   says "Add a few more applications to see useful stats" instead of
   percentages.
9. **Given** `GET /api/stats`, **then** it returns the same numbers as JSON.

## Out of scope

- Charts beyond simple bars made with HTML and CSS (no chart library).
- Comparing yourself with batchmates.
- Predictions or AI advice.
- Exporting to CSV or PDF.

## Edge cases

| Situation | What should happen |
|---|---|
| No applications | "No applications yet." |
| Stage moved backwards (Interview → Screening) | Highest stage stays Interview |
| A percentage that isn't whole | Rounded to a whole number |
| 0 applications from one source | That source isn't shown |

## Open questions

- [ ] Should "time to first reply" be a stat? (Proposal: later, using the
      stage history this spec adds.)

## Done means

- [ ] Every acceptance criterion has a passing test, using fixtures with
      known counts.
- [ ] Numbers are worked out in a service (`src/services/stats.js`), not in
      the view.
- [ ] `npm test` and `npm run lint` pass.
