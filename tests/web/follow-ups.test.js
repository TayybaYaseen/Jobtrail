// F4 · Follow-up reminders. One test (or more) per acceptance criterion.
// Today is pinned to Mon 19 Oct 2026 (JOBTRAIL_TODAY). Criterion 8 (the digest) is in
// tests/scripts/weekly-digest.test.js.
//
// In the sample data, three applications are still at Applied and were never changed:
// Margalla Tech (2, applied 14 Sep), Sindh Softworks (6, 8 Oct) and Thar Digital (8, 9 Oct).

import request from "supertest";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app.js";
import { getDb } from "../../src/db.js";
import { addApplication } from "../../src/services/applications.js";
import { signUp } from "../../src/services/accounts.js";
import { utcDate } from "../../src/dates.js";
import { STAGES } from "../../src/models.js";
import { logIn } from "../helpers.js";

const MARGALLA = 2;
const NOTHING = "Nothing to follow up on. Nice.";

const row = (id) => getDb().prepare("SELECT stage, last_changed_on, followed_up_on FROM applications WHERE id = ?").get(id);
const set = (id, fields) => {
  const cols = Object.keys(fields).map((k) => `${k} = @${k}`).join(", ");
  getDb().prepare(`UPDATE applications SET ${cols} WHERE id = @id`).run({ ...fields, id });
};
const onDay = (iso) => (process.env.JOBTRAIL_TODAY = iso);

/** The Follow up section of This Week, as text lines. */
async function followUpSection(tab) {
  const html = (await tab.get("/this-week")).text;
  const section = html.slice(html.indexOf("<h2 class=\"section-heading\">Follow up</h2>"));
  return section;
}
const followUpLines = (section) => [...section.matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1]);

describe("1. silence for 7 days or more is listed", () => {
  test("Margalla Tech, applied 14 Sep and never changed: 'no reply for 35 days'", async () => {
    const section = await followUpSection(await logIn());
    expect(section).toContain("Margalla Tech · no reply for 35 days");
    expect(section).toContain('action="/applications/2/followed-up"');
    expect(section).toContain(">Followed up</button>");
  });

  test("last changed on 12 Oct: listed, counting from the change, not the applied date", async () => {
    set(MARGALLA, { last_changed_on: "2026-10-12" });
    expect(await followUpSection(await logIn())).toContain("Margalla Tech · no reply for 7 days");
  });
});

describe("2. six days of silence is not listed", () => {
  test("last changed on 13 Oct", async () => {
    set(MARGALLA, { last_changed_on: "2026-10-13" });
    expect(await followUpSection(await logIn())).not.toContain("Margalla Tech");
  });
});

describe("3. only Applied is ever listed", () => {
  test.each(STAGES.filter((s) => s !== "applied"))("%s: a reply has come", async (stage) => {
    set(MARGALLA, { stage }); // still silent since 14 Sep
    expect(await followUpSection(await logIn())).not.toContain("Margalla Tech");
  });
});

describe("4. tapping Followed up", () => {
  test("saves today, and it's gone until 7 more days of silence (26 Oct)", async () => {
    const tab = await logIn();
    const r = await tab.post(`/applications/${MARGALLA}/followed-up`);
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe("/this-week");
    expect(row(MARGALLA).followed_up_on).toBe("2026-10-19");
    expect(await followUpSection(tab)).not.toContain("Margalla Tech");

    onDay("2026-10-25");
    expect(await followUpSection(tab)).not.toContain("Margalla Tech");
    onDay("2026-10-26");
    expect(await followUpSection(tab)).toContain("Margalla Tech · no reply for 7 days");
  });

  test("tapped twice: the second tap changes nothing", async () => {
    const tab = await logIn();
    await tab.post(`/applications/${MARGALLA}/followed-up`);
    onDay("2026-10-20"); // the old page is still open the next day
    const again = await tab.post(`/applications/${MARGALLA}/followed-up`);
    expect(again.status).toBe(303);
    expect(row(MARGALLA).followed_up_on).toBe("2026-10-19");
  });

  test("an application that isn't due can't be marked", async () => {
    const tab = await logIn();
    await tab.post("/applications/3/followed-up"); // Ravi Systems, at Interview
    expect(row(3).followed_up_on).toBeNull();
  });
});

