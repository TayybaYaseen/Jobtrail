// F3 · Job post and CV on each application. One test (or more) per acceptance criterion.

import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { closeDb, getDb } from "../../src/db.js";
import { addApplication, getApplication } from "../../src/services/applications.js";
import { addCv } from "../../src/services/cvs.js";
import { signUp } from "../../src/services/accounts.js";
import { utcDate } from "../../src/dates.js";
import { logIn, TEST_EMAIL, testUserId } from "../helpers.js";

const RAVI = 3; // Ravi Systems in sample.json

const cvRow = (id) => getDb().prepare("SELECT * FROM cvs WHERE id = ?").get(id);
const appRow = (id) => getDb().prepare("SELECT job_post, cv_id FROM applications WHERE id = ?").get(id);

/** HTML-escaped, the way EJS shows text. */
const escaped = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&#34;");

/** Bilal, a second user, with one CV of his own. Returns its id. */
function bilalsCv() {
  return addCv(signUp("bilal@example.com", "bilal-password"), "Bilal's CV", "Bilal's text").id;
}

describe("1. CVs page", () => {
  test("adds a CV version and lists it, newest first, with the date added", async () => {
    const tab = await logIn();
    expect((await tab.get("/cvs")).text).toContain("No CVs yet. Add the version you send to employers.");

    const r = await tab.post("/cvs").type("form").send({ name: "CV v2 – general", text: "Older CV" });
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe("/cvs");
    await tab.post("/cvs").type("form").send({ name: "CV v3 – backend", text: "Newer CV" });

    const page = (await tab.get("/cvs")).text;
    expect(page.indexOf("CV v3 – backend")).toBeGreaterThan(-1);
    expect(page.indexOf("CV v3 – backend")).toBeLessThan(page.indexOf("CV v2 – general"));
    expect(page).toContain("Added Mon 19 Oct"); // today is pinned to 19 Oct 2026
  });

  test("an empty name or text is refused and the form keeps what I typed (Flow 1)", async () => {
    const tab = await logIn();
    const noName = await tab.post("/cvs").type("form").send({ name: "  ", text: "My CV text" });
    expect(noName.status).toBe(400);
    expect(noName.text).toContain("Give this CV a name.");
    expect(noName.text).toContain("My CV text");

    const noText = await tab.post("/cvs").type("form").send({ name: "CV v1", text: " \n " });
    expect(noText.status).toBe(400);
    expect(noText.text).toContain("Paste the CV text.");
    expect(noText.text).toContain('value="CV v1"');
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM cvs").get().n).toBe(0);
  });

  test("a CV over 20,000 characters is refused", async () => {
    const tab = await logIn();
    const r = await tab.post("/cvs").type("form").send({ name: "Long", text: "x".repeat(20001) });
    expect(r.status).toBe(400);
    expect(r.text).toContain("That CV is too long (20,000 characters max).");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM cvs").get().n).toBe(0);
    // 20,000 is fine, even in a script that takes several bytes per character
    const ok = await tab.post("/cvs").type("form").send({ name: "Long", text: "ہ".repeat(20000) });
    expect(ok.status).toBe(303);
  });

  test("two CVs with the same name are allowed", async () => {
    const tab = await logIn();
    await tab.post("/cvs").type("form").send({ name: "CV", text: "one" });
    await tab.post("/cvs").type("form").send({ name: "CV", text: "two" });
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM cvs WHERE name = 'CV'").get().n).toBe(2);
  });
});

describe("2. tapping a card opens the application page", () => {
  test("each card links to /applications/:id, which shows details, a job post box and a CV picker", async () => {
    const tab = await logIn();
    expect((await tab.get("/")).text).toContain(`href="/applications/${RAVI}"`);

    const r = await tab.get(`/applications/${RAVI}`);
    expect(r.status).toBe(200);
    expect(r.text).toContain("Ravi Systems");
    expect(r.text).toContain("Associate Software Engineer");
    expect(r.text).toContain("Mon 21 Sep");
    expect(r.text).toMatch(/<label>Job post\s*<textarea name="job_post"/);
    expect(r.text).toMatch(/<label>CV sent\s*<select name="cv_id">/);
  });

  test("an application that isn't mine, or doesn't exist, is a 404", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    const theirs = addApplication(bilal, "Bilal's Secret Co", "Engineer", utcDate(2026, 10, 1)).id;
    const tab = await logIn();
    for (const id of [theirs, 9999, "abc"]) {
      const r = await tab.get(`/applications/${id}`);
      expect(r.status).toBe(404);
      expect(r.text).not.toContain("Bilal");
    }
  });
});

