// F1 · Accounts and safe storage. One test (or more) per acceptance criterion.

import request from "supertest";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app.js";
import { getDb } from "../../src/db.js";
import { addApplication, listApplications } from "../../src/services/applications.js";
import { signUp } from "../../src/services/accounts.js";
import { utcDate } from "../../src/dates.js";
import { logIn, TEST_EMAIL, TEST_PASSWORD, testUserId } from "../helpers.js";

const WRONG_LOGIN = "Email or password is wrong.";

/** A second user, Bilal, with one application of his own. Returns his application id. */
function bilalWithOneApplication() {
  const bilal = signUp("bilal@example.com", "bilal-password");
  return addApplication(bilal, "Bilal's Secret Co", "Engineer", utcDate(2026, 10, 1)).id;
}

const getBilalApp = (id) => getDb().prepare("SELECT * FROM applications WHERE id = ?").get(id);

describe("1. sign up", () => {
  test("creates the account, logs me in and shows an empty Applications page", async () => {
    const tab = request.agent(app);
    const r = await tab.post("/signup").type("form").send({ email: "hira@example.com", password: "12345678" });
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe("/");

    const page = await tab.get("/");
    expect(page.status).toBe(200);
    expect(page.text).toContain("No applications yet");
    expect(page.text).not.toContain("Sindh Softworks");
  });

  test("Log in links to the Sign up form, which opens without logging in (Flow 1)", async () => {
    const login = await request(app).get("/login");
    expect(login.status).toBe(200);
    expect(login.text).toContain('<a href="/signup">Create an account</a>');
    const r = await request(app).get("/signup");
    expect(r.status).toBe(200);
    expect(r.text).toContain("<button>Sign up</button>");
  });

  test("after an error the form keeps the email (Flow 1)", async () => {
    const signup = await request(app).post("/signup").type("form").send({ email: TEST_EMAIL, password: "another-password" });
    expect(signup.text).toContain(`value="${TEST_EMAIL}"`);
    const login = await request(app).post("/login").type("form").send({ email: TEST_EMAIL, password: "wrong-password" });
    expect(login.text).toContain(`value="${TEST_EMAIL}"`);
  });

  test("a password under 8 characters is refused", async () => {
    const r = await request(app).post("/signup").type("form").send({ email: "hira@example.com", password: "1234567" });
    expect(r.text).toContain("Password must be at least 8 characters.");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?").get("hira@example.com").n).toBe(0);
  });

  test("email is trimmed and lowercased", async () => {
    await request(app).post("/signup").type("form").send({ email: "  Hira@Example.COM ", password: "hira-password" });
    expect(getDb().prepare("SELECT email FROM users WHERE email = ?").get("hira@example.com")).toBeTruthy();
    await logIn("hira@example.com", "hira-password"); // throws if it fails
    await logIn(" HIRA@example.com", "hira-password");
  });
});

describe("2. log in", () => {
  test("lands on Applications and shows only my applications", async () => {
    bilalWithOneApplication();
    const r = await request(app).post("/login").type("form").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe("/");

    const tab = await logIn();
    const page = await tab.get("/");
    expect(page.text).toContain("Sindh Softworks");
    expect(page.text).not.toContain("Bilal");
    const api = await tab.get("/api/applications");
    expect(api.body.map((a) => a.company)).not.toContain("Bilal's Secret Co");
  });
});

describe("3. wrong login", () => {
  test("a wrong password and an unknown email get the same message", async () => {
    const wrongPassword = await request(app).post("/login").type("form").send({ email: TEST_EMAIL, password: "nope-nope" });
    const unknownEmail = await request(app).post("/login").type("form").send({ email: "nobody@example.com", password: TEST_PASSWORD });
    for (const r of [wrongPassword, unknownEmail]) {
      expect(r.status).toBe(401);
      expect(r.text).toContain(WRONG_LOGIN);
      expect(r.text).toContain('action="/login"'); // still on Log in
      expect(r.headers["set-cookie"]).toBeUndefined();
    }
  });

  test("after 10 failures in 15 minutes, even the right password waits", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post("/login").type("form").send({ email: TEST_EMAIL, password: "wrong-password" });
    }
    const r = await request(app).post("/login").type("form").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(r.status).toBe(429);
    expect(r.text).toContain("Too many tries. Wait 15 minutes.");
  });

  test("failures older than 15 minutes don't count", async () => {
    const longAgo = Date.now() - 16 * 60 * 1000;
    const insert = getDb().prepare("INSERT INTO login_failures (email, at) VALUES (?, ?)");
    for (let i = 0; i < 10; i++) insert.run(TEST_EMAIL, longAgo);
    await logIn(); // throws if refused
  });
});

describe("4. pages need a login", () => {
  test("redirects to Log in, then back to the page I asked for", async () => {
    const r = await request(app).get("/this-week");
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe("/login?next=%2Fthis-week");

    const form = await request(app).get(r.headers.location);
    expect(form.text).toContain('name="next" value="/this-week"');

    const login = await request(app)
      .post("/login")
      .type("form")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, next: "/this-week" });
    expect(login.headers.location).toBe("/this-week");
  });

  test("every page except Sign up and Log in redirects", async () => {
    for (const path of ["/", "/this-week"]) {
      expect((await request(app).get(path)).status).toBe(302);
    }
    const post = await request(app).post("/applications").type("form").send({ company: "X", role: "Y", applied_on: "2026-10-12" });
    expect(post.status).toBe(302);
    expect(post.headers.location).toMatch(/^\/login/);
  });

  test("never sends me to another site after logging in", async () => {
    for (const next of ["//evil.example", "https://evil.example", "/\\evil.example"]) {
      const r = await request(app).post("/login").type("form").send({ email: TEST_EMAIL, password: TEST_PASSWORD, next });
      expect(r.headers.location).toBe("/");
    }
  });

  test("when my session expires, Log in sends me back to the page I wanted (Flow 1)", async () => {
    const tab = await logIn();
    getDb().prepare("UPDATE sessions SET expires_at = ?").run(Date.now() - 1000);
    const r = await tab.get("/this-week");
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe("/login?next=%2Fthis-week");
  });

  test("a tampered session cookie counts as logged out", async () => {
    const tab = await logIn();
    expect((await tab.get("/")).status).toBe(200);
    for (const cookie of ["sid=not-a-real-token", "sid=%E0%A4%A", "sid="]) {
      const r = await request(app).get("/").set("Cookie", cookie);
      expect(r.status).toBe(302);
    }
  });
});