describe("5. adding or changing stage sets the last-changed date to today", () => {
  test("adding, from the page and from the API", async () => {
    const tab = await logIn();
    await tab.post("/applications").type("form").send({ company: "Page Co", role: "Dev", applied_on: "2026-10-01" });
    const api = await tab.post("/api/applications").send({ company: "Api Co", role: "Dev", applied_on: "2026-10-01" });
    for (const company of ["Page Co", "Api Co"]) {
      expect(getDb().prepare("SELECT last_changed_on FROM applications WHERE company = ?").get(company).last_changed_on).toBe("2026-10-19");
    }
    expect(api.status).toBe(201);
    // applied 18 days ago, but just added: not a follow-up yet
    expect(await followUpSection(tab)).not.toContain("Page Co");
  });

  test("a new stage sets it; saving the same stage with a new date doesn't", async () => {
    const tab = await logIn();
    await tab.post(`/applications/${MARGALLA}/stage`).type("form").send({ stage: "applied", next_step_on: "2026-10-30" });
    expect(row(MARGALLA).last_changed_on).toBeNull();

    await tab.post(`/applications/${MARGALLA}/stage`).type("form").send({ stage: "screening", next_step_on: "" });
    expect(row(MARGALLA)).toMatchObject({ stage: "screening", last_changed_on: "2026-10-19" });

    onDay("2026-10-21");
    await tab.post(`/api/applications/${MARGALLA}/stage`).send({ stage: "applied" }); // moved back by mistake
    expect(row(MARGALLA).last_changed_on).toBe("2026-10-21");
  });
});

describe("6. applications from before this feature", () => {
  test("have no last-changed date, so the applied date is used", async () => {
    expect(row(MARGALLA).last_changed_on).toBeNull();
    const r = await (await logIn()).get("/api/follow-ups");
    expect(r.body.find((f) => f.id === MARGALLA).days_silent).toBe(35); // 14 Sep → 19 Oct
  });
});

describe("7. longest silence first", () => {
  test("on the page and in the API", async () => {
    const tab = await logIn();
    expect(followUpLines(await followUpSection(tab))).toEqual([
      "Margalla Tech · no reply for 35 days",
      "Sindh Softworks · no reply for 11 days",
      "Thar Digital · no reply for 10 days",
    ]);
  });
});

describe("9. GET /api/follow-ups", () => {
  test("returns the same list, each with days_silent", async () => {
    const r = await (await logIn()).get("/api/follow-ups");
    expect(r.status).toBe(200);
    expect(r.body.map((f) => [f.company, f.days_silent])).toEqual([
      ["Margalla Tech", 35],
      ["Sindh Softworks", 11],
      ["Thar Digital", 10],
    ]);
    expect(r.body[0]).toMatchObject({ id: MARGALLA, stage: "applied", applied_on: "2026-09-14" });
  });

  test("needs a login, and shows only my applications", async () => {
    expect((await request(app).get("/api/follow-ups")).status).toBe(401);
    const bilal = signUp("bilal@example.com", "bilal-password");
    const theirs = addApplication(bilal, "Bilal's Secret Co", "Engineer", utcDate(2026, 9, 1)).id;
    set(theirs, { last_changed_on: null });
    const r = await (await logIn()).get("/api/follow-ups");
    expect(r.body.map((f) => f.company)).not.toContain("Bilal's Secret Co");
  });
});

describe("10. nothing to follow up on", () => {
  test("says 'Nothing to follow up on. Nice.', and the next steps keep their own list", async () => {
    for (const id of [2, 6, 8]) set(id, { stage: "rejected" });
    const html = (await (await logIn()).get("/this-week")).text;
    expect(html).toContain(NOTHING);
    expect(html).toContain("Ravi Systems"); // next steps are still there
  });

  test("with follow-ups, the message isn't shown", async () => {
    expect((await (await logIn()).get("/this-week")).text).not.toContain(NOTHING);
  });
});

describe("edge cases", () => {
  test("a future applied date is never listed", async () => {
    set(MARGALLA, { applied_on: "2026-12-01", last_changed_on: "2026-09-01" });
    expect(await followUpSection(await logIn())).not.toContain("Margalla Tech");
  });

  test("followed up, then 7+ days pass: listed again, counting from the follow-up", async () => {
    const tab = await logIn();
    await tab.post(`/applications/${MARGALLA}/followed-up`);
    onDay("2026-11-02");
    expect(await followUpSection(tab)).toContain("Margalla Tech · no reply for 14 days");
  });

  test("deleted in another tab: 'That application no longer exists.' and the list reloads", async () => {
    const tab = await logIn();
    getDb().prepare("DELETE FROM applications WHERE id = ?").run(MARGALLA);
    const r = await tab.post(`/applications/${MARGALLA}/followed-up`);
    expect(r.status).toBe(404);
    expect(r.text).toContain("That application no longer exists.");
    expect(r.text).not.toContain("Margalla Tech");
    expect(r.text).toContain("Sindh Softworks · no reply for 11 days");
  });

  test("someone else's application looks the same, and isn't touched", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    const theirs = addApplication(bilal, "Bilal's Secret Co", "Engineer", utcDate(2026, 9, 1)).id;
    set(theirs, { last_changed_on: null });
    const r = await (await logIn()).post(`/applications/${theirs}/followed-up`);
    expect(r.status).toBe(404);
    expect(r.text).toContain("That application no longer exists.");
    expect(row(theirs).followed_up_on).toBeNull();
  });

  test("needs a login", async () => {
    const r = await request(app).post(`/applications/${MARGALLA}/followed-up`);
    expect(r.status).toBe(302);
    expect(row(MARGALLA).followed_up_on).toBeNull();
  });
});
