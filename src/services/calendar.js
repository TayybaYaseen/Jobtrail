// F10 · Interviews in a calendar, with no Google sign-in: an "add event" link
// for Google Calendar, and an .ics file (RFC 5545) for any calendar app.
//
// Next steps have a date but no time, so every event is all day: it starts
// on the date and ends the next day (the end date isn't included).

import { addDays, toBasicDate } from "../dates.js";
import { NEXT_STEP_STAGES } from "../models.js";
import { today } from "../settings.js";

const WHAT = { screening: "Screening", interview: "Interview", offer: "Offer deadline" };

/** The calendar event for an application's next step, or null when there isn't one. */
export function calendarEvent(app) {
  if (!NEXT_STEP_STAGES.includes(app.stage) || !app.nextStepOn) return null;
  return {
    uid: `application-${app.id}@jobtrail`, // the same every time, so re-adding updates the event
    title: `${WHAT[app.stage]} · ${app.company} (${app.role})`,
    start: app.nextStepOn,
    end: addDays(app.nextStepOn, 1),
  };
}

const GOOGLE = "https://calendar.google.com/calendar/render?action=TEMPLATE";

/** Google Calendar's "add event" page, filled in. */
export function googleCalendarUrl(event) {
  const dates = `${toBasicDate(event.start)}/${toBasicDate(event.end)}`;
  return `${GOOGLE}&text=${encodeURIComponent(event.title)}&dates=${dates}`;
}

/** Text in an .ics value: backslash, semicolon, comma and line breaks are escaped (RFC 5545 3.3.11). */
function escapeText(text) {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
}

/**
 * Lines longer than 75 bytes are folded: a line break, then a space (RFC 5545 3.1).
 * Folds between characters, never inside one, so emoji and Urdu survive.
 */
function fold(line) {
  const parts = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    const limit = parts.length === 0 ? 75 : 74; // a folded line starts with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** A whole .ics file with the one event. */
export function icsFile(event) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobTrail//Interviews//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toBasicDate(today())}T000000Z`,
    `DTSTART;VALUE=DATE:${toBasicDate(event.start)}`,
    `DTEND;VALUE=DATE:${toBasicDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** A file name like "interview-ravi-systems.ics". */
export function icsFileName(app) {
  const name = `${app.stage}-${app.company}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${name || "event"}.ics`;
}
