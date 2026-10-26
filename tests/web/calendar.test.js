// F10 · Interviews in Google Calendar. One test (or more) per acceptance criterion and edge case.
// Every date goes through src/dates.js (midnight UTC), never the local time zone.

import request from "supertest";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app.js";
import { addDays, parseIsoDate, toBasicDate, utcDate } from "../../src/dates.js";
import { signUp } from "../../src/services/accounts.js";
import { addApplication, getApplication, moveStage } from "../../src/services/applications.js";
import { calendarEvent, googleCalendarUrl, icsFile } from "../../src/services/calendar.js";
import { logIn, testUserId } from "../helpers.js";

// In sample.json: Gwadar Cloud (Offer, 3 Nov), Margalla Tech (Applied), Ravi Systems
// (Interview, 20 Oct), Indus Analytics (Interview, no date), Lahore Logic (Screening, 29 Oct).
const GWADAR = 1;
const MARGALLA = 2;
const RAVI = 3;
const INDUS = 4;
const LAHORE = 5;

const GOOGLE = "https://calendar.google.com/calendar/render?action=TEMPLATE";

/** The calendar links in a page (or part of one): { google, ics } or null. */
function calendarLinks(html) {
  const google = html.match(/<a href="([^"]+)" target="_blank" rel="noopener">Add to Google Calendar<\/a>/);
  const ics = html.match(/<a href="([^"]+)" download>Download \.ics<\/a>/);
  if (!google && !ics) return null;
  return { google: google?.[1].replaceAll("&amp;", "&"), ics: ics?.[1] };
}

/**
 * Checks an .ics file against RFC 5545 and returns its unfolded content lines.
 * CRLF line endings, no line over 75 bytes, BEGIN/END balanced, the required properties.
 */
function parseIcs(text) {
  expect(text.endsWith("\r\n")).toBe(true);
  const physical = text.slice(0, -2).split("\r\n");
  for (const line of physical) {
    expect(line).not.toMatch(/[\r\n]/);
    expect(Buffer.byteLength(line), line).toBeLessThanOrEqual(75);
  }
  const lines = physical.join("\r\n").replace(/\r\n /g, "").split("\r\n");
  const stack = [];
  for (const line of lines) {
    if (line.startsWith("BEGIN:")) stack.push(line.slice(6));
    if (line.startsWith("END:")) expect(stack.pop()).toBe(line.slice(4));
  }
  expect(stack).toEqual([]);
  expect(lines[0]).toBe("BEGIN:VCALENDAR");
  expect(lines.at(-1)).toBe("END:VCALENDAR");
  expect(lines).toContain("VERSION:2.0");
  expect(lines.some((l) => l.startsWith("PRODID:"))).toBe(true);
  expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  for (const prop of ["UID:", "DTSTAMP:", "DTSTART;VALUE=DATE:", "DTEND;VALUE=DATE:", "SUMMARY:"]) {
    expect(lines.filter((l) => l.startsWith(prop)), prop).toHaveLength(1);
  }
  return lines;
}

const prop = (lines, name) => lines.find((l) => l.startsWith(name)).slice(name.length);

/** SUMMARY text with the RFC 5545 escapes undone. */
const unescape = (value) => value.replace(/\\([\\;,nN])/g, (_, c) => (c === "n" || c === "N" ? "\n" : c));

