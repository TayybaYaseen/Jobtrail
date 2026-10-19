import { expect, test } from "vitest";
import { logIn } from "../helpers.js";

test("applications page", async () => {
  const tab = await logIn();
  const r = await tab.get("/");
  expect(r.status).toBe(200);
  expect(r.text).toContain("Sindh Softworks");
  expect(r.text).toContain("Mon 21 Sep"); // Ravi Systems, imported from LinkedIn
});

test("ticket #101: the This Week page opens", async () => {
  const tab = await logIn();
  const r = await tab.get("/this-week");
  expect(r.status).toBe(200);
  expect(r.text).toContain("Ravi Systems");
});
