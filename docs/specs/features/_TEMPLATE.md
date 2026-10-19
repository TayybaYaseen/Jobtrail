# F<!-- n --> · <!-- Feature name -->

**Status:** draft <!-- draft → ready for tickets (Session 5) -->
**Brief:** [00-product-brief.md](../00-product-brief.md) · **Flow:** <!-- which flow uses it -->

## Context

<!-- Why this feature exists, in two or three sentences. Then what already
exists in the code that it builds on: file names, functions, data. The agent
reads this first. -->

## User story

As a <!-- who -->, I want <!-- what -->, so that <!-- why -->.

## Acceptance criteria

<!--
Each one is a fact someone can check, one at a time. In Session 5 every
criterion becomes a failing test, so if you can't imagine the test, rewrite
the criterion.

Given <a starting situation>, when <the user does something>, then <what is
true afterwards>.
-->

1. **Given** …, **when** …, **then** ….
2. **Given** …, **when** …, **then** ….
3. **Given** …, **when** …, **then** ….

## Out of scope

<!-- What this feature deliberately does NOT do, even though it sounds
related. The agent will try to add these if you don't write them down. -->

-

## Edge cases

<!-- The odd inputs and situations, each with the behaviour you want. -->

| Situation | What should happen |
|---|---|
| | |

## For AI features only: what "done" means

<!--
The output is different every run, so "done" can't be one exact answer.
Split it in two.
-->

**Always true (code can check it every run):**

- <!-- e.g. "Every citation points to a passage that exists in the job post or CV." -->

**Judged against examples (an eval set):**

| Input | A good answer must… | A good answer must not… |
|---|---|---|
| | | |

**When it fails:** <!-- no API key, the model is down, nothing relevant in
the documents: what the user sees in each case -->

**Cost and speed:** <!-- model, a ceiling per request or per day, how long a
user waits -->

## Open questions

- [ ]

## Done means

- [ ] Every acceptance criterion has a passing test.
- [ ] Nothing from "Out of scope" was built.
- [ ] `npm test` and `npm run lint` pass.
- [ ] <!-- anything specific to this feature -->
