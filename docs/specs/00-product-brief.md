# Product brief · JobTrail

## In one sentence

JobTrail helps fresh grads in Pakistan track every job application, remember
to follow up, and prepare for each interview from the job post and the CV
they actually sent.

## Who it's for

**Hira, a final-year CS student on the job hunt.** She has 10 to 20
applications going at once on LinkedIn, Rozee.pk and company sites. She opens
JobTrail on her phone between classes to check what's coming up, and on her
laptop the night before an interview. She worries about two things: losing
track of a company that never replied, and walking into an interview without
knowing what they'll ask.

## The problem today

- **Everyone runs their own copy** (Zara, Danish). Each batchmate clones the
  repo and runs a server. Every update means everyone pulls again, and most
  don't.
- **Data gets lost.** Everything lives in one JSON file. With two tabs open,
  the second save overwrites the first (Zara).
- **Silence goes unnoticed.** Nothing tells you a company hasn't replied in a
  week, so follow-ups never happen (Mahnoor).
- **Nobody knows which CV they sent.** By the time the interview comes, the CV
  has been edited three times.
- **Interview prep is guesswork.** Hira pastes job posts into a chatbot and
  can't tell which answers are made up (Hira).
- **It's unusable on a phone, and it's ugly** (everyone, Zara).

## What v1 does

Numbered in build order: each feature only needs the ones above it.

| # | Feature | Needs | Spec |
|---|---|---|---|
| F1 | **Accounts and safe storage.** Sign up, log in, see only your own applications; every save is kept, even with two tabs open. | — | [F1-accounts.md](features/F1-accounts.md) |
| F2 | **Works on a phone.** A clean layout that's usable at 360px wide, which every later screen follows. | F1 | [F2-mobile-layout.md](features/F2-mobile-layout.md) |
| F3 | **Job post and CV on each application.** Keep CV versions, and record the job post and the CV you sent with each application. | F1, F2 | [F3-job-post-and-cv.md](features/F3-job-post-and-cv.md) |
| F4 | **Follow-up reminders.** This Week and the Monday digest list applications with no reply for 7 days. | F1, F2 | [F4-follow-up-reminders.md](features/F4-follow-up-reminders.md) |
| F5 | **Interview prep with sources (AI).** Likely questions and what to talk about, each one quoting the job post or CV it came from. | F1, F3 | [F5-interview-prep.md](features/F5-interview-prep.md) |

```
F1 Accounts & storage
 ├── F2 Mobile layout
 │    ├── F3 Job post & CV ──┐
 │    └── F4 Follow-ups      │
 └───────────────────────────┴── F5 Interview prep (AI)
```

## What v1 doesn't do

Every cut item has a spec ready for when it's picked up, numbered so that
each one only needs features above it.

| Cut | Spec | Needs | Why |
|---|---|---|---|
| Dark mode (wishlist 9) | [F6](features/F6-dark-mode.md) | F1, F2 | **Later.** It's easy once F2 puts colours in CSS variables, but it adds nothing to the demo. |
| Salary range and offer (5) | [F7](features/F7-salary.md) | F1, F3 | **Later.** Useful but not in the Demo Day story. It replaces the worked example. |
| Referrals (11) | [F8](features/F8-referrals.md) | F1, F3 | **Later.** For now it can go in the existing notes field. |
| Company notes (14) | [F9](features/F9-company-notes.md) | F1, F3 | **Later.** The notes field covers it for now. A page per company is a new screen nobody needs for the demo. |
| Interviews in Google Calendar (13) | [F10](features/F10-calendar.md) | F1, F2 | **Later, first pick after v1.** An "add event" link plus an `.ics` file needs no Google sign-in and is small. |
| Rejection reasons (7) | [F11](features/F11-rejection-reasons.md) | F1, F3 | **Later.** It's cheap to build, but it's only useful once someone has enough rejections to see patterns. |
| Stats: applications to interviews (10) | [F12](features/F12-stats.md) | F1, F11 | **Later.** It needs a stage history that v1 doesn't keep, and weeks of real use to mean anything. |
| Read-only link for a mentor (12) | [F13](features/F13-mentor-share.md) | F1, F2 | **Later.** Public links to private data need care: tokens, revoking, hiding private fields. |
| Import from Gmail (6) | [F14](features/F14-gmail-import.md) | F1, F3 | **Never, for now.** Gmail access is a restricted Google scope (verification plus a yearly security assessment), and holding inbox tokens is a privacy risk. The gain is small: adding an application by hand takes 10 seconds. |
| Password reset, email verification, "Log in with Google" | **Later.** Not needed for a class demo. They're listed in F1's out of scope. |
| Deploying to a public server | **Session 9.** F1 makes one shared server possible. Actually hosting it comes later. |

## What success looks like at Demo Day

On her phone, Hira signs up and adds her Ravi Systems application with the job
post and "CV v3 – backend" attached. This Week shows a reminder to follow up
with Margalla Tech, which hasn't replied in a month. On a laptop she opens
Ravi Systems, taps **Prepare for interview**, and in under 30 seconds gets
six likely questions. Each question quotes the line of the job post it comes
from and the line of her CV she should talk about.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Server | Node 22 + Express 5 (as today) | It already works, and the agent knows it well. |
| Pages | EJS, plain CSS, a few lines of browser JS at most | No build step. Every page works without JavaScript. |
| Data | SQLite via `better-sqlite3`, one file in `data/` | Each save writes one row, so two tabs can't overwrite each other's work. It's still one file with no server to run. Boring and well documented. |
| Auth | Email + password, hashed with Node's `crypto.scrypt`; session cookie with the sessions kept in SQLite | No new auth service, and no OAuth app to register. |
| AI model | Claude Sonnet 5.5 (`claude-sonnet-5-5`) via `@anthropic-ai/sdk` | Good enough at quoting accurately, and cheaper and faster than Opus for a student budget. |
| Tests | Vitest + Supertest (as today); the AI is mocked in unit tests and checked against an eval set | It's what the repo already uses. |

Revisit later: where the app runs once we deploy it, and backups of the
SQLite file (Session 9). Also whether to accept CV uploads as PDFs instead of
pasted text.

## Open questions

- [ ] Is item 8 (phone) its own spec or a rule for every screen? **Our answer:
  both.** F2 is a one-time restyle with its own spec. After that, "works at
  360px" is a rule in `AGENTS.md`.
- [ ] Items 2, Z1 and Z2 are one decision: **one shared server with accounts
  and a real database**, instead of a JSON file per person. Is SQLite enough,
  or do we need Postgres when we deploy?
- [ ] What happens to Zara's existing `data/jobtrail.json`? (Proposal: a
  one-off import into her account. See F1.)
- [ ] Who pays for the AI calls, and what's the daily limit per user? (F5
  proposes 10 preps a day.)
