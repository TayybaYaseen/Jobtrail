# F14 · Import applications from Gmail

**Status:** draft · **Suggested verdict:** never, for now
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** adding an application
**Wishlist:** 6 (Import from email: read application confirmations from Gmail automatically)
**Needs:** F1 (Google is connected per user), F3 (the application page, for reviewing imports)

## Context

Job sites email a confirmation for every application ("Your application was
sent to Ravi Systems"). JobTrail already reads LinkedIn and Rozee.pk dates
from exports (`src/importers.js`), each in the site's own format. Reading
Gmail needs Google OAuth with the `gmail.readonly` scope. Google classes that
as a *restricted* scope: a public app needs Google's verification and a
yearly security assessment. Without them, only up to 100 manually added test
users can connect. This spec is written so the team can see the cost before
deciding.

## User story

As a batchmate who applies through job sites, I want JobTrail to find my
application confirmations in Gmail, so that I don't have to type each one in.

## Acceptance criteria

1. **Given** Settings, **when** I tap **Connect Gmail** and approve Google's
   screen, **then** JobTrail stores a refresh token for read-only access, and
   shows "Connected as hira@gmail.com".
2. **Given** a connected account, **when** I tap **Check Gmail**, **then**
   JobTrail searches only the last 30 days, and only messages from LinkedIn
   (`jobs-noreply@linkedin.com`) and Rozee.pk confirmation senders.
3. **Given** a LinkedIn confirmation email, **when** it's read, **then**
   JobTrail extracts the company, role and date, and shows it in an
   **Import review** list. Nothing is added yet.
4. **Given** the review list, **when** I tick items and tap **Import**,
   **then** each becomes an application at stage Applied, with source
   `linkedin` or `rozee` and the email's date.
5. **Given** an email already imported (same Gmail message id), **when** I
   check again, **then** it doesn't appear in the review list.
6. **Given** a company and role I already have with an applied date within 3
   days, **when** it appears in review, **then** it's marked "Looks like a
   duplicate" and unticked.
7. **Given** an email JobTrail can't read, **then** it's listed under
   "Couldn't read" with its subject, and nothing is guessed.
8. **Given** I tap **Disconnect Gmail**, **then** the token is revoked with
   Google and deleted from JobTrail.
9. **Given** any import, **then** JobTrail never stores email bodies, only
   the fields it extracted and the message id.

## Out of scope

- Reading emails automatically in the background (only when you tap **Check
  Gmail**).
- Other email providers (Outlook, Yahoo), or job sites besides LinkedIn and
  Rozee.pk.
- Detecting replies, interview invites or rejections from email.
- Using AI to read emails.
- Sending email.

## Edge cases

| Situation | What should happen |
|---|---|
| Google token expired or revoked in Google settings | "Gmail is disconnected. Connect again." |
| LinkedIn changes its email layout | That email goes to "Couldn't read"; nothing breaks |
| A thousand matching emails | Only the newest 100 are processed per check |
| No matching emails | "No new application emails in the last 30 days." |

## Open questions

- [ ] Do we accept Google's restricted-scope verification and security
      assessment, or stay as an unverified app limited to 100 test users?
- [ ] Is the privacy risk of holding Gmail tokens worth saving 10 seconds per
      application?
- [ ] A cheaper alternative: let users upload LinkedIn's and Rozee.pk's
      export files, which the date parsers already support.

## Done means

- [ ] Every acceptance criterion has a passing test, with Google's API
      mocked and real (anonymised) confirmation emails as fixtures.
- [ ] Tokens are encrypted at rest. The client secret comes from the
      environment.
- [ ] `npm test` and `npm run lint` pass.
