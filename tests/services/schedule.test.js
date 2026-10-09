import { expect, test } from "vitest";
import { utcDate } from "../../src/dates.js";
import { makeApplication } from "../../src/models.js";
import { daysUntil, thisWeek } from "../../src/services/schedule.js";

const interview = (id, nextStepOn) =>
  makeApplication({ id, company: "Co", role: "Dev", source: "manual", appliedOn: utcDate(2026, 10, 1), stage: "interview", nextStepOn });

test("daysUntil", () => {
  expect(daysUntil(utcDate(2026, 10, 22), utcDate(2026, 10, 19))).toBe(3);
});

test("thisWeek keeps the next seven days", () => {
  const apps = [interview(1, utcDate(2026, 10, 20)), interview(2, utcDate(2026, 10, 30))];
  expect(thisWeek(apps, utcDate(2026, 10, 19)).map((a) => a.id)).toEqual([1]);
});
