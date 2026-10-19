# <!-- Product name --> · Agent instructions

<!--
This replaces the three-line CLAUDE.md you inherited from Zara. Most coding
agents read AGENTS.md. Because your repo has a CLAUDE.md, Claude Code reads
that file instead, so CLAUDE.md should now contain just this one line, which
pulls this file in:

    @AGENTS.md

Keep this file under about a page. Long files get skimmed, by agents too.
Delete these comments as you fill it in.
-->

<!-- One line: what the product is, and the stack. -->

## Commands

- Install: `npm install`
- Run: `npm run dev` (or `npm run dev:demo`, with "today" pinned to 19 Oct 2026)
- Test: `npm test`
- Lint: `npm run lint`

## How we work

- Every task comes from a feature spec in `specs/features/`. Read that spec,
  and `specs/00-product-brief.md`, before planning.
- If a task isn't covered by a spec, stop and ask. Don't guess.
- Never build anything listed under a spec's "Out of scope".
- Propose a plan and wait for approval before changing code.
- One feature per branch. Small commits.

## Conventions

<!-- What the agent can't work out by reading the code. A few from the
JobTrail lab, keep the ones that apply: -->

- Dates are midnight-UTC `Date` objects. Parse and format with `src/dates.js`;
  never with the local timezone.
- Dates from job sites keep the site's own format: LinkedIn is month first,
  Rozee.pk is day first.
- Failures the user should see throw `AppError(code, message, status)` from
  `src/errors.js`.
- Tests live in `tests/`, mirroring `src/`, and run on
  `tests/fixtures/sample.json`, never on real data.
- <!-- add yours -->

## AI feature rules

- The API key comes from the environment (`ANTHROPIC_API_KEY`), never from code.
- Never trust model output blindly: check its shape and its citations before
  showing it.
- Every call has a timeout and a cost ceiling.

## Never touch

- `data/jobtrail.json`: that's users' real data.
- <!-- add yours -->

## Done means

- Every acceptance criterion in the spec has a passing test.
- `npm test` and `npm run lint` pass.
- Only files the spec needs were changed.
