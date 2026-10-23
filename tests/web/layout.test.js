// F2 · Works on a phone. Tests for the criteria that can be checked in HTML (1, 2, 3, 7, 8).
// 4, 5 and 6 (360px, 44px, the grid) are checked by hand in the browser.

import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app.js";
import { niceDate, stageLabel } from "../../src/formatting.js";
import { listApplications } from "../../src/services/applications.js";
import { companySlug } from "../../src/services/companies.js";
import { addCv } from "../../src/services/cvs.js";
import { ROOT } from "../../src/settings.js";
import { logIn, testUserId } from "../helpers.js";

/** Every page, as the user sees it. Logged out only for Log in and Sign up. */
async function allPages() {
  const cv = addCv(testUserId(), "CV v3 – backend", "My CV");
  const tab = await logIn();
  return {
    "/": (await tab.get("/")).text,
    "/this-week": (await tab.get("/this-week")).text,
    "/cvs": (await tab.get("/cvs")).text,
    "/cvs/:id": (await tab.get(`/cvs/${cv.id}`)).text,
    "/settings": (await tab.get("/settings")).text,
    "/referrals": (await tab.get("/referrals")).text,
    "/companies": (await tab.get("/companies")).text,
    "/companies/:slug": (await tab.get(`/companies/${companySlug("ravi systems")}`)).text,
    "/applications/:id": (await tab.get("/applications/3")).text,
    "/login": (await request(app).get("/login")).text,
    "/signup": (await request(app).get("/signup")).text,
  };
}

/** The <li class="app-card"> blocks on a page. */
const cards = (html) => html.match(/<li class="app-card">[\s\S]*?<\/li>\s*(?=<li class="app-card">|<\/ul>)/g) ?? [];

describe("1. one stylesheet, served from public/", () => {
  test("/styles.css is served as CSS, even when logged out", async () => {
    const r = await request(app).get("/styles.css");
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/text\/css/);
  });

  test("every page links it and has no inline <style>", async () => {
    for (const [page, html] of Object.entries(await allPages())) {
      expect(html, page).toContain('<link rel="stylesheet" href="/styles.css">');
      expect(html, page).not.toMatch(/<style[\s>]/i);
      expect(html, page).not.toMatch(/\sstyle=/i);
    }
  });
});

describe("2. colours are CSS variables", () => {
  test("every colour value is defined in a :root theme block and nowhere else", () => {
    const css = fs.readFileSync(path.join(ROOT, "public", "styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const root = css.match(/:root\s*\{([^}]*)\}/)[1];
    // F6: the dark theme blocks are :root[data-theme="dark"] and :root:not([data-theme])
    const rest = css.replace(/:root[^{]*\{[^}]*\}/g, "");
    const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;
    expect(rest).not.toMatch(COLOUR);
    expect(rest).not.toMatch(/:\s*(?:white|black|red|blue|green|gray|grey|purple)\b/i);
    expect(root).toMatch(/--accent:\s*#/);
  });
});

describe("3. applications are cards, not a table", () => {
  test("one card per application, each with company, role, stage, applied date and next step", async () => {
    const html = (await (await logIn()).get("/")).text;
    expect(html).not.toMatch(/<table/i);
    const apps = listApplications(testUserId());
    expect(apps.length).toBeGreaterThan(0);
    const found = cards(html);
    expect(found).toHaveLength(apps.length);
    for (const a of apps) {
      const card = found.find((c) => c.includes(`>${a.company}<`));
      expect(card, a.company).toBeDefined();
      expect(card).toContain(a.role);
      expect(card).toContain(`class="stage">${stageLabel(a.stage)}<`);
      expect(card).toContain(niceDate(a.appliedOn));
      expect(card).toContain(a.nextStepOn ? niceDate(a.nextStepOn) : "—");
    }
  });

  test("with no applications, the empty message shows instead of the list", async () => {
    const tab = request.agent(app);
    await tab.post("/signup").type("form").send({ email: "hira@example.com", password: "12345678" });
    const html = (await tab.get("/")).text;
    expect(html).toContain("No applications yet. Add your first one above.");
    expect(html).not.toContain('class="app-card"');
  });
});

describe("7. navigation", () => {
  test("shows Applications, This Week and Log out, and marks the current page", async () => {
    const tab = await logIn();
    for (const [page, current] of [["/", "Applications"], ["/this-week", "This Week"], ["/cvs", "CVs"]]) {
      const html = (await tab.get(page)).text;
      const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
      expect(nav).toContain('<a href="/"');
      expect(nav).toContain('<a href="/this-week"');
      expect(nav).toContain(">Log out</button>");
      expect(nav.match(/aria-current="page"/g), page).toHaveLength(1);
      expect(nav).toContain(`<a href="${page}" aria-current="page">${current}</a>`);
    }
  });

  test("when logged out, the nav has no app links", async () => {
    for (const page of ["/login", "/signup"]) {
      const nav = (await request(app).get(page)).text.match(/<nav[\s\S]*?<\/nav>/)[0];
      expect(nav).not.toContain("Applications");
      expect(nav).not.toContain("Log out");
    }
  });
});

describe("8. every field has a visible label", () => {
  test("each visible <input> and <select> sits inside a <label> with text", async () => {
    for (const [page, html] of Object.entries(await allPages())) {
      const labels = html.match(/<label>[\s\S]*?<\/label>/g) ?? [];
      for (const label of labels) {
        const text = label.replace(/<select[\s\S]*?<\/select>/g, "").replace(/<[^>]+>/g, "").trim();
        expect(text, `${page}: ${label}`).not.toBe("");
      }
      const outside = html.replace(/<label>[\s\S]*?<\/label>/g, "");
      const unlabelled = (outside.match(/<(?:input|select|textarea)\b[^>]*>/g) ?? []).filter((t) => !/type="hidden"/.test(t));
      expect(unlabelled, page).toEqual([]);
      expect(html, page).not.toMatch(/placeholder=/);
    }
  });
});
