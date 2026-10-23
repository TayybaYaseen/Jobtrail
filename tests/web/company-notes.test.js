// F9 · Company notes. One test (or more) per acceptance criterion and edge case.

import request from "supertest";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app.js";
import { getDb } from "../../src/db.js";
import { utcDate } from "../../src/dates.js";
import { signUp } from "../../src/services/accounts.js";
import { addApplication, getApplication, listApplications } from "../../src/services/applications.js";
import { companyKey, companySlug, listCompanies, preview } from "../../src/services/companies.js";
import { logIn, testUserId } from "../helpers.js";

const RAVI = 3; // Ravi Systems, Associate Software Engineer, in sample.json
const ravi = companySlug("ravi systems");

const saveNotes = (tab, slug, notes) => tab.post(`/companies/${slug}`).type("form").send({ notes });

/** The Companies page as [name, count] pairs, in order. */
async function companyRows(tab) {
  const html = (await tab.get("/companies")).text;
  return [...html.matchAll(/<li class="company-row">\s*<a href="\/companies\/[^"]+">([^<]*)<\/a>\s*<span class="muted">([^<]*)<\/span>/g)].map(
    (m) => [m[1], m[2]],
  );
}

describe("1. the Companies page", () => {
  test("lists every company I've applied to, A to Z, with how many applications each has", async () => {
    const tab = await logIn();
    addApplication(testUserId(), "Ravi Systems", "Backend Intern", utcDate(2026, 10, 12));
    const rows = await companyRows(tab);
    const names = listApplications(testUserId()).map((a) => a.company);
    expect(rows).toHaveLength(new Set(names).size);
    expect(rows.map(([name]) => name)).toEqual([...rows.map(([name]) => name)].sort((a, b) => a.localeCompare(b)));
    expect(rows).toContainEqual(["Ravi Systems", "2 applications"]);
    expect(rows).toContainEqual(["Gwadar Cloud", "1 application"]);
  });

  test("is in the nav, needs a login, and says so with no applications", async () => {
    const tab = await logIn();
    expect((await tab.get("/companies")).text.match(/<nav[\s\S]*?<\/nav>/)[0]).toContain(
      '<a href="/companies" aria-current="page">Companies</a>',
    );
    expect((await request(app).get("/companies")).headers.location).toBe("/login?next=%2Fcompanies");
    const hira = request.agent(app);
    await hira.post("/signup").type("form").send({ email: "hira@example.com", password: "12345678" });
    expect((await hira.get("/companies")).text).toContain("No companies yet. Add an application first.");
  });
});