describe("5. the API needs a login", () => {
  test("401 NOT_LOGGED_IN for every /api route", async () => {
    const calls = [
      request(app).get("/api/applications"),
      request(app).post("/api/applications").send({ company: "X", role: "Y", applied_on: "2026-10-12" }),
      request(app).post("/api/applications/1/stage").send({ stage: "offer" }),
      request(app).get("/api/this-week"),
    ];
    for (const r of await Promise.all(calls)) {
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe("NOT_LOGGED_IN");
    }
  });
});

describe("6. someone else's application is a 404", () => {
  test("stage change from the page", async () => {
    const id = bilalWithOneApplication();
    const tab = await logIn();
    const r = await tab.post(`/applications/${id}/stage`).type("form").send({ stage: "offer" });
    expect(r.status).toBe(404);
    expect(getBilalApp(id).stage).toBe("applied");
  });

  test("stage change from the API", async () => {
    const id = bilalWithOneApplication();
    const tab = await logIn();
    const r = await tab.post(`/api/applications/${id}/stage`).send({ stage: "offer", next_step_on: "2026-11-01" });
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("NOT_FOUND");
    expect(getBilalApp(id).stage).toBe("applied");
    expect(getBilalApp(id).next_step_on).toBeNull();
  });

  test("an id that doesn't exist looks the same", async () => {
    const tab = await logIn();
    expect((await tab.post("/api/applications/9999/stage").send({ stage: "offer" })).status).toBe(404);
    expect((await tab.post("/api/applications/abc/stage").send({ stage: "offer" })).status).toBe(404);
  });
});

describe("7–8. two tabs", () => {
  test("each tab adds a different application: both are saved", async () => {
    const tab1 = await logIn();
    const tab2 = tab1; // two tabs in one browser share the session cookie
    const before = listApplications(testUserId()).length;
    const [a, b] = await Promise.all([
      tab1.post("/applications").type("form").send({ company: "Tab One Co", role: "Dev", applied_on: "2026-10-18" }),
      tab2.post("/applications").type("form").send({ company: "Tab Two Co", role: "Dev", applied_on: "2026-10-18" }),
    ]);
    expect([a.status, b.status]).toEqual([303, 303]);
    const companies = listApplications(testUserId()).map((x) => x.company);
    expect(companies).toHaveLength(before + 2);
    expect(companies).toEqual(expect.arrayContaining(["Tab One Co", "Tab Two Co"]));
  });

  test("one tab changes application 3's stage while the other adds one: both are kept", async () => {
    const tab1 = await logIn();
    const tab2 = tab1; // two tabs in one browser share the session cookie
    await Promise.all([
      tab1.post("/applications/3/stage").type("form").send({ stage: "offer", next_step_on: "2026-11-02" }),
      tab2.post("/applications").type("form").send({ company: "Tab Two Co", role: "Dev", applied_on: "2026-10-18" }),
    ]);
    const apps = listApplications(testUserId());
    expect(apps.find((x) => x.id === 3).stage).toBe("offer");
    expect(apps.some((x) => x.company === "Tab Two Co")).toBe(true);
  });
});

describe("9. log out", () => {
  test("ends the session, and Applications redirects to Log in", async () => {
    const tab = await logIn();
    expect((await tab.get("/")).text).toContain("Log out");

    const r = await tab.post("/logout");
    expect(r.status).toBe(303);
    expect(r.headers.location).toBe("/login");

    const after = await tab.get("/");
    expect(after.status).toBe(302);
    expect(after.headers.location).toMatch(/^\/login/);
  });

  test("the old cookie no longer works, even if someone kept a copy", async () => {
    const login = await request(app).post("/login").type("form").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const cookie = login.headers["set-cookie"][0].split(";")[0];
    await request(app).post("/logout").set("Cookie", cookie);
    expect((await request(app).get("/").set("Cookie", cookie)).status).toBe(302);
  });
});

describe("10. an email can only have one account", () => {
  test("in any letter case", async () => {
    for (const email of [TEST_EMAIL, "  TEST@Example.com "]) {
      const r = await request(app).post("/signup").type("form").send({ email, password: "another-password" });
      expect(r.text).toContain("That email already has an account.");
    }
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM users").get().n).toBe(1);
  });
});

describe("12. passwords", () => {
  test("are stored only as a salted scrypt hash", () => {
    signUp("hira@example.com", TEST_PASSWORD); // same password as the test user
    const rows = getDb().prepare("SELECT * FROM users").all();
    for (const row of rows) {
      expect(row.password_hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
      expect(JSON.stringify(row)).not.toContain(TEST_PASSWORD);
    }
    expect(rows[0].password_hash).not.toBe(rows[1].password_hash); // different salts
  });
});
