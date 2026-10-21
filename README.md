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

## API

- `GET /api/applications`
- `POST /api/applications`
- `GET /api/applications/:id` (with `job_post` and `cv`)
- `POST /api/applications/:id/stage`
- `GET /api/this-week`
- `GET /api/follow-ups` (each with `days_silent`)
