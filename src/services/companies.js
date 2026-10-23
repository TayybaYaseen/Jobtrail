// F9 · Company notes: what I've learned about each company, kept per company
// rather than per application, and private to me.
//
// A company is every one of my applications with the same name, compared
// trimmed and ignoring case. Its name is the first spelling I used. Names
// that differ in punctuation ("Ravi Systems Ltd.") are different companies.

import { createHash } from "node:crypto";
import { parseIsoDate, toIso } from "../dates.js";
import { getDb } from "../db.js";
import { AppError } from "../errors.js";
import { today } from "../settings.js";
import { listApplications } from "./applications.js";

export const MAX_NOTES_LENGTH = 5000;
export const PREVIEW_LENGTH = 200;

/** How a company is matched: "  Ravi Systems " and "ravi systems" are the same. */
export const companyKey = (name) => String(name ?? "").trim().toLowerCase();

/**
 * The company's address, e.g. "ravi-systems-1a2b3c": readable, plus a short
 * hash of the key so names that only differ in punctuation get different ones.
 */
export function companySlug(key) {
  const readable = key.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "company";
  return `${readable}-${createHash("sha256").update(key).digest("hex").slice(0, 6)}`;
}

/** Every company I've applied to, A to Z: { key, slug, name, apps }. Oldest application first in apps. */
export function listCompanies(userId) {
  const byKey = new Map();
  const apps = listApplications(userId).sort((a, b) => a.id - b.id); // the first spelling wins
  for (const app of apps) {
    const key = companyKey(app.company);
    if (!byKey.has(key)) byKey.set(key, { key, slug: companySlug(key), name: app.company.trim(), apps: [] });
    byKey.get(key).apps.push(app);
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function notFound(slug) {
  return new AppError("NOT_FOUND", `No company '${slug}'`, 404);
}

/** One company by its slug, with my notes ({ text, updatedOn } or null). 404 with no applications. */
export function getCompany(userId, slug) {
  const company = listCompanies(userId).find((c) => c.slug === slug);
  if (!company) throw notFound(slug);
  return { ...company, notes: notesFor(userId, company.key) };
}

/** My notes on a company, or null. */
export function notesFor(userId, key) {
  const row = getDb().prepare("SELECT notes, updated_on FROM company_notes WHERE user_id = ? AND company_key = ?").get(userId, key);
  return row ? { text: row.notes, updatedOn: parseIsoDate(row.updated_on) } : null;
}

/** Saves my notes on a company, dated today. Blank notes remove them. */
export function saveNotes(userId, slug, text) {
  text = typeof text === "string" ? text : "";
  if (text.length > MAX_NOTES_LENGTH) throw new AppError("NOTES_TOO_LONG", "Keep notes under 5,000 characters.");
  const { key } = getCompany(userId, slug); // 404 if I have no applications there
  const db = getDb();
  if (!text.trim()) {
    db.prepare("DELETE FROM company_notes WHERE user_id = ? AND company_key = ?").run(userId, key);
    return null;
  }
  db.prepare(
    `INSERT INTO company_notes (user_id, company_key, notes, updated_on) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, company_key) DO UPDATE SET notes = excluded.notes, updated_on = excluded.updated_on`,
  ).run(userId, key, text, toIso(today()));
  return notesFor(userId, key);
}

/** The first 200 characters of some notes, with "…" when there's more. */
export function preview(text) {
  const chars = Array.from(text.trim());
  return chars.length > PREVIEW_LENGTH ? `${chars.slice(0, PREVIEW_LENGTH).join("").trimEnd()}…` : chars.join("");
}
