import { Router } from "express";
import { parseIsoDate, toIso } from "../dates.js";
import { shownOffer } from "../formatting.js";
import { addApplication, getApplication, listApplications, moveStage, newestFirst } from "../services/applications.js";
import { makePrep } from "../services/prep.js";
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
    salary_min: app.salaryMin,
    salary_max: app.salaryMax,
    salary_offered: shownOffer(app), // null when the stage isn't Offer: kept, but hidden
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

// Makes a new interview prep (F5), replacing the saved one. Takes up to 30 seconds.
apiRouter.post("/applications/:id/prep", async (req, res) => {
  const prep = await makePrep(req.user.id, Number(req.params.id));
  res.json({ questions: prep.questions, created_on: toIso(prep.createdOn) });
});

apiRouter.get("/follow-ups", (req, res) => {
  res.json(followUps(listApplications(req.user.id), today()).map((f) => ({ ...appJson(f.app), days_silent: f.daysSilent })));
});

apiRouter.get("/this-week", (req, res) => {
  res.json(thisWeek(listApplications(req.user.id), today()).map((a) => ({ ...appJson(a), label: label(a) })));
});
