// F7 · Salary range and offer. One test (or more) per acceptance criterion and edge case.

import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { closeDb, getDb } from "../../src/db.js";
import { describeOffer, salaryRange } from "../../src/formatting.js";
import { getApplication, moveStage, parseSalary } from "../../src/services/applications.js";
import { logIn, TEST_EMAIL, testUserId } from "../helpers.js";

const GWADAR = 1; // at stage Offer in sample.json
const RAVI = 3; // at stage Interview

const salaryRow = (id) =>
  getDb().prepare("SELECT salary_min, salary_max, salary_offered FROM applications WHERE id = ?").get(id);

/** Saves the application page form the way the browser does. */
async function save(tab, id, fields) {
  return tab.post(`/applications/${id}`).type("form").send({ job_post: "", cv_id: "", ...fields });
}

/** The card for one company on the Applications page. */
async function card(tab, company) {
  const html = (await tab.get("/")).text;
  return html.match(/<li class="app-card">[\s\S]*?<\/li>/g).find((c) => c.includes(`>${company}<`));
}

const dd = (label, value) => `<dt>${label}</dt><dd>${value}</dd>`;

describe("1. the application page saves a monthly range in rupees", () => {
  test("minimum and maximum are both saved, and shown in the form again", async () => {
    const tab = await logIn();
    const r = await save(tab, RAVI, { salary_min: "80000", salary_max: "120000" });
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe(`/applications/${RAVI}?saved=1`);
    expect(salaryRow(RAVI)).toEqual({ salary_min: 80000, salary_max: 120000, salary_offered: null });

    const page = (await tab.get(`/applications/${RAVI}?saved=1`)).text;
    expect(page).toContain('<label>Minimum monthly salary (Rs) <input name="salary_min" inputmode="numeric" value="80000"></label>');
    expect(page).toContain('<label>Maximum monthly salary (Rs) <input name="salary_max" inputmode="numeric" value="120000"></label>');
    expect(page).toContain(dd("Salary", "Rs 80,000 – 120,000"));
  });

  test("clearing both fields removes the range", async () => {
    const tab = await logIn();
    await save(tab, RAVI, { salary_min: "80000", salary_max: "120000" });
    await save(tab, RAVI, { salary_min: "", salary_max: "" });
    expect(salaryRow(RAVI)).toEqual({ salary_min: null, salary_max: null, salary_offered: null });
  });

  test("a form without the salary fields leaves the salary as it is", async () => {
    const tab = await logIn();
    await save(tab, RAVI, { salary_min: "80000", salary_max: "120000" });
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "A post", cv_id: "" });
    expect(salaryRow(RAVI)).toMatchObject({ salary_min: 80000, salary_max: 120000 });
  });

  test("someone else's application is a 404 and isn't changed", async () => {
    const tab = await logIn();
    await tab.post("/signup").type("form").send({ email: "bilal@example.com", password: "bilal-password" });
    const r = await save(tab, RAVI, { salary_min: "1", salary_max: "2" }); // tab is now Bilal
    expect(r.status).toBe(404);
    expect(salaryRow(RAVI)).toMatchObject({ salary_min: null, salary_max: null });
  });
});

describe("2, 3 and 4. the card's salary line", () => {
  test("a range shows Rs 80,000 – 120,000", async () => {
    const tab = await logIn();
    await save(tab, RAVI, { salary_min: "80000", salary_max: "120000" });
    expect(await card(tab, "Ravi Systems")).toContain(dd("Salary", "Rs 80,000 – 120,000"));
  });

  test("only a minimum shows From Rs 80,000; only a maximum shows Up to Rs 120,000", async () => {
    const tab = await logIn();
    await save(tab, RAVI, { salary_min: "80000", salary_max: "" });
    expect(await card(tab, "Ravi Systems")).toContain(dd("Salary", "From Rs 80,000"));
    await save(tab, RAVI, { salary_min: "", salary_max: "120000" });
    expect(await card(tab, "Ravi Systems")).toContain(dd("Salary", "Up to Rs 120,000"));
  });

  test("no salary means no salary line, no Rs 0 and no undefined", async () => {
    const tab = await logIn();
    const html = (await tab.get("/")).text;
    expect(html).not.toContain("<dt>Salary</dt>");
    expect(html).not.toContain("<dt>Offer</dt>");
    expect(html).not.toMatch(/Rs 0|undefined|null|NaN/);
    expect((await tab.get(`/applications/${GWADAR}`)).text).not.toMatch(/<dt>(Salary|Offer)<\/dt>|undefined|NaN/);
  });

  test("large numbers get a comma every three digits", () => {
    expect(salaryRange({ salaryMin: 999, salaryMax: 10000000 })).toBe("Rs 999 – 10,000,000");
    expect(salaryRange({ salaryMin: null, salaryMax: null })).toBeNull();
  });
});

