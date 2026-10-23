# F9 · Company notes

**Status:** approved · **Suggested verdict:** later
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** preparing for an interview
**Wishlist:** 14 (Company notes: what you learned about each company)
**Needs:** F1, F3 (the application page links to the company)

## Context

What you learn about a company (culture, interviewers' names, how long they
take to reply, office location) belongs to the company, not to one
application. Today it's scattered across each application's `notes` field.
Batchmates often apply to the same company twice, for different roles or a
year apart.

## User story

As a batchmate, I want one place for what I've learned about each company,
so that I see it every time I apply there or prepare for an interview.

## Acceptance criteria

1. **Given** the Companies page, **when** I open it, **then** it lists every
   company I've applied to, A to Z, with how many applications each has.
2. **Given** a company, **when** I open `/companies/:slug`, **then** I see my
   notes about it and all my applications to it.
3. **Given** a company page, **when** I write notes and save, **then** they're
   saved and shown with "Updated 19 Oct 2026".
4. **Given** "Ravi Systems" and " ravi systems ", **when** the companies are
   listed, **then** they're the same company (compared trimmed and ignoring
   case). The first spelling I used is shown.
5. **Given** an application page, **when** its company has notes, **then**
   the first 200 characters are shown with a link to the company page.
6. **Given** another user has notes on the same company, **when** I open it,
   **then** I see only my own notes.

## Out of scope

- Fetching company information from the web, Glassdoor or LinkedIn.
- Sharing company notes with batchmates (an interesting idea; later).
- Rich text, file attachments, or ratings.
- Renaming or merging companies.
- Feeding company notes into interview prep (F5 uses only the job post and CV).

## Edge cases

| Situation | What should happen |
|---|---|
| Notes over 5,000 characters | "Keep notes under 5,000 characters." |
| A company with no applications left | Hidden from the list; its notes are kept |
| Notes containing HTML | Shown as text, escaped |
| Company names that differ only in punctuation ("Ravi Systems Ltd.") | Treated as different companies in v1 |

## Open questions

- [x] Are company notes private, or shared with batchmates? (Proposal:
      private in this spec. Sharing would be its own spec.)
      **Answer:** Private, as proposed.

## Done means

- [x] Every acceptance criterion has a passing test.
- [x] The per-application `notes` field is left as it is.
- [x] `npm test` and `npm run lint` pass.
