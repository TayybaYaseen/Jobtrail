# F10 · Interviews in Google Calendar

**Status:** draft · **Suggested verdict:** later (first pick after v1)
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** after scheduling an interview
**Wishlist:** 13 (Calendar: put interviews in Google Calendar)
**Needs:** F1, F2

## Context

Next steps already have a date (`next_step_on`, used by `thisWeek` in
`src/services/schedule.js`), but batchmates live in Google Calendar. Syncing
with Google needs OAuth and a verified Google app. This spec avoids all of
that. It uses Google's "add event" link and a standard `.ics` file, which
works with Google, Apple and Outlook calendars. Next steps have a date but
no time, so events are all-day.

## User story

As a batchmate with an interview coming up, I want to add it to my calendar
in one tap, so that I get my calendar's usual reminders.

## Acceptance criteria

1. **Given** an application at Screening, Interview or Offer with a
   next-step date, **when** I open it or see it on This Week, **then** there
   is an **Add to Google Calendar** link and a **Download .ics** link.
2. **Given** Ravi Systems, Interview, 20 Oct 2026, **when** I tap **Add to
   Google Calendar**, **then** it opens
   `https://calendar.google.com/calendar/render?action=TEMPLATE` with
   title "Interview · Ravi Systems (Associate Software Engineer)" and dates
   `20261020/20261021` (all day).
3. **Given** the same application, **when** I download the `.ics`, **then**
   it's a valid iCalendar file with one all-day `VEVENT`, the same title, and
   a `UID` that stays the same for this application.
4. **Given** the stage is Offer, **then** the title starts with "Offer
   deadline" instead of "Interview"; for Screening, "Screening".
5. **Given** an application with no next-step date, or at Applied or
   Rejected, **then** no calendar links are shown.
6. **Given** another user's application id, **when** I request its `.ics`,
   **then** I get `404`.

## Out of scope

- Signing in with Google, or writing to the calendar directly.
- Updating or removing an event when the date changes (the user re-adds it).
- A subscribable calendar feed of all interviews.
- Interview times or time zones (dates only, as JobTrail stores today).

## Edge cases

| Situation | What should happen |
|---|---|
| Company name with commas, semicolons or emoji | Escaped correctly in the `.ics` (RFC 5545) and URL-encoded in the link |
| 31 Dec 2026 | End date is `20270101` |
| The `.ics` for the same application downloaded twice | Same `UID`, so calendars update it instead of duplicating it |

## Open questions

- [ ] Do we want interview times? That means a new field and time zone
      handling (always Asia/Karachi?). Not in this spec.

## Done means

- [ ] Every acceptance criterion has a passing test, using `src/dates.js`
      for every date, never the local time zone.
- [ ] The `.ics` file opens in Google Calendar (checked by hand).
- [ ] `npm test` and `npm run lint` pass.
