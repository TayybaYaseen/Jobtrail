import request from "supertest";
import { expect, test } from "vitest";
import { app } from "../../src/app.js";

test("lists applications newest first", async () => {
  const r = await request(app).get("/api/applications");
  expect(r.status).toBe(200);
  const dates = r.body.map((a) => a.applied_on);
  expect(dates).toEqual([...dates].sort().reverse());
});

test("adds an application", async () => {
  const r = await request(app)
    .post("/api/applications")
    .send({ company: "Tariq Tech", role: "Developer", applied_on: "2026-10-12" });
  expect(r.status).toBe(201);
  expect(r.body.stage).toBe("applied");
});

test("an unknown stage returns the error shape", async () => {
  const r = await request(app).post("/api/applications/6/stage").send({ stage: "ghosted" });
  expect(r.status).toBe(400);
  expect(r.body.error.code).toBe("UNKNOWN_STAGE");
});
