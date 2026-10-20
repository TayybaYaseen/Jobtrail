// Moving someone's old JobTrail JSON file into their account.

import { AppError } from "../errors.js";
import { readJsonRecords } from "../store.js";
import { findUserByEmail, normalizeEmail } from "./accounts.js";
import { importRecords } from "./applications.js";

/** Copies every application in `file` into the account for `email`. Only reads the file. */
export function importJsonFile(email, file) {
  const user = findUserByEmail(email);
  if (!user) throw new AppError("NO_ACCOUNT", `No account for ${normalizeEmail(email)}. Sign up first.`, 404);
  return importRecords(user.id, readJsonRecords(file));
}
