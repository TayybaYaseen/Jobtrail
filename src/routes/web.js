import { Router } from "express";
import { describeNextStep, niceDate, stageLabel } from "../formatting.js";
import { parseIsoDate, toIso } from "../dates.js";
import { STAGES } from "../models.js";
import { addApplication, moveStage, newestFirst } from "../services/applications.js";
import { thisWeek } from "../services/schedule.js";
import { today } from "../settings.js";
import { loadApplications } from "../store.js";

export const webRouter = Router();

const helpers = { niceDate, stageLabel, toIso };

webRouter.get("/", (req, res) => {
  const apps = newestFirst(loadApplications());
  res.render("applications", { apps, stages: STAGES, ...helpers });
});

webRouter.post("/applications", (req, res) => {
  const { company, role, applied_on } = req.body;
  addApplication(company, role, parseIsoDate(applied_on));
  res.redirect(303, "/");
});

webRouter.post("/applications/:id/stage", (req, res) => {
  const { stage, next_step_on } = req.body;
  moveStage(Number(req.params.id), stage, next_step_on ? parseIsoDate(next_step_on) : null);
  res.redirect(303, "/");
});

webRouter.get("/this-week", (req, res) => {
  const now = today();
  const lines = thisWeek(loadApplications(), now).map((a) => describeNextStep(a, now));
  res.render("this-week", { today: now, lines, ...helpers });
});
