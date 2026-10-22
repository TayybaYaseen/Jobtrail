// F6 · Dark mode. Tests for criteria 1–6 and the edge cases. 1, 4 and 5 are
// also checked by hand in DevTools; here they're checked in the HTML and CSS.

import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app.js";
import { getDb } from "../../src/db.js";
import { addCv } from "../../src/services/cvs.js";
import { ROOT } from "../../src/settings.js";
import { logIn, testUserId } from "../helpers.js";

const CSS = fs.readFileSync(path.join(ROOT, "public", "styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The opening <html> tag of a page. */
const htmlTag = (html) => html.match(/<html\b[^>]*>/)[0];

/** Every page a logged-in user can open. */
async function loggedInPages(tab) {
  const cv = addCv(testUserId(), "CV v3", "My CV");
  const pages = {};
  for (const url of ["/", "/this-week", "/cvs", `/cvs/${cv.id}`, "/applications/3", "/applications/3/prep", "/settings"]) {
    const r = await tab.get(url);
    expect(r.status, url).toBe(200);
    pages[url] = r.text;
  }
  return pages;
}

async function chooseTheme(tab, theme) {
  const r = await tab.post("/settings").type("form").send({ theme });
  expect(r.status).toBe(303);
  expect(r.headers.location).toBe("/settings?saved=1");
}

/** The variables declared in the first CSS block whose selector matches. */
function variables(selector) {
  const at = CSS.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  const body = CSS.slice(at, CSS.indexOf("}", at));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

describe("1 and 6. with no choice, JobTrail follows the device", () => {
  test("Log in and Sign up have no data-theme, so they follow the system setting", async () => {
    for (const page of ["/login", "/signup"]) {
      const html = (await request(app).get(page)).text;
      expect(htmlTag(html), page).toBe('<html lang="en">');
      expect(html, page).toContain('<meta name="color-scheme" content="light dark">');
    }
  });

  test("a user who never chose a theme gets Auto: no data-theme, and Auto is ticked in Settings", async () => {
    const tab = await logIn();
    const html = (await tab.get("/")).text;
    expect(htmlTag(html)).toBe('<html lang="en">');
    expect((await tab.get("/settings")).text).toMatch(/value="auto" checked/);
  });

  test("the stylesheet switches to dark for prefers-color-scheme: dark when there's no data-theme", () => {
    expect(CSS).toMatch(/@media screen and \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme\]\)\s*\{/);
  });
});

describe("2. the choice in Settings is used on every page and every device", () => {
  test("Settings offers Auto, Light and Dark, and is in the nav", async () => {
    const tab = await logIn();
    const html = (await tab.get("/settings")).text;
    for (const value of ["auto", "light", "dark"]) {
      expect(html).toMatch(new RegExp(`<label><input type="radio" name="theme" value="${value}"[^>]*> \\S`));
    }
    expect(html.match(/<nav[\s\S]*?<\/nav>/)[0]).toContain('<a href="/settings" aria-current="page">Settings</a>');
  });

  test("Settings needs a login", async () => {
    const r = await request(app).get("/settings");
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe("/login?next=%2Fsettings");
    const post = await request(app).post("/settings").type("form").send({ theme: "dark" });
    expect(post.headers.location).toBe("/login?next=%2F");
  });

  test("saving Dark says Saved, ticks Dark and puts it on every page", async () => {
    const tab = await logIn();
    await chooseTheme(tab, "dark");
    const settings = (await tab.get("/settings?saved=1")).text;
    expect(settings).toContain('<p class="saved" role="status">Saved</p>');
    expect(settings).toMatch(/value="dark" checked/);
    expect(settings).not.toMatch(/value="(auto|light)" checked/);
    for (const [url, html] of Object.entries(await loggedInPages(tab))) {
      expect(htmlTag(html), url).toBe('<html lang="en" data-theme="dark">');
    }
  });

  test("the choice is saved on the account, so another device gets it too", async () => {
    const phone = await logIn();
    const laptop = await logIn();
    await chooseTheme(phone, "light");
    expect(htmlTag((await laptop.get("/")).text)).toBe('<html lang="en" data-theme="light">');
    const again = await logIn(); // a fresh login, as on a new device
    expect(htmlTag((await again.get("/this-week")).text)).toBe('<html lang="en" data-theme="light">');
  });

  test("one user's choice doesn't change anyone else's pages", async () => {
    const other = request.agent(app);
    await other.post("/signup").type("form").send({ email: "hira@example.com", password: "12345678" });
    await chooseTheme(await logIn(), "dark");
    expect(htmlTag((await other.get("/")).text)).toBe('<html lang="en">');
  });
});

describe("3. data-theme on <html>", () => {
  test("Dark is \"dark\", Light is \"light\", Auto has no attribute", async () => {
    const tab = await logIn();
    for (const [theme, tag, scheme] of [
      ["dark", '<html lang="en" data-theme="dark">', "dark"],
      ["light", '<html lang="en" data-theme="light">', "light"],
      ["auto", '<html lang="en">', "light dark"],
    ]) {
      await chooseTheme(tab, theme);
      const html = (await tab.get("/")).text;
      expect(htmlTag(html), theme).toBe(tag);
      expect(html, theme).toContain(`<meta name="color-scheme" content="${scheme}">`);
    }
  });

  test("Auto is stored as no choice", async () => {
    const tab = await logIn();
    await chooseTheme(tab, "dark");
    await chooseTheme(tab, "auto");
    expect(getDb().prepare("SELECT theme FROM users WHERE id = ?").get(testUserId()).theme).toBeNull();
  });
});

describe("4. contrast in both themes", () => {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // Text, and the background it sits on somewhere in styles.css.
  const TEXT = [
    ["text", "bg"], // body, pasted text in a blockquote
    ["text", "surface"], // cards, panels, the job post textarea, the CV text box
    ["text", "accent-soft"], // notices
    ["muted", "bg"],
    ["muted", "surface"],
    ["accent", "bg"], // links
    ["accent", "surface"], // links in cards, secondary buttons
    ["accent", "accent-soft"], // stage badge, current page in the nav, Saved
    ["accent-text", "accent"], // buttons
    ["accent-text", "accent-hover"], // buttons on hover
    ["error", "error-soft"],
  ];
  // Buttons, field borders and the focus ring, against what's around them.
  const UI = [
    ["border", "bg"],
    ["border", "surface"],
    ["accent", "bg"],
    ["accent", "surface"],
    ["focus", "bg"],
    ["focus", "surface"],
  ];

  const themes = {
    light: variables(":root"),
    dark: variables(':root[data-theme="dark"]'),
  };

  test("the Auto dark block holds the same values as the Dark one", () => {
    expect(variables(":root:not([data-theme])")).toEqual(themes.dark);
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  for (const [name, vars] of Object.entries(themes)) {
    test(`${name}: text is at least 4.5:1, buttons and borders at least 3:1`, () => {
      for (const [fg, bg] of TEXT) expect(ratio(vars[fg], vars[bg]), `${name} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      for (const [fg, bg] of UI) expect(ratio(vars[fg], vars[bg]), `${name} ${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("5. no white flash", () => {
  test("the theme is in the HTML the server sends, before the stylesheet and any script", async () => {
    const tab = await logIn();
    await chooseTheme(tab, "dark");
    const html = (await tab.get("/")).text;
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head.indexOf('data-theme="dark"')).toBeLessThan(head.indexOf("<link rel=\"stylesheet\""));
    expect(head.indexOf('<meta name="color-scheme" content="dark">')).toBeLessThan(head.indexOf("<link"));
    expect(head.indexOf("data-theme")).toBeLessThan(head.indexOf("<script"));
    expect(html).not.toMatch(/dataset\.theme|setAttribute\(["']data-theme/); // no script sets it afterwards
  });
});

describe("edge cases", () => {
  test("a saved theme that isn't Auto, Light or Dark is treated as Auto", async () => {
    getDb().prepare("UPDATE users SET theme = ? WHERE id = ?").run("purple", testUserId());
    const tab = await logIn();
    expect(htmlTag((await tab.get("/")).text)).toBe('<html lang="en">');
    expect((await tab.get("/settings")).text).toMatch(/value="auto" checked/);
  });

  test("a posted theme that isn't Auto, Light or Dark saves Auto", async () => {
    const tab = await logIn();
    await chooseTheme(tab, "dark");
    for (const theme of ["purple", '"><script>', ""]) {
      await chooseTheme(tab, theme);
      expect(htmlTag((await tab.get("/")).text), theme).toBe('<html lang="en">');
    }
  });

  test("pasted job post and CV text sit on theme colours, so they're readable in both", () => {
    // textarea gets --surface/--text from the field rule; the CV text box is a .panel.
    expect(CSS).toMatch(/input,\s*textarea,\s*select\s*\{[^}]*background: var\(--surface\);[^}]*color: var\(--text\);/);
    expect(CSS).toMatch(/\.panel\s*\{[^}]*background: var\(--surface\);/);
    expect(CSS).toMatch(/\.prep-list blockquote\s*\{[^}]*background: var\(--bg\);/);
  });

  test("printing is always light: both dark blocks apply on screen only", () => {
    const blocks = [...CSS.matchAll(/@media ([^{]*)\{\s*:root(\[data-theme="dark"\]|:not\(\[data-theme\]\))/g)];
    expect(blocks).toHaveLength(2);
    for (const [, media] of blocks) expect(media.trim()).toMatch(/^screen\b/);
    expect(CSS.match(/:root[^{]*\{/g)).toHaveLength(3); // light, Dark, Auto-dark: nothing else
  });
});
