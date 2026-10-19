# The MVP cut · JobTrail v1

Fourteen things users asked for, plus Zara's own complaints. You'll ship
three to five. Fill this in as a class.

## The rules

1. **Five features at most.** Every one costs you an agent run, tests,
   screens and a review in Sessions 5 to 8.
2. **One of them is the AI feature.** You'll build it in Session 7 and review
   it in Session 8.
3. **Demo Day test:** if you couldn't show it in a three-minute demo, it waits.
4. **Needs come with it.** If a feature can't work without another one, they
   count together. (Interview prep needs the job post saved somewhere.)
5. **"Later" is not "never".** Write down why something waits.

## The list

Score each row: **Value** (how many users, how much it hurts) and **Effort**
(how much has to change), each High / Medium / Low.

| # | Request | From | Value | Effort | Needed for Demo Day? | Verdict |
|---|---|---|---|---|---|---|
| 1 | Interview prep from the job post and my CV, with sources | Hira | High | High | Yes: the AI feature | **v1** ([F5](specs/features/F5-interview-prep.md)) |
| 2 | Logins, so nobody runs their own copy | Danish | High | High | Yes: needed by 1, 4 | **v1** ([F1](specs/features/F1-accounts.md)) |
| 3 | Follow-up reminders after a week of silence | Mahnoor | High | Low | Yes | **v1** ([F4](specs/features/F4-follow-up-reminders.md)) |
| 4 | Which CV did I send? | | Medium | Medium | Yes: needed by 1 | **v1** ([F3](specs/features/F3-job-post-and-cv.md)) |
| 5 | Salary range | | Medium | Low | No | later ([F7](specs/features/F7-salary.md)) |
| 6 | Import from Gmail | | Medium | High | No | never, for now ([F14](specs/features/F14-gmail-import.md)) |
| 7 | Rejection reasons | | Medium | Low | No | later ([F11](specs/features/F11-rejection-reasons.md)) |
| 8 | Works on my phone | everyone | High | Medium | Yes | **v1** ([F2](specs/features/F2-mobile-layout.md)) |
| 9 | Dark mode | | Low | Low | No | later ([F6](specs/features/F6-dark-mode.md)) |
| 10 | Stats: applications to interviews | | Medium | Medium | No | later ([F12](specs/features/F12-stats.md)) |
| 11 | Referrals | | Low | Low | No | later ([F8](specs/features/F8-referrals.md)) |
| 12 | Read-only link for a mentor | | Medium | Medium | No | later ([F13](specs/features/F13-mentor-share.md)) |
| 13 | Interviews in Google Calendar | | Medium | Low | No | later, first pick ([F10](specs/features/F10-calendar.md)) |
| 14 | Company notes | | Low | Low | No | later ([F9](specs/features/F9-company-notes.md)) |
| Z1 | Everyone runs their own copy | Zara | High | High | Yes | **v1**, with item 2 (F1) |
| Z2 | One JSON file; two tabs can overwrite each other | Zara | High | Medium | Yes | **v1**, with item 2 (F1) |
| Z3 | It's ugly | Zara | Medium | Medium | Yes | **v1**, with item 8 (F2) |

Verdict is **v1**, **later** or **never**.

## Questions to settle before you move on

- Does item 8 (phone) need its own spec, or is it a rule for every screen in
  Session 6?
- Items 2, Z1 and Z2 point at the same decision. What is it?
- What does the AI feature need that doesn't exist yet?