describe("2. a company's page", () => {
  test("shows my notes and every application to it", async () => {
    const tab = await logIn();
    const intern = addApplication(testUserId(), "Ravi Systems", "Backend Intern", utcDate(2026, 10, 12));
    await saveNotes(tab, ravi, "Office in Gulberg. Interviewer: Sara.");
    const page = await tab.get(`/companies/${ravi}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain("<h1>Ravi Systems</h1>");
    expect(page.text).toMatch(/<textarea name="notes" rows="10">\r?\nOffice in Gulberg. Interviewer: Sara.<\/textarea>/);
    expect(page.text).toContain(`<a href="/applications/${RAVI}">Associate Software Engineer</a> · Interview · applied Mon 21 Sep`);
    expect(page.text).toContain(`<a href="/applications/${intern.id}">Backend Intern</a> · Applied · applied Mon 12 Oct`);
  });

  test("each company row links to its page", async () => {
    const tab = await logIn();
    expect((await tab.get("/companies")).text).toContain(`<a href="/companies/${ravi}">Ravi Systems</a>`);
  });

  test("an unknown company is a 404", async () => {
    const tab = await logIn();
    expect((await tab.get("/companies/nope-000000")).status).toBe(404);
    expect((await saveNotes(tab, "nope-000000", "x")).status).toBe(404);
  });
});

describe("3. writing notes", () => {
  test("they're saved and shown with Updated 19 Oct 2026", async () => {
    const tab = await logIn();
    expect((await tab.get(`/companies/${ravi}`)).text).toContain("Only you can see these.");
    const r = await saveNotes(tab, ravi, "Replies within a week.");
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe(`/companies/${ravi}?saved=1`);
    const page = (await tab.get(`/companies/${ravi}?saved=1`)).text;
    expect(page).toContain('<p class="saved" role="status">Saved</p>');
    expect(page).toContain("Updated 19 Oct 2026"); // today is pinned to 19 Oct 2026
  });

  test("saving again replaces them and moves the date", async () => {
    const tab = await logIn();
    await saveNotes(tab, ravi, "First");
    process.env.JOBTRAIL_TODAY = "2026-10-22";
    await saveNotes(tab, ravi, "Second");
    const page = (await tab.get(`/companies/${ravi}`)).text;
    expect(page).toMatch(/\r?\nSecond<\/textarea>/);
    expect(page).toContain("Updated 22 Oct 2026");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM company_notes").get().n).toBe(1);
  });

  test("blank notes remove them", async () => {
    const tab = await logIn();
    await saveNotes(tab, ravi, "Something");
    await saveNotes(tab, ravi, "  \r\n ");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM company_notes").get().n).toBe(0);
    expect((await tab.get(`/companies/${ravi}`)).text).toContain("Only you can see these.");
  });
});

describe("4. names compared trimmed and ignoring case", () => {
  test('"Ravi Systems" and " ravi systems " are one company, shown with the first spelling', async () => {
    const tab = await logIn();
    addApplication(testUserId(), " ravi systems ", "Backend Intern", utcDate(2026, 10, 12));
    addApplication(testUserId(), "RAVI SYSTEMS", "QA", utcDate(2026, 10, 13));
    const rows = await companyRows(tab);
    expect(rows.filter(([name]) => companyKey(name) === "ravi systems")).toEqual([["Ravi Systems", "3 applications"]]);
    expect(companyKey(" Ravi Systems ")).toBe(companyKey("ravi systems"));
  });

  test("notes are shared across the spellings", async () => {
    const tab = await logIn();
    const other = addApplication(testUserId(), "RAVI systems", "QA", utcDate(2026, 10, 13));
    await saveNotes(tab, ravi, "Same company");
    expect((await tab.get(`/applications/${other.id}`)).text).toContain('<p class="company-preview">Same company</p>');
  });
});

describe("5. the application page shows the company's notes", () => {
  test("the first 200 characters, with a link to the company page", async () => {
    const tab = await logIn();
    const long = `${"a".repeat(195)} bcdefghij`;
    await saveNotes(tab, ravi, long);
    const page = (await tab.get(`/applications/${RAVI}`)).text;
    expect(page).toContain("<h2>About Ravi Systems</h2>");
    expect(page).toContain(`<p class="company-preview">${long.slice(0, 200)}…</p>`);
    expect(page).not.toContain(long.slice(0, 201));
    expect(page).toContain(`<a href="/companies/${ravi}">All your notes on Ravi Systems</a>`);
  });

  test("short notes are shown whole, without …", async () => {
    const tab = await logIn();
    await saveNotes(tab, ravi, "Short");
    expect((await tab.get(`/applications/${RAVI}`)).text).toContain('<p class="company-preview">Short</p>');
    expect(preview("x".repeat(200))).toBe("x".repeat(200));
    expect(preview("ہ".repeat(201))).toBe(`${"ہ".repeat(200)}…`);
  });

  test("with no notes, there's no preview, only a link to add some", async () => {
    const tab = await logIn();
    const page = (await tab.get(`/applications/${RAVI}`)).text;
    expect(page).not.toContain("company-preview");
    expect(page).toContain(`<a href="/companies/${ravi}">Add notes about Ravi Systems</a>`);
  });
});

describe("6. notes are private", () => {
  test("another user's notes on the same company aren't shown to me", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    addApplication(bilal, "Ravi Systems", "Engineer", utcDate(2026, 10, 1));
    const bilalTab = await logIn("bilal@example.com", "bilal-password");
    await saveNotes(bilalTab, ravi, "BILAL-ONLY notes");

    const tab = await logIn();
    expect((await tab.get(`/companies/${ravi}`)).text).not.toContain("BILAL-ONLY");
    expect((await tab.get(`/applications/${RAVI}`)).text).not.toContain("BILAL-ONLY");
    await saveNotes(tab, ravi, "Mine");
    expect((await bilalTab.get(`/companies/${ravi}`)).text).toContain("BILAL-ONLY notes");
    expect((await bilalTab.get(`/companies/${ravi}`)).text).not.toContain("Mine");
    // and only my applications are listed on my page
    expect((await tab.get(`/companies/${ravi}`)).text).not.toContain(">Engineer<");
  });

  test("a company only someone else applied to is a 404 for me", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    addApplication(bilal, "Bilal Only Co", "Engineer", utcDate(2026, 10, 1));
    const tab = await logIn();
    expect((await tab.get(`/companies/${companySlug("bilal only co")}`)).status).toBe(404);
  });
});

describe("edge cases", () => {
  test("notes over 5,000 characters: Keep notes under 5,000 characters.", async () => {
    const tab = await logIn();
    const r = await saveNotes(tab, ravi, "x".repeat(5001));
    expect(r.status).toBe(400);
    expect(r.text).toContain("Keep notes under 5,000 characters.");
    expect(r.text).toContain("x".repeat(5001)); // keeps what I typed
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM company_notes").get().n).toBe(0);
    expect((await saveNotes(tab, ravi, "x".repeat(5000))).status).toBe(303);
  });

  test("a company with no applications left is hidden, and its notes are kept", async () => {
    const tab = await logIn();
    await saveNotes(tab, ravi, "Keep me");
    getDb().prepare("DELETE FROM applications WHERE id = ?").run(RAVI);
    expect((await companyRows(tab)).map(([name]) => name)).not.toContain("Ravi Systems");
    expect((await tab.get(`/companies/${ravi}`)).status).toBe(404);
    expect(getDb().prepare("SELECT notes FROM company_notes WHERE company_key = 'ravi systems'").get().notes).toBe("Keep me");

    // applying there again brings them back
    addApplication(testUserId(), "Ravi Systems", "Again", utcDate(2026, 10, 19));
    expect((await tab.get(`/companies/${ravi}`)).text).toMatch(/\r?\nKeep me<\/textarea>/);
  });

  test("notes containing HTML are shown as text", async () => {
    const tab = await logIn();
    await saveNotes(tab, ravi, '<script>alert("x")</script>');
    const escaped = "&lt;script&gt;alert(&#34;x&#34;)&lt;/script&gt;";
    expect((await tab.get(`/companies/${ravi}`)).text).toContain(escaped);
    const page = (await tab.get(`/applications/${RAVI}`)).text;
    expect(page).toContain(`<p class="company-preview">${escaped}</p>`);
    expect(page).not.toContain('<script>alert("x")');
  });

  test("names that differ in punctuation are different companies", async () => {
    const tab = await logIn();
    addApplication(testUserId(), "Ravi Systems Ltd.", "Dev", utcDate(2026, 10, 12));
    addApplication(testUserId(), "Ravi-Systems", "Dev", utcDate(2026, 10, 13));
    const rows = (await companyRows(tab)).filter(([name]) => name.startsWith("Ravi"));
    expect(rows).toEqual([
      ["Ravi Systems", "1 application"],
      ["Ravi Systems Ltd.", "1 application"],
      ["Ravi-Systems", "1 application"],
    ]);
    const slugs = ["ravi systems", "ravi systems ltd.", "ravi-systems"].map(companySlug);
    expect(new Set(slugs).size).toBe(3);
    await saveNotes(tab, companySlug("ravi-systems"), "Hyphen only");
    expect((await tab.get(`/companies/${ravi}`)).text).not.toContain("Hyphen only");
  });

  test("names in Urdu or with no letters still get a working page", async () => {
    const tab = await logIn();
    addApplication(testUserId(), "سسٹمز", "Dev", utcDate(2026, 10, 12));
    addApplication(testUserId(), "!!!", "Dev", utcDate(2026, 10, 13));
    for (const name of ["سسٹمز", "!!!"]) {
      const { slug } = listCompanies(testUserId()).find((c) => c.name === name);
      expect((await tab.get(`/companies/${encodeURIComponent(slug)}`)).status, name).toBe(200);
    }
  });

  test("the per-application notes field is left as it is", async () => {
    const tab = await logIn();
    const before = getApplication(testUserId(), 1).notes;
    await saveNotes(tab, companySlug("gwadar cloud"), "Company notes");
    expect(getApplication(testUserId(), 1).notes).toBe(before);
    expect(before).toBe("Offer deadline");
  });
});
