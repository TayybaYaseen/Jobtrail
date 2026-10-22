# JobTrail

Track your job applications: where you applied, what stage you're at, and
what's coming up next.

I built this during my own job hunt after graduating, mostly with an AI agent,
over a couple of weekends. A few friends from my batch asked for a copy, then
a few more. Thirty of us use it now. — Zara

**October 2026:** Zara has started a new job and handed JobTrail over. The
Session 3 cohort maintains it now. See `TICKETS.md` and `HANDOUT.md`.
Everything users have asked for is in `docs/WISHLIST.md`.

## Run it

You need Node.js 22.12 or newer (Node 24 LTS works too).

```bash
npm install
npm run dev
```

Open http://localhost:3000

Sign up with an email and a password (8 or more characters). Everyone shares
one JobTrail, and each person sees only their own applications. Accounts and
applications are saved in a SQLite database, `data/jobtrail.db`
(`JOBTRAIL_DB` points it somewhere else). The tests use their own temporary
database, so the app and the tests never touch each other's data.

### Moving an old `data/jobtrail.json` into your account

Older versions kept everything in `data/jobtrail.json`. Sign up first, then:

```bash
npm run import-json -- --email you@example.com --file data/jobtrail.json
```

It copies every application, with the same dates, stages and notes, and only
reads the file. It refuses if your account already has applications.

## Check it

```bash
npm test        # Vitest
npm run lint    # ESLint
```

## Importing from job sites

Applications imported from LinkedIn or Rozee.pk keep the site's own date
text in `applied_on_raw`. JobTrail reads it when it loads the file.

- LinkedIn exports dates month first: `10/07/2026` is 7 October.
- Rozee.pk exports dates day first, like we write them here: `09/10/2026` is
  9 October.

## This week

`/this-week` lists interviews, screens and offer deadlines in the next seven
days. Under them, **Follow up** lists applications still at Applied with no
news for 7 days or more, longest silence first. Tap **Followed up** after you
email the company, and it's back in 7 days if they still haven't replied.

The Monday digest prints the same thing for one account, from the database:

```
npm run digest -- --email hira@example.com
```

`npm run dev:demo` and `npm run digest:demo -- --email …` pin today to 19
October 2026 (see `demo.env`), so the sample data always has a week ahead.

## Interview prep

On an application with a job post and the CV you sent, tap **Prepare for
interview**. In up to 30 seconds you get 5 to 8 likely questions. Each one
quotes the line of the job post it comes from (*Why they'll ask*) and the line
of your CV to talk about (*Talk about*). JobTrail checks every quote word for
word against the two documents and drops any question it can't find, so
nothing shown is made up. The prep is saved: opening it again makes no new AI
call. **Regenerate** makes a new one. Everyone gets 10 preps a day.

It calls Claude (`claude-sonnet-5-5`) and needs an API key on the server:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Without the key the button is disabled and says so. The tests never call the
API. To check the prompt against the five example job posts and CVs in
`tests/fixtures/prep/` with the real API (5 calls, a few cents):

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run eval:prep
```

## Salary

On an application's page, note the advertised monthly range in rupees
(minimum, maximum or both; `80,000` and `80000` both work). At stage
**Offer** there's also the monthly amount offered. The card then shows, say,
**Salary** Rs 80,000 – 120,000 and **Offer** Rs 110,000 (within range), or
(below range) / (above range). If the stage moves on from Offer, the amount
is kept but hidden, and comes back if the stage returns to Offer. An offer's
deadline is its **Next step date**.

## Dark mode

**Settings** has a theme: **Auto** (the default) follows your phone or
computer, or pick **Light** or **Dark**. It's saved on your account, so every
device you log in from uses it. Log in and Sign up always follow the device.
The server puts the theme on `<html data-theme="…">` in the page it sends,
so there's no white flash first, and printing is always light. Both themes'
colours are the variables at the top of `public/styles.css`; the contrast
of each text and background pair is checked by `npm test`.

## API

- `GET /api/applications` (each with `salary_min`, `salary_max` and `salary_offered`: monthly rupees or `null`; `salary_offered` is `null` unless the stage is Offer)
- `POST /api/applications`
- `GET /api/applications/:id` (with `job_post` and `cv`)
- `POST /api/applications/:id/stage`
- `GET /api/this-week`
- `GET /api/follow-ups` (each with `days_silent`)
- `POST /api/applications/:id/prep` makes an interview prep: `{ questions: [{ question, why: { quote }, talk_about: { quote } }], created_on }`
