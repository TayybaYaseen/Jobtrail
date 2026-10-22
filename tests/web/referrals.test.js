// F8 · Referrals. One test (or more) per acceptance criterion and edge case.

import request from "supertest";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app.js";
import { getDb } from "../../src/db.js";
import { utcDate } from "../../src/dates.js";
import { describeThankYou } from "../../src/formatting.js";
import { signUp } from "../../src/services/accounts.js";
import { addApplication, getApplication, moveStage } from "../../src/services/applications.js";
import { parseReferrer, referrals, thankYous } from "../../src/services/referrals.js";
import { logIn, testUserId } from "../helpers.js";

// In sample.json: Gwadar Cloud is at Offer, Margalla Tech at Applied, Ravi Systems at Interview.
const GWADAR = 1;
const MARGALLA = 2;
const RAVI = 3;

const row = (id) =>
  getDb()
    .prepare("SELECT referrer_name, referrer_how, referrer_contact, referrer_thanked_on FROM applications WHERE id = ?")
    .get(id);

/** Saves the application page form the way the browser does. */
function save(tab, id, fields) {
  return tab.post(`/applications/${id}`).type("form").send({ job_post: "", cv_id: "", ...fields });
}

const refer = (tab, id, name, how = "", contact = "") =>
  save(tab, id, { referrer_name: name, referrer_how: how, referrer_contact: contact });

const thank = (tab, id, back = "/referrals") => tab.post(`/applications/${id}/thanked`).type("form").send({ back });

/** The Referrals page's rows, as text with the tags taken out. */
async function referralRows(tab) {
  const html = (await tab.get("/referrals")).text;
  return (html.match(/<li class="referral-row">[\s\S]*?<\/li>/g) ?? []).map((li) =>
    li.replace(/<form[\s\S]*?<\/form>/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
}

/** The card for one company on the Applications page. */
async function card(tab, company) {
  const html = (await tab.get("/")).text;
  return html.match(/<li class="app-card">[\s\S]*?<\/li>/g).find((c) => c.includes(`>${company}<`));
}

async function sayThanks(tab) {
  const html = (await tab.get("/this-week")).text;
  return (html.match(/<li class="follow-up">\s*<span>[^<]*<\/span>\s*<form method="post" action="\/applications\/\d+\/thanked">/g) ?? []).map(
    (li) => li.match(/<span>([^<]*)<\/span>/)[1],
  );
}

describe("1. the application page saves a referrer", () => {
  test("name, how I know them and a contact are saved, and shown again", async () => {
    const tab = await logIn();
    const r = await refer(tab, RAVI, "Ahmed Khan", "University senior", "ahmed@example.com");
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe(`/applications/${RAVI}?saved=1`);
    expect(row(RAVI)).toEqual({
      referrer_name: "Ahmed Khan",
      referrer_how: "University senior",
      referrer_contact: "ahmed@example.com",
      referrer_thanked_on: null,
    });
    const page = (await tab.get(`/applications/${RAVI}`)).text;
    expect(page).toContain('<legend>Referred by</legend>');
    expect(page).toContain('<label>Name <input name="referrer_name" value="Ahmed Khan"></label>');
    expect(page).toContain('<label>How I know them (optional) <input name="referrer_how" value="University senior"></label>');
    expect(page).toContain('<label>Contact (optional) <input name="referrer_contact" value="ahmed@example.com"></label>');
  });

  test("only a name is fine; spaces around it are trimmed", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "  Ahmed Khan  ");
    expect(row(RAVI)).toMatchObject({ referrer_name: "Ahmed Khan", referrer_how: null, referrer_contact: null });
  });

  test("a form without the referrer fields leaves the referrer as it is", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "A post", cv_id: "" });
    expect(row(RAVI).referrer_name).toBe("Ahmed Khan");
  });

  test("someone else's application is a 404 and isn't changed", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    const theirs = addApplication(bilal, "Bilal's Co", "Dev", utcDate(2026, 10, 1)).id;
    const tab = await logIn();
    expect((await refer(tab, theirs, "Ahmed Khan")).status).toBe(404);
    expect((await thank(tab, theirs)).status).toBe(404);
    expect(row(theirs).referrer_name).toBeNull();
  });
});

describe("2. the card shows who referred me", () => {
  test("Referred by Ahmed Khan, on the card and the application page", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    expect(await card(tab, "Ravi Systems")).toContain('<p class="referral">Referred by Ahmed Khan</p>');
    expect((await tab.get(`/applications/${RAVI}`)).text).toContain('<p class="referral">Referred by Ahmed Khan</p>');
  });

  test("a name is shown as text, not HTML", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "<b>Ahmed</b>");
    expect(await card(tab, "Ravi Systems")).toContain("Referred by &lt;b&gt;Ahmed&lt;/b&gt;");
  });
});

