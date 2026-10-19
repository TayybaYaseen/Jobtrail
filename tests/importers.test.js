import { expect, test } from "vitest";
import { utcDate } from "../src/dates.js";
import { parseLinkedinDate, parseRozeeDate } from "../src/importers.js";

test("LinkedIn dates are month first", () => {
  expect(parseLinkedinDate("10/07/2026")).toEqual(utcDate(2026, 10, 7));
});

test("Rozee dates are day first", () => {
  expect(parseRozeeDate("10/07/2026")).toEqual(utcDate(2026, 7, 10));
});