describe("1. calendar links on the application page and This Week", () => {
  test("Screening, Interview and Offer with a next-step date have both links", async () => {
    const tab = await logIn();
    for (const id of [GWADAR, RAVI, LAHORE]) {
      const links = calendarLinks((await tab.get(`/applications/${id}`)).text);
      expect(links?.google, `application ${id}`).toMatch(/^https:\/\/calendar\.google\.com\//);
      expect(links.ics).toBe(`/applications/${id}/calendar.ics`);
    }
  });

  test("each This Week line has them, for its own application", async () => {
    const tab = await logIn();
    const html = (await tab.get("/this-week")).text;
    const items = html.match(/<ul class="week-list">[\s\S]*?<\/ul>/)[0].match(/<li>[\s\S]*?<\/li>/g);
    expect(items.length).toBeGreaterThan(0);
    for (const li of items) {
      const id = li.match(/href="\/applications\/(\d+)" class="week-link"/)[1];
      expect(calendarLinks(li)?.ics).toBe(`/applications/${id}/calendar.ics`);
    }
  });
});

describe("2. Add to Google Calendar", () => {
  test("Ravi Systems, Interview, 20 Oct 2026: the title and all-day dates 20261020/20261021", async () => {
    const tab = await logIn();
    const { google } = calendarLinks((await tab.get(`/applications/${RAVI}`)).text);
    expect(google.startsWith(`${GOOGLE}&`)).toBe(true);
    const params = new URL(google).searchParams;
    expect(params.get("action")).toBe("TEMPLATE");
    expect(params.get("text")).toBe("Interview · Ravi Systems (Associate Software Engineer)");
    expect(params.get("dates")).toBe("20261020/20261021");
  });
});

describe("3. Download .ics", () => {
  test("a valid iCalendar file with one all-day VEVENT and the same title", async () => {
    const tab = await logIn();
    const r = await tab.get(`/applications/${RAVI}/calendar.ics`);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(r.headers["content-disposition"]).toMatch(/^attachment; filename="?interview-ravi-systems\.ics"?$/);
    const lines = parseIcs(r.text);
    expect(prop(lines, "DTSTART;VALUE=DATE:")).toBe("20261020");
    expect(prop(lines, "DTEND;VALUE=DATE:")).toBe("20261021");
    expect(unescape(prop(lines, "SUMMARY:"))).toBe("Interview · Ravi Systems (Associate Software Engineer)");
    expect(prop(lines, "DTSTAMP:")).toMatch(/^\d{8}T\d{6}Z$/);
  });

  test("the UID stays the same for this application, and differs from another's", async () => {
    const tab = await logIn();
    const uid = async (id) => prop(parseIcs((await tab.get(`/applications/${id}/calendar.ics`)).text), "UID:");
    const first = await uid(RAVI);
    expect(await uid(RAVI)).toBe(first);
    moveStage(testUserId(), RAVI, "interview", parseIsoDate("2026-10-27")); // a new date: re-adding updates the same event
    expect(await uid(RAVI)).toBe(first);
    expect(await uid(LAHORE)).not.toBe(first);
  });

  test("needs a login", async () => {
    const r = await request(app).get(`/applications/${RAVI}/calendar.ics`);
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe(`/login?next=${encodeURIComponent(`/applications/${RAVI}/calendar.ics`)}`);
  });
});

describe("4. the title by stage", () => {
  test("Offer is Offer deadline; Screening is Screening", async () => {
    const tab = await logIn();
    const title = async (id) => new URL(calendarLinks((await tab.get(`/applications/${id}`)).text).google).searchParams.get("text");
    expect(await title(GWADAR)).toBe("Offer deadline · Gwadar Cloud (Graduate Software Engineer)");
    expect(await title(LAHORE)).toMatch(/^Screening · Lahore Logic \(/);
    const ics = parseIcs((await tab.get(`/applications/${GWADAR}/calendar.ics`)).text);
    expect(unescape(prop(ics, "SUMMARY:"))).toBe("Offer deadline · Gwadar Cloud (Graduate Software Engineer)");
  });
});

describe("5. no next step, no calendar links", () => {
  test("no date, Applied or Rejected: no links, and no .ics", async () => {
    const tab = await logIn();
    moveStage(testUserId(), LAHORE, "rejected", parseIsoDate("2026-10-29")); // a date, but Rejected
    for (const id of [INDUS, MARGALLA, LAHORE]) {
      expect(calendarLinks((await tab.get(`/applications/${id}`)).text), `application ${id}`).toBeNull();
      expect((await tab.get(`/applications/${id}/calendar.ics`)).status, `application ${id}`).toBe(404);
    }
    expect(calendarEvent({ ...getApplication(testUserId(), MARGALLA), nextStepOn: utcDate(2026, 10, 30) })).toBeNull();
  });
});

describe("6. someone else's application", () => {
  test("its .ics is a 404", async () => {
    const bilal = signUp("bilal@example.com", "bilal-password");
    const theirs = addApplication(bilal, "Bilal's Co", "Dev", utcDate(2026, 10, 1));
    moveStage(bilal, theirs.id, "interview", utcDate(2026, 10, 25));
    const tab = await logIn();
    const r = await tab.get(`/applications/${theirs.id}/calendar.ics`);
    expect(r.status).toBe(404);
    expect(r.text).not.toContain("BEGIN:VCALENDAR");
    expect((await tab.get("/applications/nope/calendar.ics")).status).toBe(404);
  });
});

describe("edge cases", () => {
  test("commas, semicolons, backslashes and emoji: escaped in the .ics, URL-encoded in the link", async () => {
    const tab = await logIn();
    const odd = addApplication(testUserId(), "Acme, Inc.; Lahore 🚀 \\ Labs", "Dev, Backend", utcDate(2026, 10, 1));
    moveStage(testUserId(), odd.id, "interview", utcDate(2026, 10, 24));
    const title = "Interview · Acme, Inc.; Lahore 🚀 \\ Labs (Dev, Backend)";

    const lines = parseIcs((await tab.get(`/applications/${odd.id}/calendar.ics`)).text);
    const summary = prop(lines, "SUMMARY:");
    expect(summary).toBe("Interview · Acme\\, Inc.\\; Lahore 🚀 \\\\ Labs (Dev\\, Backend)");
    expect(unescape(summary)).toBe(title);

    const { google } = calendarLinks((await tab.get(`/applications/${odd.id}`)).text);
    expect(google).toContain(`&text=${encodeURIComponent(title)}&`);
    expect(google).not.toMatch(/[ ,;🚀\\]/u);
    expect(new URL(google).searchParams.get("text")).toBe(title);
  });

  test("a long title is folded at 75 bytes without splitting a character", async () => {
    const tab = await logIn();
    const long = addApplication(testUserId(), "سسٹمز ".repeat(12) + "😀".repeat(10), "Engineer", utcDate(2026, 10, 1));
    moveStage(testUserId(), long.id, "interview", utcDate(2026, 10, 24));
    const r = await tab.get(`/applications/${long.id}/calendar.ics`);
    expect(r.text).toMatch(/\r\n /); // it was folded
    const lines = parseIcs(r.text); // and every physical line is 75 bytes or less
    expect(unescape(prop(lines, "SUMMARY:"))).toBe(`Interview · ${long.company} (Engineer)`);
    expect(r.text).not.toContain("�");
  });

  test("31 Dec 2026 ends on 20270101", async () => {
    const tab = await logIn();
    moveStage(testUserId(), RAVI, "interview", parseIsoDate("2026-12-31"));
    const { google } = calendarLinks((await tab.get(`/applications/${RAVI}`)).text);
    expect(new URL(google).searchParams.get("dates")).toBe("20261231/20270101");
    const lines = parseIcs((await tab.get(`/applications/${RAVI}/calendar.ics`)).text);
    expect(prop(lines, "DTEND;VALUE=DATE:")).toBe("20270101");
  });

  test("the same .ics downloaded twice has the same UID", async () => {
    const tab = await logIn();
    const a = parseIcs((await tab.get(`/applications/${RAVI}/calendar.ics`)).text);
    const b = parseIcs((await tab.get(`/applications/${RAVI}/calendar.ics`)).text);
    expect(prop(a, "UID:")).toBe(prop(b, "UID:"));
    expect(prop(a, "UID:")).toBe(`application-${RAVI}@jobtrail`);
  });

  test("dates come from src/dates.js in UTC: no shift from the local time zone", () => {
    const tz = process.env.TZ;
    try {
      for (const zone of ["Asia/Karachi", "America/Los_Angeles", "Pacific/Kiritimati"]) {
        process.env.TZ = zone;
        const event = calendarEvent({ id: 9, stage: "interview", company: "X", role: "Y", nextStepOn: parseIsoDate("2026-10-20") });
        expect(googleCalendarUrl(event), zone).toContain("&dates=20261020/20261021");
        expect(icsFile(event), zone).toContain("DTSTART;VALUE=DATE:20261020\r\n");
      }
    } finally {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    }
    expect(toBasicDate(addDays(utcDate(2026, 2, 28), 1))).toBe("20260301");
    expect(toBasicDate(addDays(utcDate(2028, 2, 28), 1))).toBe("20280229");
  });
});