describe("3. the Referrals page", () => {
  test("is in the nav, and says so when there are none", async () => {
    const tab = await logIn();
    const html = (await tab.get("/referrals")).text;
    expect(html.match(/<nav[\s\S]*?<\/nav>/)[0]).toContain('<a href="/referrals" aria-current="page">Referrals</a>');
    expect(html).toContain("No referrals yet.");
  });

  test("lists name, company, stage and whether I've thanked them, not-yet-thanked first", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan", "University senior");
    await refer(tab, GWADAR, "Sana Malik", "", "0300 1234567");
    await refer(tab, MARGALLA, "Bilal Raza");
    await thank(tab, GWADAR);
    expect(await referralRows(tab)).toEqual([
      "Ahmed Khan Ravi Systems · Interview University senior Not thanked yet",
      "Bilal Raza Margalla Tech · Applied Not thanked yet",
      "Sana Malik Gwadar Cloud · Offer 0300 1234567 Thanked 19 Oct",
    ]);
    const html = (await tab.get("/referrals")).text;
    expect(html).toContain(`<a href="/applications/${RAVI}">Ravi Systems</a>`);
  });

  test("needs a login", async () => {
    expect((await request(app).get("/referrals")).headers.location).toBe("/login?next=%2Freferrals");
  });
});

describe("4. Thanked", () => {
  test("saves today and moves the row down, showing Thanked 19 Oct", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    await refer(tab, MARGALLA, "Bilal Raza");
    expect((await referralRows(tab))[0]).toMatch(/^Ahmed Khan/);

    const r = await thank(tab, RAVI);
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe("/referrals");
    expect(row(RAVI).referrer_thanked_on).toBe("2026-10-19"); // today is pinned to 19 Oct 2026
    const rows = await referralRows(tab);
    expect(rows[0]).toMatch(/^Bilal Raza .* Not thanked yet$/);
    expect(rows[1]).toMatch(/^Ahmed Khan .* Thanked 19 Oct$/);
  });

  test("thanked rows are newest thank-you first", () => {
    const app = (name, thankedOn) => ({ company: "Co", stage: "applied", referrer: { name, thankedOn } });
    const order = referrals([app("A", utcDate(2026, 10, 1)), app("B", utcDate(2026, 10, 18)), app("C", null)]);
    expect(order.map((a) => a.referrer.name)).toEqual(["C", "B", "A"]);
  });

  test("from This Week it goes back to This Week; an unknown page goes to Referrals", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    expect((await thank(tab, RAVI, "/this-week")).headers.location).toBe("/this-week");
    expect((await thank(tab, RAVI, "https://evil.example")).headers.location).toBe("/referrals");
    expect((await thank(tab, RAVI, "constructor")).headers.location).toBe("/referrals");
  });
});

describe("5. This Week says to tell the referrer about news", () => {
  test("a referred application at Interview: Tell Ahmed Khan about Ravi Systems: you reached Interview.", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    expect(await sayThanks(tab)).toEqual(["Tell Ahmed Khan about Ravi Systems: you reached Interview."]);
    expect((await tab.get("/this-week")).text).toContain('<h2 class="section-heading">Say thanks</h2>');
  });

  test("Offer and Rejected too, but not Applied or Screening", async () => {
    const tab = await logIn();
    await refer(tab, GWADAR, "Sana Malik"); // Offer
    await refer(tab, MARGALLA, "Bilal Raza"); // Applied
    await refer(tab, 5, "Hina Shah"); // Lahore Logic, Screening
    expect(await sayThanks(tab)).toEqual(["Tell Sana Malik about Gwadar Cloud: you reached Offer."]);
    moveStage(testUserId(), MARGALLA, "rejected");
    expect(await sayThanks(tab)).toContain("Tell Bilal Raza about Margalla Tech: the answer was no.");
  });

  test("thanking takes it off; a later move to a new stage brings it back", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    await thank(tab, RAVI, "/this-week");
    expect(await sayThanks(tab)).toEqual([]);
    expect((await tab.get("/this-week")).text).not.toContain("Say thanks");

    process.env.JOBTRAIL_TODAY = "2026-10-21";
    moveStage(testUserId(), RAVI, "offer");
    expect(await sayThanks(tab)).toEqual(["Tell Ahmed Khan about Ravi Systems: you reached Offer."]);
  });

  test("thanked before the stage changed still counts as not thanked since", () => {
    const app = {
      company: "Ravi Systems",
      stage: "interview",
      appliedOn: utcDate(2026, 9, 21),
      lastChangedOn: utcDate(2026, 10, 15),
      referrer: { name: "Ahmed Khan", thankedOn: utcDate(2026, 10, 10) },
    };
    expect(thankYous([app])).toHaveLength(1);
    expect(thankYous([{ ...app, referrer: { ...app.referrer, thankedOn: utcDate(2026, 10, 15) } }])).toHaveLength(0);
    expect(describeThankYou(app)).toBe("Tell Ahmed Khan about Ravi Systems: you reached Interview.");
  });
});

