# User flows

These are the three flows the Demo Day story walks through, in the order a
user meets them. "Today" is pinned to 19 Oct 2026 (`npm run dev:demo`).

---

## Flow 1 · Sign up and record an application

**Who and when:** Hira, on her phone between classes, just after applying to
Ravi Systems with her backend CV.

**Starts on:** Log in page. **Done when:** Ravi Systems is on her
Applications list, and its page shows the job post and "CV v3 – backend".

**Features:** F1, F2, F3

| Step | Screen | The user… | The app… |
|---|---|---|---|
| 1 | Log in | taps "Create an account" | shows the Sign up form |
| 2 | Sign up | enters email and password, taps **Sign up** | creates the account, logs her in, shows an empty Applications list |
| 3 | CVs | opens **CVs**, adds "CV v3 – backend" and pastes its text | saves the version and lists it |
| 4 | Applications | adds Ravi Systems · Associate Software Engineer · 21 Sep 2026 | saves it at stage Applied and shows it at the top of the list |
| 5 | Application | taps Ravi Systems, pastes the job post, picks "CV v3 – backend", taps **Save** | saves both and shows "Saved" |

**States on each screen**

| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Sign up / Log in | Blank form | Button disabled while it submits | "That email already has an account." / "Email or password is wrong." The form keeps the email | Goes to Applications |
| CVs | "No CVs yet. Add the version you send to employers." | — | "Give this CV a name." / "Paste the CV text." | The new CV is at the top of the list |
| Applications | "No applications yet. Add your first one above." | — | "Company and role are both required." | The new application is at the top |
| Application | Job post box empty; CV picker shows "No CV chosen" with a link to add one | — | "That job post is too long (20,000 characters max)." | "Saved" |

**What could go wrong:** She closes the tab halfway through the form, and the
application is simply not saved, with nothing half-written. She has the list
open in two tabs and adds in both: both applications are saved (F1). Her
session expires: she's sent to Log in and then back to the page she wanted.

---

## Flow 2 · Follow up on silence

**Who and when:** Mahnoor, Monday morning, reading her digest and then
opening This Week.

**Starts on:** Monday digest or This Week. **Done when:** she has followed
up and the reminder is gone for another 7 days.

**Features:** F1, F2, F4

| Step | Screen | The user… | The app… |
|---|---|---|---|
| 1 | Monday digest | reads it | lists "Follow up: Margalla Tech · no reply for 35 days" below the week's interviews |
| 2 | This Week | opens it | shows a **Follow up** section under the upcoming next steps |
| 3 | This Week | sends the company an email herself, then taps **Followed up** | records today as the follow-up date and removes the row |
| 4 | This Week (7 days later) | opens it | Margalla Tech is back in the list if there's still no reply |

**States on each screen**

| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| This Week | "Nothing to follow up on. Nice." (next steps keep their own empty message) | — | Application not found (deleted in another tab): "That application no longer exists." The list reloads | The row disappears |
| Monday digest | The follow-up section is left out | — | — | Plain-text list |

**What could go wrong:** She taps **Followed up** twice (double tap). The
second tap changes nothing. She moves the application to Screening instead.
It leaves the follow-up list because there's now a reply.

---

## Flow 3 · Prepare for an interview

**Who and when:** Hira, on her laptop the night before her Ravi Systems
technical round (20 Oct 2026).

**Starts on:** This Week. **Done when:** she's reading 5 to 8 likely
questions, each quoting the job post and her CV.

**Features:** F1, F3, F5

| Step | Screen | The user… | The app… |
|---|---|---|---|
| 1 | This Week | taps "Ravi Systems · Tue 20 Oct" | opens the application |
| 2 | Application | taps **Prepare for interview** | disables the button and shows "Reading the job post and your CV… (up to 30 seconds)" |
| 3 | Interview prep | reads the questions | shows each question with "Why they'll ask" (a quote from the job post) and "Talk about" (a quote from her CV) |
| 4 | Interview prep | comes back an hour later | shows the saved prep instantly, with no new AI call |
| 5 | Interview prep | taps **Regenerate** after updating the job post | makes a new prep, which replaces the old one |

**States on each screen**

| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Application | No job post or CV yet: the button is disabled, with "Add the job post and the CV you sent first." | — | — | The button is enabled |
| Interview prep | No prep yet: only **Prepare for interview** | "Reading the job post and your CV… (up to 30 seconds)" | See F5 "When it fails": not set up, timed out, daily limit reached, no usable questions. Each one has a **Try again** button or explains what to fix | 5–8 questions with quotes, and when they were made |

**What could go wrong:** The AI takes longer than 30 seconds, so she sees
"That took too long. Try again." The AI makes up a quote, so the code drops
that question before she sees it. The job post contains "ignore your
instructions…", which is treated as text and never obeyed. She runs out of her
10 preps for the day and is told when they reset.
