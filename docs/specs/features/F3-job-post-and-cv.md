# F3 · Job post and CV on each application

**Status:** draft · **Suggested verdict:** v1
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** [Flow 1](../01-user-flows.md#flow-1--sign-up-and-record-an-application), [Flow 3](../01-user-flows.md#flow-3--prepare-for-an-interview)
**Wishlist:** 4 (Which CV did I send?), and the inputs interview prep (1) needs
**Needs:** F1 (CVs belong to a user), F2 (new screens follow the layout)

## Context

Batchmates edit their CV between applications and forget which version went
where. Interview prep (F5) can't work without the job post and the CV that
was actually sent, so it needs both saved with the application. Today an
application is only company, role, dates, stage and notes
(`makeApplication` in `src/models.js`), and there's no page for a single
application.

## User story

As a fresh grad applying with different CVs, I want to keep my CV versions
and record the job post and the CV I sent with each application, so that I
know exactly what the employer read before my interview.

## Acceptance criteria

1. **Given** the CVs page, **when** I enter a name and paste the CV text,
   **then** a CV version is saved and listed, newest first, with the date I
   added it.
2. **Given** the Applications page, **when** I tap an application's card,
   **then** I go to `/applications/:id`, which shows its details, a job post
   box and a CV picker.
3. **Given** an application page, **when** I paste a job post and choose a
   CV, then **Save**, **then** both are saved and the page shows "Saved".
4. **Given** an application with a CV attached, **when** I open it, **then**
   it shows the CV's name and a link to read the CV text exactly as it was
   saved.
5. **Given** a CV version, **when** I look at it, **then** there is no way to
   edit its text. To change a CV, I add a new version, so a sent CV never
   changes after the fact.
6. **Given** a CV attached to one or more applications, **when** I try to
   delete it, **then** nothing is deleted and I see "This CV was sent with 2
   applications. It can't be deleted."
7. **Given** a CV attached to no application, **when** I delete it, **then**
   it's removed from the list.
8. **Given** `GET /api/applications/:id`, **when** the application has a job
   post and a CV, **then** the JSON includes `job_post` (text or `null`) and
   `cv` (`{ id, name }` or `null`).
9. **Given** applications that existed before this feature, **when** I open
   them, **then** they load with an empty job post and "No CV chosen".
10. **Given** another user's CV id, **when** I try to attach it, **then** I
    get `404` and nothing is saved.

## Out of scope

- Uploading PDF or Word files, or reading text out of them. Paste text only.
- Editing CV text, comparing versions, or CV writing tips.
- Fetching the job post from a URL.
- Cover letters.
- Any AI. That's F5.

## Edge cases

| Situation | What should happen |
|---|---|
| A job post over 20,000 characters | "That job post is too long (20,000 characters max)." Nothing saved |
| CV text over 20,000 characters | "That CV is too long (20,000 characters max)." |
| An empty CV name or text | "Give this CV a name." / "Paste the CV text." |
| Two CVs with the same name | Allowed; the list shows the date added to tell them apart |
| A pasted job post with HTML or `<script>` | Stored as text and shown escaped, never run |
| Clearing the job post box and saving | The job post becomes `null` |

## Open questions

- [ ] Should the CV picker default to the most recent CV for new
      applications? (Proposal: yes.)

## Done means

- [ ] Every acceptance criterion has a passing test.
- [ ] Nothing from "Out of scope" was built.
- [ ] The new pages pass the F2 rules at 360px.
- [ ] `npm test` and `npm run lint` pass.
