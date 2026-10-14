# Open tickets

> Hi all. I started my new job this week and honestly have no time for
> JobTrail any more. Your instructor asked if your cohort could take it over,
> so: it's yours! These three came in from batchmates since my last update.
> I copied the entries from each report into the sample data and the test
> fixtures (plus one Rozee.pk import of my own), and added a failing test for
> each, so you can see it break. Sorry, and good luck. — Zara

---

## #101 · "This week" page shows Internal Server Error

**From Hira:** Since I moved Indus Analytics to *Interview*, the This Week page
just says *Internal Server Error*. They haven't given me a date yet, so I left
the date empty. The Applications page still works.

Test: `ticket #101` in `tests/web/pages.test.js`

---

## #102 · The Monday digest never arrived

**From Danish:** I updated my copy on Friday to get the new Monday digest.
It's set to run every Monday morning:

```
npm run digest
```

Monday came, no email. The website itself works fine, which is the strange
part.

Test: `ticket #102` in `tests/scripts/weekly-digest.test.js`

---

## #103 · My newest application isn't at the top

**From Mahnoor:** I applied to Thar Digital on Friday through Rozee.pk. The
list is supposed to show the newest application first, but Thar Digital is
near the bottom.

Test: `ticket #103` in `tests/services/applications.test.js`
