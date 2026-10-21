import { Router } from "express";
import { parseIsoDate, toIso } from "../dates.js";
import { addApplication, getApplication, listApplications, moveStage, newestFirst } from "../services/applications.js";
import { followUps, label, thisWeek } from "../services/schedule.js";
import { today } from "../settings.js";

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
  res.json(newestFirst(listApplications(req.user.id)).map(appJson));
});

apiRouter.get("/applications/:id", (req, res) => {
  const app = getApplication(req.user.id, Number(req.params.id));
  res.json({ ...appJson(app), job_post: app.jobPost, cv: app.cv });
});

apiRouter.post("/applications", (req, res) => {
  const { company = "", role = "", applied_on } = req.body ?? {};
  const app = addApplication(req.user.id, company, role, parseIsoDate(applied_on));
  res.status(201).json(appJson(app));
});

apiRouter.post("/applications/:id/stage", (req, res) => {
  const { stage, next_step_on } = req.body ?? {};
  const app = moveStage(req.user.id, Number(req.params.id), stage, next_step_on ? parseIsoDate(next_step_on) : null);
  res.json(appJson(app));
});

apiRouter.get("/follow-ups", (req, res) => {
  res.json(followUps(listApplications(req.user.id), today()).map((f) => ({ ...appJson(f.app), days_silent: f.daysSilent })));
});

apiRouter.get("/this-week", (req, res) => {
  res.json(thisWeek(listApplications(req.user.id), today()).map((a) => ({ ...appJson(a), label: label(a) })));
});
