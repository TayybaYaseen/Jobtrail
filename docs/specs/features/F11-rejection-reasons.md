# F11 · Rejection reasons

**Status:** draft · **Suggested verdict:** later
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** after an outcome
**Wishlist:** 7 (Rejection reasons: note why you were rejected, so you can spot patterns)
**Needs:** F1, F3 (the application page)

## Context

Moving an application to Rejected today (`moveStage` in
`src/services/applications.js`) records nothing else. To spot patterns,
reasons have to come from a fixed list, not free text. JobTrail also needs
to remember which stage the rejection came at. Stats (F12) counts both.

## User story

As a batchmate who has been rejected, I want to note why and at what stage,
so that over time I can see what to work on.

## Acceptance criteria

1. **Given** an application, **when** I move it to Rejected, **then** I'm
   asked for a reason from this list: Not enough experience, Skills didn't
   match, Failed technical round, Failed HR/culture round, Position filled,
   Salary mismatch, No reason given, Other.
2. **Given** I choose a reason (and optionally add a note of up to 500
   characters), **when** I save, **then** the reason, the note, and the stage
   it was at before Rejected are saved.
3. **Given** I skip the reason, **when** I save, **then** the reason is "No
   reason given". Rejecting never blocks on it.
4. **Given** a rejected application, **when** I see its card, **then** it
   shows "Rejected at Interview · Failed technical round".
5. **Given** a rejected application, **when** I open it, **then** I can
   change the reason and note later.
6. **Given** a rejected application moved back to another stage, **when** I
   save, **then** the reason and note are cleared.
7. **Given** `GET /api/applications`, **then** rejected applications include
   `rejection: { reason, note, at_stage }`, and others have
   `rejection: null`.
8. **Given** applications rejected before this feature, **then** they show
   "Rejected" with no reason, and load without errors.

## Out of scope

- Charts or counts of reasons (that's F12 Stats).
- AI advice on why you were rejected.
- Asking the company for feedback.
- Adding reasons to the list (only the fixed list in v1).

## Edge cases

| Situation | What should happen |
|---|---|
| Reason not in the list (via the API) | `400` "'Too tall' is not a rejection reason." |
| "Other" with no note | Allowed |
| Note over 500 characters | "Keep the note under 500 characters." |

## Open questions

- [ ] Is "Ghosted (no reply)" a rejection reason, or a separate outcome?
      (Proposal: not in this list. F4 handles silence.)

## Done means

- [ ] Every acceptance criterion has a passing test.
- [ ] The reason list lives in one place (`src/models.js`, next to `STAGES`).
- [ ] `npm test` and `npm run lint` pass.
