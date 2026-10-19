# F1 · Accounts and safe storage

**Status:** approved · **Suggested verdict:** v1
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** [Flow 1](../01-user-flows.md#flow-1--sign-up-and-record-an-application)
**Wishlist:** 2 (Logins), Z1 (everyone runs their own copy), Z2 (two tabs overwrite each other)

## Context

Every batchmate runs their own copy of JobTrail. All data lives in one JSON
file that is read in full and written back in full on every change
(`loadRecords` / `saveRecords` in `src/store.js`), so two saves at the same
time lose one of them. One shared server with accounts fixes both problems.
Every later feature stores data per user, so this comes first.

What exists: `src/store.js` (JSON load/save and record → application
mapping), `src/services/applications.js` (`addApplication`, `moveStage`,
`getApplication`), and web and API routes in `src/routes/`. Dates are stored
as `YYYY-MM-DD`, and imported records keep `applied_on_raw` (see
`src/importers.js`).

## User story

As a batchmate, I want to log in to one shared JobTrail, so that I don't have
to run my own copy and my applications are never lost or seen by others.

## Acceptance criteria

1. **Given** the Sign up page, **when** I enter a new email and a password of
   8 or more characters, **then** an account is created, I'm logged in, and I
   land on an empty Applications page.
2. **Given** an existing account, **when** I log in with the right email and
   password, **then** I land on Applications and see only my applications.
3. **Given** a wrong password or an unknown email, **when** I log in, **then**
   I stay on Log in and see "Email or password is wrong." (the same message
   for both).
4. **Given** I'm not logged in, **when** I open any page except Sign up or
   Log in, **then** I'm redirected to Log in, and after I log in I'm sent
   back to the page I asked for.
5. **Given** I'm not logged in, **when** I call any `/api/*` route, **then**
   I get `401` with `{ "error": { "code": "NOT_LOGGED_IN", … } }`.
6. **Given** user A and user B each have applications, **when** A requests
   B's application by id (page, stage change or API), **then** A gets `404`
   and B's application is unchanged.
7. **Given** two tabs open as the same user, **when** each adds a different
   application, **then** both are saved.
8. **Given** two tabs, **when** one changes application 3's stage and the
   other adds application 9, **then** both changes are kept.
9. **Given** I'm logged in, **when** I tap **Log out**, **then** my session
   ends and Applications redirects to Log in.
10. **Given** an email that already has an account, **when** I sign up with
    it (in any letter case), **then** I see "That email already has an
    account."
11. **Given** Zara's `data/jobtrail.json`, **when** an admin runs
    `npm run import-json -- --email zara@example.com --file data/jobtrail.json`,
    **then** every application is copied into that account, with the same
    dates, stages and notes, including LinkedIn and Rozee.pk dates. The JSON
    file is not modified.
12. **Given** the stored data, **when** I look at a user's row, **then** the
    password is stored only as a salted scrypt hash, never as plain text.

## Out of scope

- Password reset, email verification, "Remember me", logging in with Google.
- Sharing applications between users, teams, admin screens.
- Deleting an account.
- Deploying to a public server (Session 9).
- Changing how dates are stored or parsed.

## Edge cases

| Situation | What should happen |
|---|---|
| Email with capitals or spaces around it | Trim and lowercase before saving and comparing |
| Password shorter than 8 characters | "Password must be at least 8 characters." |
| Many wrong passwords in a row | After 10 failed attempts in 15 minutes for one email, show "Too many tries. Wait 15 minutes." |
| The session cookie is tampered with | Treat as logged out |
| The import file has an unknown `source` | Stop before writing anything and name the record: "Record 7: can't read dates from 'indeed'" |
| The import is run twice | It refuses: "That account already has applications." |

## Open questions

- [ ] Is SQLite enough once deployed, or do we move to Postgres in Session 9?
- [ ] How long should a session last? (Proposal: 30 days.)

## Done means

- [ ] Every acceptance criterion has a passing test.
- [ ] Nothing from "Out of scope" was built.
- [ ] Existing tests are updated to run as a logged-in test user against a
      temporary database, never `data/`.
- [ ] `data/jobtrail.json` is never written to.
- [ ] `npm test` and `npm run lint` pass.
