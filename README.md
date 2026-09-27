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

Applications imported from LinkedIn keep LinkedIn's date text in
`applied_on_raw`. JobTrail reads it when it loads the file.

## API

- `GET /api/applications`
- `POST /api/applications`
- `POST /api/applications/:id/stage`