describe("5. a minimum larger than the maximum", () => {
  test("saves nothing, says why, and keeps what I typed", async () => {
    const tab = await logIn();
    const r = await save(tab, RAVI, { salary_min: "120000", salary_max: "80000", job_post: "Not saved either" });
    expect(r.status).toBe(400);
    expect(r.text).toContain("Minimum can&#39;t be more than maximum.");
    expect(r.text).toContain('name="salary_min" inputmode="numeric" value="120000"');
    expect(r.text).toContain('name="salary_max" inputmode="numeric" value="80000"');
    expect(salaryRow(RAVI)).toEqual({ salary_min: null, salary_max: null, salary_offered: null });
    expect(getApplication(testUserId(), RAVI).jobPost).toBeNull();
  });

  test("an equal minimum and maximum is fine", async () => {
    const tab = await logIn();
    await save(tab, RAVI, { salary_min: "90000", salary_max: "90,000" });
    expect(await card(tab, "Ravi Systems")).toContain(dd("Salary", "Rs 90,000 – 90,000"));
  });
});

describe("6 and 8. the offer field only at stage Offer", () => {
  test("at Offer the page has a monthly amount offered field, and it saves", async () => {
    const tab = await logIn();
    const page = (await tab.get(`/applications/${GWADAR}`)).text;
    expect(page).toContain('<label>Monthly amount offered (Rs) <input name="salary_offered" inputmode="numeric" value=""></label>');
    await save(tab, GWADAR, { salary_min: "", salary_max: "", salary_offered: "110,000" });
    expect(salaryRow(GWADAR).salary_offered).toBe(110000);
  });

  test("at any other stage there's no offer field, and a posted offer is ignored", async () => {
    const tab = await logIn();
    for (const id of [2, RAVI, 5]) {
      expect((await tab.get(`/applications/${id}`)).text, `application ${id}`).not.toContain("salary_offered");
    }
    await save(tab, RAVI, { salary_min: "", salary_max: "", salary_offered: "110000" });
    expect(salaryRow(RAVI).salary_offered).toBeNull();
  });
});

describe("7. the offer against the range", () => {
  test("110,000 on 80,000 – 120,000 is within range, on the card and the page", async () => {
    const tab = await logIn();
    await save(tab, GWADAR, { salary_min: "80000", salary_max: "120000", salary_offered: "110000" });
    expect(await card(tab, "Gwadar Cloud")).toContain(dd("Offer", "Rs 110,000 (within range)"));
    expect((await tab.get(`/applications/${GWADAR}`)).text).toContain(dd("Offer", "Rs 110,000 (within range)"));
  });

  test("below the minimum, above the maximum, and with no range", async () => {
    const tab = await logIn();
    for (const [min, max, offered, shown] of [
      ["80000", "120000", "70000", "Rs 70,000 (below range)"],
      ["80000", "120000", "130000", "Rs 130,000 (above range)"],
      ["80000", "120000", "80000", "Rs 80,000 (within range)"],
      ["80000", "120000", "120000", "Rs 120,000 (within range)"],
      ["80000", "", "70000", "Rs 70,000 (below range)"],
      ["", "120000", "130000", "Rs 130,000 (above range)"],
      ["", "", "110000", "Rs 110,000"],
    ]) {
      await save(tab, GWADAR, { salary_min: min, salary_max: max, salary_offered: offered });
      expect(await card(tab, "Gwadar Cloud"), `${min}–${max}, offered ${offered}`).toContain(dd("Offer", shown));
    }
  });

  test("an offer is described only at stage Offer", () => {
    const app = { stage: "interview", salaryMin: null, salaryMax: null, salaryOffered: 110000 };
    expect(describeOffer(app)).toBeNull();
    expect(describeOffer({ ...app, stage: "offer" })).toBe("Rs 110,000");
  });
});

describe("9. the API", () => {
  test("every application has salary_min, salary_max and salary_offered, as whole numbers or null", async () => {
    const tab = await logIn();
    await save(tab, GWADAR, { salary_min: "80,000", salary_max: "120000", salary_offered: "110000" });
    const list = (await tab.get("/api/applications")).body;
    expect(list.length).toBeGreaterThan(1);
    for (const a of list) {
      for (const key of ["salary_min", "salary_max", "salary_offered"]) {
        expect(a, `${a.company} ${key}`).toHaveProperty(key);
        expect(a[key] === null || Number.isInteger(a[key]), `${a.company} ${key}`).toBe(true);
      }
    }
    expect(list.find((a) => a.id === GWADAR)).toMatchObject({ salary_min: 80000, salary_max: 120000, salary_offered: 110000 });
    expect(list.find((a) => a.id === RAVI)).toMatchObject({ salary_min: null, salary_max: null, salary_offered: null });
    expect((await tab.get(`/api/applications/${GWADAR}`)).body).toMatchObject({ salary_offered: 110000 });
  });
});

