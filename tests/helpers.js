import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { app } from "../src/app.js";
import { findUserByEmail } from "../src/services/accounts.js";

export const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "sample.json");

// The user every test starts logged in as. Owns the applications in sample.json.
export const TEST_EMAIL = "test@example.com";
export const TEST_PASSWORD = "test-password";

export const testUserId = () => findUserByEmail(TEST_EMAIL).id;

/** A supertest agent that keeps its session cookie, like one browser tab. */
export async function logIn(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const agent = request.agent(app);
  const r = await agent.post("/login").type("form").send({ email, password });
  if (r.status !== 303) throw new Error(`Log in as ${email} failed: ${r.status}`);
  return agent;
}
