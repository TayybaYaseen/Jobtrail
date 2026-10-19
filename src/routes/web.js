import { Router } from "express";
import { describeNextStep, niceDate, stageLabel } from "../formatting.js";
import { parseIsoDate, toIso } from "../dates.js";
import { STAGES } from "../models.js";
import { addApplication, listApplications, moveStage, newestFirst } from "../services/applications.js";
import { thisWeek } from "../services/schedule.js";
import { today } from "../settings.js";

export const webRouter = Router();

const helpers = { niceDate, stageLabel, toIso };

webRouter.get("/", (req, res) => {
  const apps = newestFirst(listApplications(req.user.id));
  res.render("applications", { apps, stages: STAGES, ...helpers });
});

webRouter.post("/applications", (req, res) => {
  const { company, role, applied_on } = req.body;
  addApplication(req.user.id, company, role, parseIsoDate(applied_on));
  res.redirect(303, "/");
});

webRouter.post("/applications/:id/stage", (req, res) => {
  const { stage, next_step_on } = req.body;
  moveStage(req.user.id, Number(req.params.id), stage, next_step_on ? parseIsoDate(next_step_on) : null);
  res.redirect(303, "/");
});

webRouter.get("/this-week", (req, res) => {
  const now = today();
  const lines = thisWeek(listApplications(req.user.id), now).map((a) => describeNextStep(a, now));
  res.render("this-week", { today: now, lines, ...helpers });
});