describe("6. one person, two companies", () => {
  test("shows as two rows", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    await refer(tab, GWADAR, "Ahmed Khan");
    const rows = await referralRows(tab);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/^Ahmed Khan Gwadar Cloud/);
    expect(rows[1]).toMatch(/^Ahmed Khan Ravi Systems/);
    await thank(tab, RAVI);
    expect(row(GWADAR).referrer_thanked_on).toBeNull(); // thanking one doesn't thank the other
  });
});

describe("7. no referrer, no referral line", () => {
  test("nothing on the cards, the application page, Referrals or This Week", async () => {
    const tab = await logIn();
    expect((await tab.get("/")).text).not.toMatch(/Referred by|class="referral"/);
    expect((await tab.get(`/applications/${RAVI}`)).text).not.toMatch(/Referred by [^<]|class="referral"/);
    expect(await referralRows(tab)).toEqual([]);
    const week = (await tab.get("/this-week")).text;
    expect(week).not.toContain("Say thanks");
    expect(week).not.toContain("Tell ");
    expect(getApplication(testUserId(), RAVI).referrer).toBeNull();
  });
});

describe("edge cases", () => {
  test("a contact (or how I know them) with no name: Add the person's name.", async () => {
    const tab = await logIn();
    for (const fields of [{ referrer_contact: "0300 1234567" }, { referrer_how: "Teacher" }, { referrer_name: "   ", referrer_contact: "x" }]) {
      const r = await save(tab, RAVI, { referrer_name: "", referrer_how: "", referrer_contact: "", ...fields, job_post: "Not saved" });
      expect(r.status).toBe(400);
      expect(r.text).toContain("Add the person&#39;s name.");
      expect(r.text).toContain(`value="${fields.referrer_contact ?? ""}"`); // keeps what I typed
    }
    expect(row(RAVI).referrer_contact).toBeNull();
    expect(getApplication(testUserId(), RAVI).jobPost).toBeNull(); // the error saves nothing
  });

  test("a name over 100 characters: Keep the name under 100 characters.", async () => {
    const tab = await logIn();
    const r = await refer(tab, RAVI, "A".repeat(101));
    expect(r.status).toBe(400);
    expect(r.text).toContain("Keep the name under 100 characters.");
    expect(row(RAVI).referrer_name).toBeNull();
    expect(parseReferrer("A".repeat(100), "", "").name).toHaveLength(100);
  });

  test("removing the referrer takes it off Referrals and This Week", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan", "Senior", "x");
    await thank(tab, RAVI);
    await refer(tab, RAVI, "", "", "");
    expect(row(RAVI)).toEqual({ referrer_name: null, referrer_how: null, referrer_contact: null, referrer_thanked_on: null });
    expect(await referralRows(tab)).toEqual([]);
    expect(await sayThanks(tab)).toEqual([]);
    expect(await card(tab, "Ravi Systems")).not.toContain("Referred by");
  });

  test("Thanked on a removed referral says so", async () => {
    const tab = await logIn();
    const r = await thank(tab, RAVI);
    expect(r.status).toBe(404);
    expect(r.text).toContain("That referral no longer exists.");
    expect(r.text).toContain("<h1>Referrals</h1>");
  });

  test("thanked twice: the date moves to the latest", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    await thank(tab, RAVI);
    process.env.JOBTRAIL_TODAY = "2026-10-23";
    await thank(tab, RAVI);
    expect(row(RAVI).referrer_thanked_on).toBe("2026-10-23");
    expect((await referralRows(tab))[0]).toMatch(/Thanked 23 Oct$/);
  });

  test("editing how I know them keeps the thank-you; a different person starts unthanked", async () => {
    const tab = await logIn();
    await refer(tab, RAVI, "Ahmed Khan");
    await thank(tab, RAVI);
    await refer(tab, RAVI, "Ahmed Khan", "Senior at FAST");
    expect(row(RAVI).referrer_thanked_on).toBe("2026-10-19");
    await refer(tab, RAVI, "Sana Malik");
    expect(row(RAVI).referrer_thanked_on).toBeNull();
  });
});
