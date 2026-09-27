import { toIso } from "../dates.js";
import { AppError } from "../errors.js";
import { STAGES } from "../models.js";
import { loadApplications, loadRecords, saveRecords } from "../store.js";

export function newestFirst(apps) {
  return [...apps].sort((a, b) => b.appliedOn - a.appliedOn);
}

export function getApplication(id) {
  const app = loadApplications().find((a) => a.id === id);
  if (!app) throw new AppError("NOT_FOUND", `No application with id ${id}`, 404);
  return app;
}

export function addApplication(company, role, appliedOn) {
  company = company.trim();
  role = role.trim();
  if (!company || !role) throw new AppError("MISSING_FIELDS", "Company and role are both required");
  const records = loadRecords();
  const id = Math.max(0, ...records.map((r) => r.id)) + 1;
  records.push({
    id,
    company,
    role,
    source: "manual",
    applied_on: toIso(appliedOn),
    stage: "applied",
    next_step_on: null,
    notes: "",
  });
  saveRecords(records);
  return getApplication(id);
}

export function moveStage(id, stage, nextStepOn = null) {
  if (!STAGES.includes(stage)) {
    throw new AppError("UNKNOWN_STAGE", `'${stage}' is not one of ${STAGES.join(", ")}`);
  }
  const records = loadRecords();
  const record = records.find((r) => r.id === id);
  if (!record) throw new AppError("NOT_FOUND", `No application with id ${id}`, 404);
  record.stage = stage;
  record.next_step_on = nextStepOn ? toIso(nextStepOn) : null;
  saveRecords(records);
  return getApplication(id);
}
