import { expect, test } from "vitest";
import { utcDate } from "../../src/dates.js";
import { makeApplication } from "../../src/models.js";
import { daysUntil, followUps, thisWeek } from "../../src/services/schedule.js";

const interview = (id, nextStepOn) =>
  makeApplication({ id, company: "Co", role: "Dev", source: "manual", appliedOn: utcDate(2026, 10, 1), stage: "interview", nextStepOn });

test("daysUntil", () => {
  expect(daysUntil(utcDate(2026, 10, 22), utcDate(2026, 10, 19))).toBe(3);
});

const applied = (id, appliedOn, more = {}) =>
  makeApplication({ id, company: `Co ${id}`, role: "Dev", source: "manual", appliedOn, stage: "applied", ...more });

test("followUps: 7+ days of silence, Applied only, longest first", () => {
  const today = utcDate(2026, 10, 19);
  const apps = [
    applied(1, utcDate(2026, 10, 12)), // 7 days
    applied(2, utcDate(2026, 10, 13)), // 6 days
    applied(3, utcDate(2026, 9, 1)), // 48 days
    applied(4, utcDate(2026, 9, 1), { lastChangedOn: utcDate(2026, 10, 15) }), // changed 4 days ago
    applied(5, utcDate(2026, 9, 1), { followedUpOn: utcDate(2026, 10, 10) }), // 9 days since following up
    interview(6, null),
  ];
  expect(followUps(apps, today).map((f) => [f.app.id, f.daysSilent])).toEqual([
    [3, 48],
    [5, 9],
    [1, 7],
  ]);
});

test("thisWeek keeps the next seven days", () => {
  const apps = [interview(1, utcDate(2026, 10, 20)), interview(2, utcDate(2026, 10, 30))];
  expect(thisWeek(apps, utcDate(2026, 10, 19)).map((a) => a.id)).toEqual([1]);
});
