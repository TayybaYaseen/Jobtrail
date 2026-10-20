import { describe, expect, test } from "vitest";
import { utcDate } from "../../src/dates.js";
import { makeApplication } from "../../src/models.js";
import { addApplication, listApplications, moveStage, newestFirst } from "../../src/services/applications.js";
import { testUserId } from "../helpers.js";

const app = (id, appliedOn) =>
  makeApplication({ id, company: "Co", role: "Dev", source: "manual", appliedOn, stage: "applied" });

describe("applications", () => {
  test("newestFirst sorts by applied date", () => {
    const apps = [app(1, utcDate(2026, 9, 1)), app(2, utcDate(2026, 10, 8)), app(3, utcDate(2026, 9, 20))];
    expect(newestFirst(apps).map((a) => a.id)).toEqual([2, 3, 1]);
  });

  test("addApplication saves it", () => {
    const added = addApplication(testUserId(), "Tariq Tech", "Developer", utcDate(2026, 10, 12));
    expect(added.stage).toBe("applied");
    expect(listApplications(testUserId()).some((a) => a.company === "Tariq Tech")).toBe(true);
  });

  test("moveStage with a date", () => {
    const moved = moveStage(testUserId(), 6, "interview", utcDate(2026, 10, 26));
    expect(moved.stage).toBe("interview");
    expect(moved.nextStepOn).toEqual(utcDate(2026, 10, 26));
  });

  test("an unknown stage is refused", () => {
    expect(() => moveStage(testUserId(), 6, "ghosted")).toThrow(/is not one of/);
  });

  test("ticket #103: newest application first", () => {
    expect(newestFirst(listApplications(testUserId()))[0].company).toBe("Thar Digital");
  });
});
