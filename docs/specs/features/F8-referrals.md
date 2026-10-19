# F8 · Referrals

**Status:** draft · **Suggested verdict:** later
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** adding an application, after an outcome
**Wishlist:** 11 (Referrals: track who referred you, so you can thank them)
**Needs:** F1, F3 (the application page)

## Context

In Pakistan's job market a lot of interviews come through a senior, a
teacher or a relative. Batchmates forget who helped with which application,
and forget to thank them when something happens. Today this ends up in the
free-text notes, if anywhere.

## User story

As a batchmate who got a referral, I want to record who referred me and be
reminded to thank them, so that I keep good relationships with the people
who help me.

## Acceptance criteria

1. **Given** the application page, **when** I enter a referrer's name (and
   optionally how I know them and a contact), **then** it's saved with the
   application.
2. **Given** an application with a referrer, **when** I see its card,
   **then** it shows "Referred by Ahmed Khan".
3. **Given** the Referrals page, **when** I open it, **then** it lists every
   referral: name, company, current stage, and whether I've thanked them.
   Not-yet-thanked comes first.
4. **Given** a referral, **when** I tap **Thanked**, **then** today is saved
   as the thank-you date and it moves down the list showing "Thanked 19 Oct".
5. **Given** a referred application that moves to Interview, Offer or
   Rejected, **when** I haven't thanked the referrer since, **then** This
   Week lists "Tell Ahmed Khan about Ravi Systems: you reached Interview."
6. **Given** the same person referred me for two companies, **when** I open
   Referrals, **then** both show, as two rows.
7. **Given** an application with no referrer, **then** no referral line
   appears anywhere.

## Out of scope

- Sending thank-you messages, or drafting them.
- A contacts book, or linking to LinkedIn profiles.
- More than one referrer per application.
- Asking people for referrals.

## Edge cases

| Situation | What should happen |
|---|---|
| Name is blank but contact is filled in | "Add the person's name." |
| Name over 100 characters | "Keep the name under 100 characters." |
| Referrer removed from the application | The referral disappears from Referrals |
| Thanked twice | The thank-you date updates to the latest |

## Open questions

- [ ] Should "how I know them" be a fixed list (senior, teacher, family,
      colleague) or free text? (Proposal: free text.)

## Done means

- [ ] Every acceptance criterion has a passing test.
- [ ] Nothing from "Out of scope" was built.
- [ ] `npm test` and `npm run lint` pass.
