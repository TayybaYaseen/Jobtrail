# EXAMPLE · Salary range on each application

> This is a worked example, not part of your v1. It shows what a finished
> spec looks like. Salary tracking is wishlist item 5; your class may well
> cut it.

**Status:** ready for tickets
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** adding an application

## Context

Batchmates want to compare offers, but JobTrail has nowhere to put money.
An application today is the object made in `src/models.js` (`makeApplication`)
and saved as a record in `data/jobtrail.json` by `src/store.js`. The
Applications page is `src/views/applications.ejs`, the add form posts to
`POST /applications` in `src/routes/web.js`, and the API lives in
`src/routes/api.js`.

## User story

As a fresh grad comparing jobs, I want to note the salary range a job
advertises, so that I can see at a glance which applications pay what.

## Acceptance criteria

1. **Given** the add form, **when** I enter a minimum and maximum monthly
   salary in rupees, **then** the application is saved with both numbers.
2. **Given** an application with a range of 80,000 to 120,000, **when** I open
   the Applications page, **then** its row shows `Rs 80,000 – 120,000`.
3. **Given** an application with only a minimum, **when** I open the page,
   **then** its row shows `From Rs 80,000`.
4. **Given** an application with no salary, **when** I open the page, **then**
   the salary cell is empty (no "Rs 0", no "undefined").
5. **Given** a minimum larger than the maximum, **when** I save, **then**
   nothing is saved and I see "Minimum can't be more than maximum."
6. **Given** `GET /api/applications`, **when** an application has a range,
   **then** its JSON includes `salary_min` and `salary_max` as whole numbers
   (or `null` when not given).
7. **Given** the applications that existed before this feature, **when** the
   app loads them, **then** they load without errors and show no salary.

## Out of scope

- Other currencies. Rupees only.
- Yearly salaries, or converting between monthly and yearly.
- The offer actually made (that's a different number; maybe later).
- Sorting or filtering by salary.
- Averages, charts or "you're underpaid" advice.

## Edge cases

| Situation | What should happen |
|---|---|
| Someone types `80k` or `80,000` | Accept digits with commas; reject `80k` with "Use numbers only, like 80000." |
| Zero or a negative number | Reject: "Salary must be more than 0." |
| A huge number (over 10,000,000 a month) | Reject: "That looks too high. Check the number." |
| Only a maximum, no minimum | Show `Up to Rs 120,000`. |

## Open questions

- [x] Monthly or yearly? **Monthly**: that's how jobs in Pakistan advertise.
- [ ] Should batchmates be able to hide salaries when sharing? (Not in v1.)

## Done means

- [ ] Every acceptance criterion has a passing test.
- [ ] Nothing from "Out of scope" was built.
- [ ] Old data in `data/jobtrail.json` still loads.
- [ ] `npm test` and `npm run lint` pass.
