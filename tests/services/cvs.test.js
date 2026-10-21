import { describe, expect, test } from "vitest";
import { utcDate } from "../../src/dates.js";
import { saveJobPostAndCv } from "../../src/services/applications.js";
import { addCv, deleteCv, getCv, listCvs } from "../../src/services/cvs.js";
import { signUp } from "../../src/services/accounts.js";
import * as cvs from "../../src/services/cvs.js";
import { testUserId } from "../helpers.js";

describe("cvs", () => {
  test("addCv trims the name, keeps the text exactly, and dates it today", () => {
    const cv = addCv(testUserId(), "  CV v3  ", "  Hira\r\n  Khan  ");
    expect(cv).toMatchObject({ name: "CV v3", text: "  Hira\r\n  Khan  ", addedOn: utcDate(2026, 10, 19) });
  });

  test("listCvs is newest first, and only mine", () => {
    const a = addCv(testUserId(), "A", "a");
    const b = addCv(testUserId(), "B", "b");
    addCv(signUp("bilal@example.com", "bilal-password"), "Bilal's", "x");
    expect(listCvs(testUserId()).map((c) => c.id)).toEqual([b.id, a.id]);
  });

  test("there is no way to change a CV's text", () => {
    expect(Object.keys(cvs).filter((name) => /update|edit|save|set/i.test(name))).toEqual([]);
  });

  test("deleteCv counts only applications it was sent with", () => {
    const cv = addCv(testUserId(), "CV", "text");
    saveJobPostAndCv(testUserId(), 3, null, cv.id);
    expect(() => deleteCv(testUserId(), cv.id)).toThrow("This CV was sent with 1 application. It can't be deleted.");
    saveJobPostAndCv(testUserId(), 3, null, null);
    deleteCv(testUserId(), cv.id);
    expect(() => getCv(testUserId(), cv.id)).toThrow(/No CV/);
  });

  test("a bad id is a 404, not a crash", () => {
    for (const id of [NaN, 9999]) {
      expect(() => getCv(testUserId(), id)).toThrow(expect.objectContaining({ status: 404 }));
      expect(() => deleteCv(testUserId(), id)).toThrow(expect.objectContaining({ status: 404 }));
    }
  });
});
