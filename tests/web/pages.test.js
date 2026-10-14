import request from "supertest";
import { expect, test } from "vitest";
import { app } from "../../src/app.js";

test("applications page", async () => {
  const r = await request(app).get("/");
  expect(r.status).toBe(200);
  expect(r.text).toContain("Sindh Softworks");
  expect(r.text).toContain("Mon 21 Sep"); // Ravi Systems, imported from LinkedIn
});

test("ticket #101: the This Week page opens", async () => {
  const r = await request(app).get("/this-week");
  expect(r.status).toBe(200);
  expect(r.text).toContain("Ravi Systems");
});