describe("10. applications from before this feature", () => {
  test("a database without the salary columns opens, shows no salary, and saves one from then on", async () => {
    const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(TEST_EMAIL);
    closeDb();
    const file = path.join(path.dirname(process.env.JOBTRAIL_DB), "before-f7.db");
    const old = new Database(file);
    old.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
      CREATE TABLE login_failures (email TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
        company TEXT NOT NULL, role TEXT NOT NULL, source TEXT NOT NULL, applied_on TEXT, applied_on_raw TEXT,
        stage TEXT NOT NULL, next_step_on TEXT, notes TEXT NOT NULL DEFAULT '',
        job_post TEXT, cv_id INTEGER, last_changed_on TEXT, followed_up_on TEXT);
    `);
    old.prepare("INSERT INTO users VALUES (?, ?, ?, ?)").run(user.id, user.email, user.password_hash, user.created_at);
    old.prepare("INSERT INTO applications (id, user_id, company, role, source, applied_on, stage) VALUES (1, ?, 'Old Co', 'Dev', 'manual', '2026-08-01', 'offer')").run(user.id);
    old.close();
    process.env.JOBTRAIL_DB = file;

    const tab = await logIn();
    for (const url of ["/", "/applications/1"]) {
      const r = await tab.get(url);
      expect(r.status, url).toBe(200);
      expect(r.text, url).toContain("Old Co");
      expect(r.text, url).not.toMatch(/<dt>(Salary|Offer)<\/dt>|undefined|NaN/);
    }
    expect((await tab.get("/api/applications")).body[0]).toMatchObject({ salary_min: null, salary_max: null, salary_offered: null });

    await save(tab, 1, { salary_min: "80000", salary_max: "120000", salary_offered: "110000" });
    expect(await card(tab, "Old Co")).toContain(dd("Offer", "Rs 110,000 (within range)"));
  });
});

describe("edge cases", () => {
  test("80,000 is accepted as 80000", () => {
    expect(parseSalary("80,000")).toBe(80000);
    expect(parseSalary(" 1,20,000 ")).toBe(120000);
    expect(parseSalary("")).toBeNull();
    expect(parseSalary("   ")).toBeNull();
  });

  test.each([
    ["80k", "Use numbers only, like 80000."],
    ["eighty", "Use numbers only, like 80000."],
    ["80000.50", "Use numbers only, like 80000."],
    ["Rs 80000", "Use numbers only, like 80000."],
    ["0", "Salary must be more than 0."],
    ["-5000", "Salary must be more than 0."],
    ["10000001", "That looks too high. Check the number."],
  ])("%s is refused: %s", async (typed, message) => {
    expect(() => parseSalary(typed)).toThrow(message);
    const tab = await logIn();
    for (const field of ["salary_min", "salary_max", "salary_offered"]) {
      const r = await save(tab, GWADAR, { salary_min: "", salary_max: "", salary_offered: "", [field]: typed });
      expect(r.status, field).toBe(400);
      expect(r.text, field).toContain(message.replace("'", "&#39;"));
    }
    expect(salaryRow(GWADAR)).toEqual({ salary_min: null, salary_max: null, salary_offered: null });
  });

  test("10,000,000 a month is the most it takes", () => {
    expect(parseSalary("10,000,000")).toBe(10000000);
  });

  test("moving away from Offer keeps the amount but hides it; moving back shows it again", async () => {
    const tab = await logIn();
    await save(tab, GWADAR, { salary_min: "80000", salary_max: "120000", salary_offered: "110000" });

    moveStage(testUserId(), GWADAR, "rejected");
    expect(salaryRow(GWADAR).salary_offered).toBe(110000);
    expect(await card(tab, "Gwadar Cloud")).not.toContain("<dt>Offer</dt>");
    expect(await card(tab, "Gwadar Cloud")).toContain(dd("Salary", "Rs 80,000 – 120,000"));
    expect((await tab.get(`/applications/${GWADAR}`)).text).not.toContain("salary_offered");
    expect((await tab.get(`/api/applications/${GWADAR}`)).body.salary_offered).toBeNull();

    // saving the range at another stage doesn't lose the hidden offer
    await save(tab, GWADAR, { salary_min: "85000", salary_max: "120000" });
    expect(salaryRow(GWADAR).salary_offered).toBe(110000);

    moveStage(testUserId(), GWADAR, "offer");
    expect(await card(tab, "Gwadar Cloud")).toContain(dd("Offer", "Rs 110,000 (within range)"));
    expect((await tab.get(`/applications/${GWADAR}`)).text).toContain('name="salary_offered" inputmode="numeric" value="110000"');
  });
});