describe("3. saving the job post and the CV", () => {
  test("saves both and shows 'Saved'", async () => {
    const cv = addCv(testUserId(), "CV v3 – backend", "My backend CV");
    const tab = await logIn();
    const r = await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "We need Node.", cv_id: String(cv.id) });
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe(`/applications/${RAVI}?saved=1`);
    expect(appRow(RAVI)).toEqual({ job_post: "We need Node.", cv_id: cv.id });

    const page = (await tab.get(r.headers.location)).text;
    expect(page).toContain(">Saved<");
    expect(page).toContain("We need Node.");
    expect(page).toContain(`<option value="${cv.id}" selected>`);
  });

  test("a job post over 20,000 characters is refused and nothing is saved", async () => {
    const cv = addCv(testUserId(), "CV", "text");
    const tab = await logIn();
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "Original post", cv_id: "" });
    const r = await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "y".repeat(20001), cv_id: String(cv.id) });
    expect(r.status).toBe(400);
    expect(r.text).toContain("That job post is too long (20,000 characters max).");
    expect(r.text).not.toContain(">Saved<");
    expect(appRow(RAVI)).toEqual({ job_post: "Original post", cv_id: null });
  });

  test("clearing the job post box saves it as null", async () => {
    const tab = await logIn();
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "Something", cv_id: "" });
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "  \r\n ", cv_id: "" });
    expect(appRow(RAVI).job_post).toBeNull();
  });

  test("a job post with HTML or <script> is stored as text and shown escaped", async () => {
    const tab = await logIn();
    const post = '<script>alert("hi")</script><b>Senior</b> & co';
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: post, cv_id: "" });
    expect(appRow(RAVI).job_post).toBe(post);
    const page = (await tab.get(`/applications/${RAVI}`)).text;
    expect(page).not.toContain("<script>alert");
    expect(page).toContain(escaped(post));
  });
});

describe("4. an attached CV shows its name and links to its text, exactly as saved", () => {
  test("the link opens the CV text unchanged", async () => {
    const text = '\nHira Khan\n  • Node & Express <backend>\n\n"Projects"   JobTrail\n';
    const cv = addCv(testUserId(), "CV v3 – backend", text);
    const tab = await logIn();
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "", cv_id: String(cv.id) });

    const page = (await tab.get(`/applications/${RAVI}`)).text;
    expect(page).toContain(`<a href="/cvs/${cv.id}">CV v3 – backend</a>`);

    const r = await tab.get(`/cvs/${cv.id}`);
    expect(r.status).toBe(200);
    expect(r.text).toContain(`<pre class="cv-text panel">\n${escaped(text)}</pre>`);
    expect(cvRow(cv.id).text).toBe(text);
  });
});

describe("5. a CV's text can't be edited", () => {
  test("the CV page has no form, and there's no route that changes the text", async () => {
    const cv = addCv(testUserId(), "CV v1", "Original text");
    const tab = await logIn();
    const page = (await tab.get(`/cvs/${cv.id}`)).text;
    expect(page.match(/<main>[\s\S]*<\/main>/)[0]).not.toMatch(/<form|<textarea|<input/);
    expect(page).toContain("To change it, add a new version.");

    for (const url of [`/cvs/${cv.id}`, `/cvs/${cv.id}/edit`, `/api/cvs/${cv.id}`]) {
      await tab.post(url).type("form").send({ name: "CV v1", text: "Changed" });
      await tab.put(url).send({ text: "Changed" });
    }
    expect(cvRow(cv.id).text).toBe("Original text");
  });
});

describe("6. a CV that was sent can't be deleted", () => {
  test("says how many applications it was sent with, and deletes nothing", async () => {
    const cv = addCv(testUserId(), "CV v3 – backend", "text");
    const tab = await logIn();
    for (const id of [1, RAVI]) await tab.post(`/applications/${id}`).type("form").send({ job_post: "", cv_id: String(cv.id) });

    const r = await tab.post(`/cvs/${cv.id}/delete`);
    expect(r.status).toBe(409);
    expect(r.text).toContain("This CV was sent with 2 applications. It can&#39;t be deleted.");
    expect(cvRow(cv.id)).toBeTruthy();
  });

  test("one application reads '1 application'", async () => {
    const cv = addCv(testUserId(), "CV", "text");
    const tab = await logIn();
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "", cv_id: String(cv.id) });
    expect((await tab.post(`/cvs/${cv.id}/delete`)).text).toContain("This CV was sent with 1 application. It can&#39;t");
  });
});

describe("7. a CV that wasn't sent can be deleted", () => {
  test("it's removed from the list", async () => {
    const keep = addCv(testUserId(), "Keep me", "text");
    const gone = addCv(testUserId(), "Delete me", "text");
    const tab = await logIn();
    const r = await tab.post(`/cvs/${gone.id}/delete`);
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe("/cvs");
    const page = (await tab.get("/cvs")).text;
    expect(page).not.toContain("Delete me");
    expect(page).toContain("Keep me");
    expect(cvRow(gone.id)).toBeUndefined();
    expect(cvRow(keep.id)).toBeTruthy();
  });
});

describe("8. the API includes job_post and cv", () => {
  test("GET /api/applications/:id", async () => {
    const tab = await logIn();
    const before = await tab.get(`/api/applications/${RAVI}`);
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ id: RAVI, company: "Ravi Systems", job_post: null, cv: null });

    const cv = addCv(testUserId(), "CV v3 – backend", "text");
    await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "We need Node.", cv_id: String(cv.id) });
    const after = await tab.get(`/api/applications/${RAVI}`);
    expect(after.body.job_post).toBe("We need Node.");
    expect(after.body.cv).toEqual({ id: cv.id, name: "CV v3 – backend" });
  });

  test("someone else's application is a 404", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    const theirs = addApplication(bilal, "Bilal's Secret Co", "Engineer", utcDate(2026, 10, 1)).id;
    const r = await (await logIn()).get(`/api/applications/${theirs}`);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("NOT_FOUND");
  });
});

