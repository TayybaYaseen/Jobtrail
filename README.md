# JobTrail

Track your job applications: where you applied, what stage you're at, and
what's coming up next.

I built this during my own job hunt after graduating, mostly with an AI agent,
over a couple of weekends. A few friends from my batch asked for a copy, then
a few more. — Zara

## Run it

You need Node.js 22.12 or newer (Node 24 LTS works too).

```bash
npm install
npm run dev
```

Open http://localhost:3000

Your applications are saved in `data/jobtrail.json`, which starts with some
sample applications: replace them with your own. The tests use their own copy
in `tests/fixtures/`, so the app and the tests never touch each other's data.

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
days. Every Monday, each copy runs `npm run digest` on a schedule and emails
what it prints.

`npm run dev:demo` and `npm run digest:demo` pin today to 19 October 2026
(see `demo.env`), so the sample data always has a week ahead.

## API

- `GET /api/applications`
- `POST /api/applications`
- `POST /api/applications/:id/stage`
- `GET /api/this-week`
