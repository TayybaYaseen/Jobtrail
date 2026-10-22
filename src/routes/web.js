import { Router } from "express";
import { describeFollowUp, describeNextStep, longDate, niceDate, stageLabel } from "../formatting.js";
import { parseIsoDate, toIso } from "../dates.js";
import { AppError } from "../errors.js";
import { STAGES } from "../models.js";
import {
  addApplication,
  getApplication,
  listApplications,
  markFollowedUp,
  moveStage,
  newestFirst,
  saveJobPostAndCv,
} from "../services/applications.js";
import { setTheme } from "../services/accounts.js";
import { addCv, deleteCv, getCv, listCvs } from "../services/cvs.js";
import { getPrep, makePrep } from "../services/prep.js";
import { followUps, thisWeek } from "../services/schedule.js";
import { today } from "../settings.js";

export const webRouter = Router();

const helpers = { longDate, niceDate, stageLabel, toIso };

/** A CV picker's value: "" is "No CV chosen". Anything else that isn't a CV id is a 404 later. */
const cvIdFrom = (value) => (value ? Number(value) : null);

// Shows the page again with the message when the input is wrong. A 404 still
// goes to the error handler, so someone else's records look like missing ones.
function renderOnAppError(res, view, data, fn) {
  try {
    fn();
  } catch (err) {
    if (!(err instanceof AppError) || err.status === 404) throw err;
    res.status(err.status).render(view, { ...data(), error: err.message, ...helpers });
  }
}

webRouter.get("/", (req, res) => {
  const apps = newestFirst(listApplications(req.user.id));
  res.render("applications", { apps, stages: STAGES, cvs: listCvs(req.user.id), ...helpers });
});

webRouter.post("/applications", (req, res) => {
  const { company, role, applied_on, cv_id } = req.body;
  addApplication(req.user.id, company, role, parseIsoDate(applied_on), cvIdFrom(cv_id));
  res.redirect(303, "/");
});

webRouter.get("/applications/:id", (req, res) => {
  const app = getApplication(req.user.id, Number(req.params.id));
  const { prep, cantPrep } = getPrep(req.user.id, app.id);
  res.render("application", {
    app,
    prep,
    cantPrep,
    cvs: listCvs(req.user.id),
    jobPost: app.jobPost ?? "",
    cvId: app.cv?.id ?? null,
    saved: req.query.saved === "1",
    error: null,
    ...helpers,
  });
});

webRouter.post("/applications/:id", (req, res) => {
  const id = Number(req.params.id);
  const { job_post = "", cv_id = "" } = req.body ?? {};
  const data = () => ({
    ...getPrep(req.user.id, id), // app, prep, changed, cantPrep
    cvs: listCvs(req.user.id),
    jobPost: job_post,
    cvId: cvIdFrom(cv_id),
    saved: false,
  });
  renderOnAppError(res, "application", data, () => {
    saveJobPostAndCv(req.user.id, id, job_post, cvIdFrom(cv_id));
    res.redirect(303, `/applications/${id}?saved=1`);
  });
});

webRouter.post("/applications/:id/stage", (req, res) => {
  const { stage, next_step_on } = req.body;
  moveStage(req.user.id, Number(req.params.id), stage, next_step_on ? parseIsoDate(next_step_on) : null);
  res.redirect(303, "/");
});

// F5 · Interview prep. Opening the page never calls the AI; only the button does.
function renderPrep(req, res, error = null) {
  const { app, prep, changed, cantPrep } = getPrep(req.user.id, Number(req.params.id));
  res.render("prep", { app, prep, changed, cantPrep, error, ...helpers });
}

webRouter.get("/applications/:id/prep", (req, res) => renderPrep(req, res));

webRouter.post("/applications/:id/prep", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await makePrep(req.user.id, id);
  } catch (err) {
    if (!(err instanceof AppError) || err.status === 404) throw err;
    return renderPrep(req, res.status(err.status), err.message);
  }
  res.redirect(303, `/applications/${id}/prep`);
});

function renderThisWeek(req, res, error = null) {
  const now = today();
  const apps = listApplications(req.user.id);
  res.render("this-week", {
    today: now,
    lines: thisWeek(apps, now).map((a) => ({ id: a.id, text: describeNextStep(a, now) })),
    followUps: followUps(apps, now).map((f) => ({ id: f.app.id, text: describeFollowUp(f) })),
    error,
    ...helpers,
  });
}

webRouter.get("/this-week", (req, res) => renderThisWeek(req, res));

webRouter.post("/applications/:id/followed-up", (req, res) => {
  try {
    markFollowedUp(req.user.id, Number(req.params.id));
  } catch (err) {
    if (!(err instanceof AppError) || err.status !== 404) throw err;
    // Deleted in another tab (or never mine): say so, and show the list as it is now.
    return renderThisWeek(req, res.status(404), "That application no longer exists.");
  }
  res.redirect(303, "/this-week");
});

webRouter.get("/cvs", (req, res) => {
  res.render("cvs", { cvs: listCvs(req.user.id), name: "", text: "", error: null, ...helpers });
});

webRouter.post("/cvs", (req, res) => {
  const { name = "", text = "" } = req.body ?? {};
  renderOnAppError(res, "cvs", () => ({ cvs: listCvs(req.user.id), name, text }), () => {
    addCv(req.user.id, name, text);
    res.redirect(303, "/cvs");
  });
});

webRouter.get("/cvs/:id", (req, res) => {
  res.render("cv", { cv: getCv(req.user.id, Number(req.params.id)), ...helpers });
});

webRouter.post("/cvs/:id/delete", (req, res) => {
  renderOnAppError(res, "cvs", () => ({ cvs: listCvs(req.user.id), name: "", text: "" }), () => {
    deleteCv(req.user.id, Number(req.params.id));
    res.redirect(303, "/cvs");
  });
});

// F6 · Settings: Auto, Light or Dark, saved on the account.
webRouter.get("/settings", (req, res) => {
  res.render("settings", { theme: req.user.theme, saved: req.query.saved === "1", ...helpers });
});

webRouter.post("/settings", (req, res) => {
  setTheme(req.user.id, req.body?.theme);
  res.redirect(303, "/settings?saved=1");
});
