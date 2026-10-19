// Copy an old JobTrail JSON file into someone's account. The file is only read.
//
//   npm run import-json -- --email zara@example.com --file data/jobtrail.json
//
// The account must exist (sign up first) and must not have applications yet.

import { parseArgs } from "node:util";
import { AppError } from "../src/errors.js";
import { importJsonFile } from "../src/services/import-json.js";

const { values } = parseArgs({ options: { email: { type: "string" }, file: { type: "string" } } });

if (!values.email || !values.file) {
  console.error("Usage: npm run import-json -- --email you@example.com --file data/jobtrail.json");
  process.exit(1);
}

try {
  const count = importJsonFile(values.email, values.file);
  console.log(`Imported ${count} applications into ${values.email.trim().toLowerCase()}.`);
} catch (err) {
  if (!(err instanceof AppError)) throw err;
  console.error(err.message);
  process.exit(1);
}
