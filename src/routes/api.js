import { Router } from "express";
import { parseIsoDate, toIso } from "../dates.js";
import { addApplication, moveStage, newestFirst } from "../services/applications.js";
import { loadApplications } from "../store.js";

export const apiRouter = Router();

export function appJson(app) {
  return {
    id: app.id,
    company: app.company,
    role: app.role,
    source: app.source,
    applied_on: toIso(app.appliedOn),
    stage: app.stage,
    next_step_on: app.nextStepOn ? toIso(app.nextStepOn) : null,
  };
}

apiRouter.get("/applications", (req, res) => {
  res.json(newestFirst(loadApplications()).map(appJson));
});

apiRouter.post("/applications", (req, res) => {
  const { company = "", role = "", applied_on } = req.body ?? {};
  const app = addApplication(company, role, parseIsoDate(applied_on));
  res.status(201).json(appJson(app));
});

apiRouter.post("/applications/:id/stage", (req, res) => {
  const { stage, next_step_on } = req.body ?? {};
  const app = moveStage(Number(req.params.id), stage, next_step_on ? parseIsoDate(next_step_on) : null);
  res.json(appJson(app));
});
