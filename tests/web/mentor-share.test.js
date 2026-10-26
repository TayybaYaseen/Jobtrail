// F13 · Read-only link for a mentor. One test (or more) per acceptance criterion and edge case.

import request from "supertest";
import { afterEach, describe, expect, test, vi } from "vitest";
import { app } from "../../src/app.js";
import { getDb } from "../../src/db.js";
import { utcDate } from "../../src/dates.js";
import { niceDate, stageLabel } from "../../src/formatting.js";
import { signUp } from "../../src/services/accounts.js";
import { addApplication, listApplications, newestFirst } from "../../src/services/applications.js";
import { companySlug } from "../../src/services/companies.js";
import { addCv } from "../../src/services/cvs.js";
import { allowShareRequest, createLink, openLink, REQUESTS_PER_MINUTE } from "../../src/services/sharing.js";
import { logIn, TEST_EMAIL, testUserId } from "../helpers.js";

// In sample.json: Gwadar Cloud is at Offer, Ravi Systems at Interview.
const GWADAR = 1;
const RAVI = 3;

afterEach(() => vi.useRealTimers());

/** Taps Create link (or Create new link) and returns the link's path, /share/<token>. */
async function createLinkAs(tab) {
  expect((await tab.post("/sharing/link")).status).toBe(303);
  const html = (await tab.get("/sharing")).text;
  return new URL(html.match(/<input id="share-link" value="([^"]+)" readonly>/)[1]).pathname;
}

/** The shared page's cards as [company, role, stage, applied, next step]. */
function sharedRows(html) {
  return (html.match(/<li class="app-card">[\s\S]*?<\/li>/g) ?? []).map((li) => {
    const text = (re) => li.match(re)[1];
    return [text(/<h2>([^<]*)<\/h2>/), text(/class="role">([^<]*)</), text(/class="stage">([^<]*)</),
      text(/<dt>Applied<\/dt><dd>([^<]*)</), text(/<dt>Next step<\/dt><dd>([^<]*)</)];
  });
}

describe("1. Create link", () => {
  test("gives a /share/<token> link with at least 32 random bytes, and a Copy button", async () => {
    const tab = await logIn();
    const before = (await tab.get("/sharing")).text;
    expect(before).toContain("<button>Create link</button>");
    expect(before).not.toContain("share-link");

    const link = await createLinkAs(tab);
    expect(link).toMatch(/^\/share\/[A-Za-z0-9_-]+$/);
    expect(Buffer.from(link.slice("/share/".length), "base64url").length).toBeGreaterThanOrEqual(32);
    const html = (await tab.get("/sharing")).text;
    expect(html).toMatch(/<label>Link for your mentor <input id="share-link" value="http:\/\/[^"]+\/share\/[^"]+" readonly><\/label>/);
    expect(html).toContain('<button type="button" data-copy="share-link">Copy</button>');
  });

  test("tokens are random: two users get different ones", () => {
    const a = createLink(testUserId());
    const b = createLink(signUp("bilal@example.com", "bilal-password"));
    expect(a).not.toBe(b);
  });

  test("Sharing is in the nav and needs a login", async () => {
    const tab = await logIn();
    expect((await tab.get("/sharing")).text.match(/<nav[\s\S]*?<\/nav>/)[0]).toContain(
      '<a href="/sharing" aria-current="page">Sharing</a>',
    );
    expect((await request(app).get("/sharing")).headers.location).toBe("/login?next=%2Fsharing");
    expect((await request(app).post("/sharing/link")).headers.location).toMatch(/^\/login/);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM share_links").get().n).toBe(0);
  });
});

describe("2. anyone can open it without logging in", () => {
  test("shows my name, and each application's company, role, stage, applied and next-step dates, newest first", async () => {
    const tab = await logIn();
    await tab.post("/sharing/name").type("form").send({ name: "Hira Ahmed" });
    const link = await createLinkAs(tab);

    const r = await request(app).get(link);
    expect(r.status).toBe(200);
    expect(r.text).toContain("<h1>Hira Ahmed</h1>");
    const expected = newestFirst(listApplications(testUserId())).map((a) => [
      a.company, a.role, stageLabel(a.stage), niceDate(a.appliedOn), a.nextStepOn ? niceDate(a.nextStepOn) : "—",
    ]);
    expect(expected.length).toBeGreaterThan(1);
    expect(sharedRows(r.text)).toEqual(expected);
  });

  test('with no name saved, it says "A JobTrail user", and never shows my email', async () => {
    const link = await createLinkAs(await logIn());
    const html = (await request(app).get(link)).text;
    expect(html).toContain("<h1>A JobTrail user</h1>");
    expect(html).not.toContain(TEST_EMAIL);
  });

  test("a blank name goes back to \"A JobTrail user\"; a name over 60 characters is refused", async () => {
    const tab = await logIn();
    const link = await createLinkAs(tab);
    await tab.post("/sharing/name").type("form").send({ name: "Hira" });
    expect((await tab.post("/sharing/name").type("form").send({ name: "   " })).status).toBe(303);
    expect((await request(app).get(link)).text).toContain("<h1>A JobTrail user</h1>");

    const r = await tab.post("/sharing/name").type("form").send({ name: "x".repeat(61) });
    expect(r.status).toBe(400);
    expect(r.text).toContain("Keep your name to 60 characters.");
    expect((await request(app).get(link)).text).toContain("<h1>A JobTrail user</h1>");
  });

  test("shows only the owner's applications", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    addApplication(bilal, "Bilal Corp", "Engineer", utcDate(2026, 10, 1));
    const html = (await request(app).get(await createLinkAs(await logIn()))).text;
    expect(html).not.toContain("Bilal Corp");
  });
});

