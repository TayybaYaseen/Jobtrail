# F4 · Follow-up reminders

**Status:** Approved · **Suggested verdict:** v1
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** [Flow 2](../01-user-flows.md#flow-2--follow-up-on-silence)
**Wishlist:** 3 (Follow-up reminders), from Mahnoor
**Needs:** F1 (reminders per user), F2 (This Week layout)

## Context

"Remind me to follow up if I haven't heard back in a week." The This Week
page and the Monday digest already show upcoming next steps (`thisWeek` in
`src/services/schedule.js`, `scripts/weekly-digest.js`). Nothing tracks
silence. An application doesn't record when it last changed, only
`applied_on` and `next_step_on`.

## User story

As a batchmate waiting to hear back, I want JobTrail to tell me which
applications have had no reply for a week, so that I follow up before the
role is filled.

## Acceptance criteria

All examples use today = 19 Oct 2026.

1. **Given** an application at stage Applied, last changed on 12 Oct or
   earlier, with no follow-up since, **when** I open This Week, **then** it's
   listed under **Follow up** as "Margalla Tech · no reply for 35 days".
2. **Given** an application at stage Applied, last changed on 13 Oct (6 days
   ago), **when** I open This Week, **then** it is not listed.
3. **Given** an application at any stage other than Applied, **when** I open
   This Week, **then** it's never in **Follow up** (a reply has come).
4. **Given** a listed application, **when** I tap **Followed up**, **then**
   today is saved as its follow-up date and it leaves the list until 7 more
   days of silence (26 Oct).
5. **Given** an application, **when** it's added or its stage changes,
   **then** its last-changed date is set to today.
6. **Given** applications from before this feature (no last-changed date),
   **when** reminders are worked out, **then** the applied date is used
   instead.
7. **Given** several applications to follow up, **when** they're listed,
   **then** the longest silence comes first.
8. **Given** the Monday digest, **when** there are follow-ups, **then** they
   appear after the week's next steps as "- Follow up: Margalla Tech · no
   reply for 35 days". When there are none, the section is left out.
9. **Given** `GET /api/follow-ups`, **when** I call it, **then** it returns
   the same list, each with `days_silent`.
10. **Given** nothing to follow up, **when** I open This Week, **then** the
    section says "Nothing to follow up on. Nice."

## Out of scope

- Sending emails or messages to the company, or drafting them.
- Setting a different number of days per user or per application (7 for
  everyone in v1).
- Push notifications, SMS, or emailing the digest (the digest prints text, as
  today).
- Snoozing for a custom time.

## Edge cases

| Situation | What should happen |
|---|---|
| **Followed up** tapped twice | The second tap changes nothing |
| An application with a future applied date | Not listed |
| Followed up, then 7 days pass | Listed again, counting days since the follow-up |
| The application was deleted in another tab | "That application no longer exists." The page reloads |
| A rejected application | Never listed |

## Open questions

- [x] Should Screening count as "heard back"? (Proposal: yes, so only
      Applied gets reminders.) **Answer:** yes, as criterion 3 says.
- [x] Where does the digest read from? **Answer:** the database, for one
      account: `npm run digest -- --email you@example.com`. The old JSON file
      has no follow-up dates, so it couldn't drop a reminder after
      **Followed up**.

## Done means

- [x] Every acceptance criterion has a passing test, using the pinned date
      (`JOBTRAIL_TODAY`).
- [x] Nothing from "Out of scope" was built.
- [x] Existing This Week and digest tests still pass.
- [x] `npm test` and `npm run lint` pass.
