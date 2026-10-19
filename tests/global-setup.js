// Fails the whole run if any test changed data/jobtrail.json (users' real data).

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REAL_DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "jobtrail.json");
const fingerprint = () => (fs.existsSync(REAL_DATA) ? createHash("sha256").update(fs.readFileSync(REAL_DATA)).digest("hex") : "missing");

export default function setup() {
  const before = fingerprint();
  return () => {
    if (fingerprint() !== before) throw new Error("A test changed data/jobtrail.json. Tests must never touch real data.");
  };
}