describe("3. private data never reaches the shared page", () => {
  test("no notes, job posts, CVs, salaries, referrals, company notes or interview prep", async () => {
    const tab = await logIn();
    const user = testUserId();
    const cv = addCv(user, "SECRET-CV-NAME", "SECRET-CV-TEXT");
    const db = getDb();
    db.prepare("UPDATE applications SET notes = 'SECRET-NOTES' WHERE user_id = ?").run(user);
    await tab.post(`/applications/${RAVI}`).type("form").send({
      job_post: "SECRET-JOB-POST",
      cv_id: String(cv.id),
      salary_min: "123,457",
      salary_max: "234,568",
      salary_offered: "",
      referrer_name: "SECRET-REFERRER",
      referrer_how: "SECRET-HOW",
      referrer_contact: "secret-contact@example.com",
    });
    await tab.post(`/applications/${GWADAR}`).type("form").send({ job_post: "", cv_id: "", salary_offered: "345,679" });
    await tab.post(`/companies/${companySlug("ravi systems")}`).type("form").send({ notes: "SECRET-COMPANY-NOTES" });
    db.prepare(
      "INSERT INTO preps (application_id, user_id, questions, created_on, job_post_hash, cv_id) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(RAVI, user, JSON.stringify([{ question: "SECRET-PREP" }]), "2026-10-19", "x", cv.id);
    // Rejection notes (F11) don't exist yet; when they do, add them here.

    const owner = (await tab.get(`/applications/${RAVI}`)).text;
    for (const s of ["SECRET-JOB-POST", "SECRET-CV-NAME", "SECRET-REFERRER", "SECRET-COMPANY-NOTES"]) {
      expect(owner, s).toContain(s); // saved, so its absence below means something
    }

    const html = (await request(app).get(await createLinkAs(tab))).text;
    const secrets = [
      "SECRET-NOTES", "Technical round", "Interview date TBC", // notes, including sample.json's own
      "SECRET-JOB-POST",
      "SECRET-CV-NAME", "SECRET-CV-TEXT",
      "123,457", "123457", "234,568", "234568", "345,679", "345679", "Rs ",
      "SECRET-REFERRER", "SECRET-HOW", "secret-contact", "Referred by",
      "SECRET-COMPANY-NOTES",
      "SECRET-PREP",
      TEST_EMAIL,
    ];
    for (const s of secrets) expect(html, s).not.toContain(s);
    expect(sharedRows(html).length).toBe(listApplications(user).length);
  });
});

describe("4. nothing on the shared page changes anything", () => {
  test("no forms, buttons or links, even when the viewer is logged in", async () => {
    const tab = await logIn();
    const link = await createLinkAs(tab);
    for (const html of [(await request(app).get(link)).text, (await tab.get(link)).text]) {
      expect(html).not.toMatch(/<form\b/i);
      expect(html).not.toMatch(/<button\b/i);
      expect(html).not.toMatch(/<a\b/i);
      expect(html).not.toMatch(/<(?:input|select|textarea)\b/i);
    }
  });

  test("every POST to a share URL returns 405, whatever the token", async () => {
    const tab = await logIn();
    const link = await createLinkAs(tab);
    const old = link;
    const current = await createLinkAs(tab);
    for (const url of [current, old, "/share/made-up", "/share", "/share/a/b"]) {
      const r = await request(app).post(url).type("form").send({ stage: "rejected" });
      expect(r.status, url).toBe(405);
      expect(r.headers.allow).toBe("GET, HEAD");
    }
    for (const method of ["put", "patch", "delete"]) expect((await request(app)[method](current)).status).toBe(405);
    expect(listApplications(testUserId()).some((a) => a.stage === "rejected" && a.id === RAVI)).toBe(false);
  });
});

describe("5. Turn off link", () => {
  test('the old link says "This link has been turned off." with a 410', async () => {
    const tab = await logIn();
    const link = await createLinkAs(tab);
    const r = await tab.post("/sharing/off");
    expect(r.status).toBe(303);
    expect((await tab.get("/sharing?done=off")).text).toContain("Link turned off.");
    expect((await tab.get("/sharing")).text).toContain("<button>Create link</button>");

    const page = await request(app).get(link);
    expect(page.status).toBe(410);
    expect(page.text).toContain("This link has been turned off.");
    expect(sharedRows(page.text)).toEqual([]);
  });
});

describe("6. one link per user", () => {
  test("creating a new link turns the old one off", async () => {
    const tab = await logIn();
    const old = await createLinkAs(tab);
    expect((await tab.get("/sharing")).text).toContain("The old link stops working.");
    const current = await createLinkAs(tab);
    expect(current).not.toBe(old);
    expect((await request(app).get(old)).status).toBe(410);
    expect((await request(app).get(current)).status).toBe(200);
    const on = getDb().prepare("SELECT COUNT(*) AS n FROM share_links WHERE turned_off_on IS NULL").get().n;
    expect(on).toBe(1);
  });
});

describe("7. a made-up or mistyped token", () => {
  test('says "This link doesn\'t exist." with a 404, the same for every wrong token', async () => {
    const link = await createLinkAs(await logIn());
    const token = link.slice("/share/".length);
    const mistyped = `/share/${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    const pages = [];
    for (const url of [mistyped, "/share/made-up", `/share/${"A".repeat(43)}`, "/share/", "/share/a/b"]) {
      const r = await request(app).get(url);
      expect(r.status, url).toBe(404);
      expect(r.text).toContain("This link doesn&#39;t exist.");
      expect(r.text).not.toContain("A JobTrail user");
      pages.push(r.text);
    }
    expect(new Set(pages).size).toBe(1); // nothing hints at whose link it was, or whether anyone's exists
  });

  test("tokens are matched exactly", () => {
    const token = createLink(testUserId());
    expect(openLink(token)).toEqual({ userId: testUserId() });
    expect(openLink(token.toUpperCase())).toBeNull();
    expect(openLink(`${token}x`)).toBeNull();
    expect(openLink("")).toBeNull();
    expect(openLink(undefined)).toBeNull();
  });
});

describe("8. not indexed by search engines", () => {
  test('the shared page has <meta name="robots" content="noindex">, and so do its error pages', async () => {
    const tab = await logIn();
    const link = await createLinkAs(tab);
    expect((await request(app).get(link)).text).toContain('<meta name="robots" content="noindex">');
    expect((await request(app).get("/share/made-up")).text).toContain('<meta name="robots" content="noindex">');
    await tab.post("/sharing/off");
    expect((await request(app).get(link)).text).toContain('<meta name="robots" content="noindex">');
    expect((await tab.get("/")).text).not.toContain("noindex");
  });

  test("it sends no Referer and isn't cached", async () => {
    const r = await request(app).get(await createLinkAs(await logIn()));
    expect(r.headers["referrer-policy"]).toBe("no-referrer");
    expect(r.headers["x-robots-tag"]).toBe("noindex");
    expect(r.headers["cache-control"]).toBe("no-store");
  });
});

describe("edge cases", () => {
  test("a deleted application disappears from the shared page", async () => {
    const link = await createLinkAs(await logIn());
    expect((await request(app).get(link)).text).toContain("<h2>Ravi Systems</h2>");
    getDb().prepare("DELETE FROM applications WHERE id = ?").run(RAVI);
    expect((await request(app).get(link)).text).not.toContain("<h2>Ravi Systems</h2>");
  });

  test('with no applications, it says "No applications yet."', async () => {
    const hira = request.agent(app);
    await hira.post("/signup").type("form").send({ email: "hira@example.com", password: "12345678" });
    const html = (await request(app).get(await createLinkAs(hira))).text;
    expect(html).toContain("No applications yet.");
    expect(sharedRows(html)).toEqual([]);
  });

  test(`over ${REQUESTS_PER_MINUTE} requests a minute from one IP gets a 429`, async () => {
    const link = await createLinkAs(await logIn());
    for (let i = 0; i < REQUESTS_PER_MINUTE; i++) {
      const url = i % 2 ? link : `/share/guess-${i}`; // guesses count too
      expect((await request(app).get(url)).status).not.toBe(429);
    }
    const r = await request(app).get(link);
    expect(r.status).toBe(429);
    expect(r.headers["retry-after"]).toBe("60");
    expect(r.text).toContain("Too many requests. Try again in a minute.");
    expect(r.text).not.toContain("<h2>Ravi Systems</h2>");
    expect((await request(app).post(link)).status).toBe(429);
  });

  test("the limit is per IP and resets after a minute", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T10:00:00Z"));
    for (let i = 0; i < REQUESTS_PER_MINUTE; i++) expect(allowShareRequest("10.0.0.1")).toBe(true);
    expect(allowShareRequest("10.0.0.1")).toBe(false);
    expect(allowShareRequest("10.0.0.2")).toBe(true);
    vi.setSystemTime(new Date("2026-10-19T10:01:01Z"));
    expect(allowShareRequest("10.0.0.1")).toBe(true);
  });
});
