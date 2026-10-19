# F13 · Read-only link for a mentor

**Status:** draft · **Suggested verdict:** later
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** sharing progress
**Wishlist:** 12 (Share with a mentor: a read-only link for a mentor or a parent)
**Needs:** F1 (whose data to share), F2 (mentors and parents open it on their phones)

## Context

Batchmates want a mentor or a parent to see how the job hunt is going
without making them an account, and without letting them change anything.
After F1 everything is per user, so sharing means a secret link that shows
one user's applications, read-only. Some data is private (CVs, salaries,
notes, interview prep), so the link shows less than the owner sees.

## User story

As a batchmate, I want to send my mentor a link that shows my applications
and their progress, so that they can advise me without me writing updates.

## Acceptance criteria

1. **Given** the Sharing page, **when** I tap **Create link**, **then** I get
   a link like `/share/<token>`, where the token is at least 32 random bytes,
   with a **Copy** button.
2. **Given** the link, **when** anyone opens it without logging in, **then**
   they see my name, and each application's company, role, stage, applied
   date and next-step date, newest first.
3. **Given** the shared page, **then** it never shows notes, job posts, CVs,
   salaries, referrals, company notes, rejection notes or interview prep.
4. **Given** the shared page, **then** it has no forms, buttons or links that
   change anything, and every POST to a share URL returns `405`.
5. **Given** I tap **Turn off link**, **when** someone opens the old link,
   **then** they see "This link has been turned off." (`410`).
6. **Given** I create a new link, **then** the old one stops working (one
   link per user).
7. **Given** a made-up or mistyped token, **when** it's opened, **then** the
   page shows "This link doesn't exist." (`404`) and gives no hint whether
   any user exists.
8. **Given** the shared page, **then** it includes
   `<meta name="robots" content="noindex">`.

## Out of scope

- Mentor accounts, comments, or messages from the mentor.
- Choosing which applications or fields to share.
- Several links with different audiences, or links that expire on their own.
- Sharing stats (it can be added once F12 exists).

## Edge cases

| Situation | What should happen |
|---|---|
| The owner deletes an application | It disappears from the shared page |
| The owner has no applications | "No applications yet." |
| Someone tries many tokens | Rate-limited to 30 requests a minute per IP |

## Open questions

- [ ] Should the owner see when the link was last opened? (Proposal: later.)
- [ ] Is the user's name OK to show, or just "A JobTrail user"?

## Done means

- [ ] Every acceptance criterion has a passing test, including one that
      checks every private field is missing from the shared HTML.
- [ ] Tokens are compared in constant time.
- [ ] `npm test` and `npm run lint` pass.