describe("9. applications from before this feature", () => {
  test("a database made before F3 opens, and its applications have no job post and 'No CV chosen'", async () => {
    // Copy the test user into a database with the F1 schema: no cvs table, no job_post or cv_id.
    const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(TEST_EMAIL);
    closeDb();
    const file = path.join(path.dirname(process.env.JOBTRAIL_DB), "before-f3.db");
    const old = new Database(file);
    old.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
      CREATE TABLE login_failures (email TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
        company TEXT NOT NULL, role TEXT NOT NULL, source TEXT NOT NULL, applied_on TEXT, applied_on_raw TEXT,
        stage TEXT NOT NULL, next_step_on TEXT, notes TEXT NOT NULL DEFAULT '');
    `);
    old.prepare("INSERT INTO users VALUES (?, ?, ?, ?)").run(user.id, user.email, user.password_hash, user.created_at);
    old.prepare("INSERT INTO applications VALUES (1, ?, 'Old Co', 'Dev', 'manual', '2026-08-01', NULL, 'applied', NULL, '')").run(user.id);
    old.close();
    process.env.JOBTRAIL_DB = file;

    const tab = await logIn();
    const page = await tab.get("/applications/1");
    expect(page.status).toBe(200);
    expect(page.text).toContain("Old Co");
    expect(page.text).toMatch(/<textarea name="job_post" rows="10">\n<\/textarea>/);
    expect(page.text).toContain("<dd>No CV chosen</dd>");
    expect((await tab.get("/api/applications/1")).body).toMatchObject({ job_post: null, cv: null });

    // and the new columns work from now on
    const cv = addCv(user.id, "CV v1", "text");
    await tab.post("/applications/1").type("form").send({ job_post: "A post", cv_id: String(cv.id) });
    expect(getApplication(user.id, 1)).toMatchObject({ jobPost: "A post", cv: { id: cv.id, name: "CV v1" } });
  });

  test("applications in the sample data start with no job post and no CV", async () => {
    const r = await (await logIn()).get(`/applications/${RAVI}`);
    expect(r.text).toContain("<dd>No CV chosen</dd>");
    expect(appRow(RAVI)).toEqual({ job_post: null, cv_id: null });
  });
});

describe("10. someone else's CV", () => {
  test("attaching it is a 404 and nothing is saved", async () => {
    const theirs = bilalsCv();
    const tab = await logIn();
    const r = await tab.post(`/applications/${RAVI}`).type("form").send({ job_post: "A post", cv_id: String(theirs) });
    expect(r.status).toBe(404);
    expect(appRow(RAVI)).toEqual({ job_post: null, cv_id: null });
  });

  test("adding an application with it is a 404 and nothing is added", async () => {
    const theirs = bilalsCv();
    const tab = await logIn();
    const r = await tab.post("/applications").type("form").send({ company: "New Co", role: "Dev", applied_on: "2026-10-19", cv_id: String(theirs) });
    expect(r.status).toBe(404);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM applications WHERE company = 'New Co'").get().n).toBe(0);
  });

  test("reading or deleting it is a 404", async () => {
    const theirs = bilalsCv();
    const tab = await logIn();
    expect((await tab.get(`/cvs/${theirs}`)).status).toBe(404);
    expect((await tab.post(`/cvs/${theirs}/delete`)).status).toBe(404);
    expect(cvRow(theirs)).toBeTruthy();
    expect((await tab.get("/cvs")).text).not.toContain("Bilal");
  });
});

describe("open question: new applications default to the most recent CV", () => {
  test("the Add form's CV picker starts on the newest CV", async () => {
    addCv(testUserId(), "CV v2", "older");
    const newest = addCv(testUserId(), "CV v3", "newer");
    const tab = await logIn();
    const page = (await tab.get("/")).text;
    expect(page).toContain(`<option value="${newest.id}" selected>CV v3`);

    await tab.post("/applications").type("form").send({ company: "New Co", role: "Dev", applied_on: "2026-10-19", cv_id: String(newest.id) });
    const id = getDb().prepare("SELECT id FROM applications WHERE company = 'New Co'").get().id;
    expect((await tab.get(`/api/applications/${id}`)).body.cv).toEqual({ id: newest.id, name: "CV v3" });
  });

  test("choosing 'No CV chosen' adds it with no CV, and with no CVs there's no picker", async () => {
    const tab = await logIn();
    expect((await tab.get("/")).text).not.toContain('name="cv_id"');
    addCv(testUserId(), "CV v3", "text");
    await tab.post("/applications").type("form").send({ company: "New Co", role: "Dev", applied_on: "2026-10-19", cv_id: "" });
    expect(getDb().prepare("SELECT cv_id FROM applications WHERE company = 'New Co'").get().cv_id).toBeNull();
  });
});
