# F7 · Salary range and offer

**Status:** Approved · **Suggested verdict:** later
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** adding an application, getting an offer
**Wishlist:** 5 (Salary)
**Needs:** F1, F3 (the application page is where salary is entered)

## Context

Batchmates want to compare jobs and offers, but JobTrail has nowhere to put
money. This spec replaces
[EXAMPLE-salary-range.md](EXAMPLE-salary-range.md). It keeps all of that
example's rules for the advertised range (rupees, monthly, validation), and
adds the amount actually offered. Delete the example once this spec is
approved.

## User story

As a fresh grad comparing jobs, I want to note the advertised salary range
and the amount I was offered, so that I can compare offers and see whether
an offer is low for the role.

## Acceptance criteria

1. **Given** the application page, **when** I enter a minimum and maximum
   monthly salary in rupees and save, **then** both are saved.
2. **Given** a range of 80,000 to 120,000, **when** I open Applications,
   **then** the card shows `Rs 80,000 – 120,000`.
3. **Given** only a minimum, or only a maximum, **then** the card shows
   `From Rs 80,000` or `Up to Rs 120,000`.
4. **Given** no salary, **when** the card renders, **then** no salary line
   appears (no "Rs 0", no "undefined").
5. **Given** a minimum larger than the maximum, **when** I save, **then**
   nothing is saved and I see "Minimum can't be more than maximum."
6. **Given** an application at stage Offer, **when** I open it, **then** I
   can enter the monthly amount offered.
7. **Given** an offer of 110,000 on a range of 80,000 to 120,000, **when** I
   open the card, **then** it shows `Offer: Rs 110,000 (within range)`.
   Below the minimum it says "(below range)"; above the maximum, "(above
   range)"; with no range, just the amount.
8. **Given** an application that isn't at stage Offer, **when** I open it,
   **then** there's no offer field.
9. **Given** `GET /api/applications`, **then** each application includes
   `salary_min`, `salary_max` and `salary_offered` as whole numbers or
   `null`.
10. **Given** applications from before this feature, **when** they load,
    **then** there are no errors and no salary is shown.

## Out of scope

- Other currencies, yearly salaries, or converting between them.
- Benefits, bonuses or allowances.
- Sorting or filtering by salary, averages, or "you're underpaid" advice.
- Showing salaries on a mentor's link (F13 hides them).

## Edge cases

| Situation | What should happen |
|---|---|
| `80,000` | Accepted as 80000 |
| `80k` or letters | "Use numbers only, like 80000." |
| Zero or negative | "Salary must be more than 0." |
| Over 10,000,000 a month | "That looks too high. Check the number." |
| Stage moves away from Offer after an offer was entered | The amount is kept but hidden. It shows again if the stage returns to Offer |

## Open questions

- [x] Should the offer have a deadline date? (It could reuse `next_step_on`,
      as the seed data already does for "Offer deadline".)
      **Answer:** Reuse `next_step_on`. An application at Offer already has a
      Next step date on its card and in This Week, so no new field.

## Done means

- [x] Every acceptance criterion has a passing test.
- [x] `EXAMPLE-salary-range.md` is deleted.
- [x] Old data still loads.
- [x] `npm test` and `npm run lint` pass.
