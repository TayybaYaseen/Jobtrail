import { expect, test } from "vitest";
import { logIn } from "../helpers.js";

test("lists applications newest first", async () => {
  const tab = await logIn();
  const r = await tab.get("/api/applications");
  expect(r.status).toBe(200);
  const dates = r.body.map((a) => a.applied_on);
  expect(dates).toEqual([...dates].sort().reverse());
});

test("adds an application", async () => {
  const tab = await logIn();
  const r = await tab
    .post("/api/applications")
    .send({ company: "Tariq Tech", role: "Developer", applied_on: "2026-10-12" });
  expect(r.status).toBe(201);
  expect(r.body.stage).toBe("applied");
});

test("an unknown stage returns the error shape", async () => {
  const tab = await logIn();
  const r = await tab.post("/api/applications/6/stage").send({ stage: "ghosted" });
  expect(r.status).toBe(400);
  expect(r.body.error.code).toBe("UNKNOWN_STAGE");
});
