import { Router } from "express";
import {
  dayMonth,
  describeFollowUp,
  describeNextStep,
  describeOffer,
  describeThankYou,
  longDate,
  niceDate,
  salaryRange,
  stageLabel,
} from "../formatting.js";
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
  parseSalaryForm,
  saveJobPostAndCv,
  saveSalary,
} from "../services/applications.js";
import { setTheme } from "../services/accounts.js";
import { companyKey, companySlug, getCompany, listCompanies, notesFor, preview, saveNotes } from "../services/companies.js";
import { addCv, deleteCv, getCv, listCvs } from "../services/cvs.js";
import { getPrep, makePrep } from "../services/prep.js";
import { markThanked, parseReferrer, referrals, saveReferrer, thankYous } from "../services/referrals.js";
import { followUps, thisWeek } from "../services/schedule.js";
import { today } from "../settings.js";

export const webRouter = Router();

const helpers = { dayMonth, describeOffer, longDate, niceDate, salaryRange, stageLabel, toIso };

/** The application page's company panel: its address, and my notes on it (or null). */
function companyPanel(userId, app) {
  const key = companyKey(app.company);
  return { slug: companySlug(key), notes: notesFor(userId, key) };
}

/** What the salary fields show: the saved numbers, or "" when there's none. */
const salaryFields = (app) => ({
  salaryMin: app.salaryMin ?? "",
  salaryMax: app.salaryMax ?? "",
  salaryOffered: app.salaryOffered ?? "",
});

/** What the referrer fields show. */
const referrerFields = (app) => ({
  referrerName: app.referrer?.name ?? "",
  referrerHow: app.referrer?.how ?? "",
  referrerContact: app.referrer?.contact ?? "",
});

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
    ...salaryFields(app),
    ...referrerFields(app),
    company: companyPanel(req.user.id, app),
    preview,
    saved: req.query.saved === "1",
    error: null,
    ...helpers,
  });
});

webRouter.post("/applications/:id", (req, res) => {
  const id = Number(req.params.id);
  const { job_post = "", cv_id = "", salary_min, salary_max, salary_offered } = req.body ?? {};
  const { referrer_name, referrer_how, referrer_contact } = req.body ?? {};
  // A form without the salary or referrer fields (an older page) leaves those as they are.
  const hasSalary = [salary_min, salary_max, salary_offered].some((v) => v !== undefined);
  const hasReferrer = [referrer_name, referrer_how, referrer_contact].some((v) => v !== undefined);
  const data = () => ({
    ...getPrep(req.user.id, id), // app, prep, changed, cantPrep
    company: companyPanel(req.user.id, getApplication(req.user.id, id)),
    preview,
    cvs: listCvs(req.user.id),
    jobPost: job_post,
    cvId: cvIdFrom(cv_id),
    salaryMin: salary_min ?? "",
    salaryMax: salary_max ?? "",
    salaryOffered: salary_offered ?? "",
    referrerName: referrer_name ?? "",
    referrerHow: referrer_how ?? "",
    referrerContact: referrer_contact ?? "",
    saved: false,
  });
  renderOnAppError(res, "application", data, () => {
    // Everything is checked before anything is written, so an error saves nothing.
    const salary = hasSalary ? parseSalaryForm(salary_min, salary_max, salary_offered) : null;
    const referrer = hasReferrer ? parseReferrer(referrer_name, referrer_how, referrer_contact) : undefined;
    saveJobPostAndCv(req.user.id, id, job_post, cvIdFrom(cv_id));
    if (salary) saveSalary(req.user.id, id, salary);
    if (referrer !== undefined) saveReferrer(req.user.id, id, referrer);
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
    thankYous: thankYous(apps).map((a) => ({ id: a.id, text: describeThankYou(a) })),
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

// F8 · Referrals. Thanked saves today; it's on the Referrals page and in This Week.
function renderReferrals(req, res, error = null) {
  res.render("referrals", { referrals: referrals(listApplications(req.user.id)), error, ...helpers });
}

webRouter.get("/referrals", (req, res) => renderReferrals(req, res));

// Only these two pages have a Thanked button, so only they can be gone back to.
const THANKED_FROM = { "/referrals": renderReferrals, "/this-week": renderThisWeek };

webRouter.post("/applications/:id/thanked", (req, res) => {
  const back = Object.hasOwn(THANKED_FROM, req.body?.back) ? req.body.back : "/referrals";
  try {
    markThanked(req.user.id, Number(req.params.id));
  } catch (err) {
    if (!(err instanceof AppError) || err.status !== 404) throw err;
    // Removed in another tab (or never mine): say so, and show the list as it is now.
    return THANKED_FROM[back](req, res.status(404), "That referral no longer exists.");
  }
  res.redirect(303, back);
});

// F9 · Companies: my notes on each company I've applied to, and its applications.
webRouter.get("/companies", (req, res) => {
  res.render("companies", { companies: listCompanies(req.user.id), ...helpers });
});

webRouter.get("/companies/:slug", (req, res) => {
  const company = getCompany(req.user.id, req.params.slug);
  res.render("company", { company, text: company.notes?.text ?? "", saved: req.query.saved === "1", error: null, ...helpers });
});

webRouter.post("/companies/:slug", (req, res) => {
  const { slug } = req.params;
  const { notes = "" } = req.body ?? {};
  const data = () => ({ company: getCompany(req.user.id, slug), text: notes, saved: false });
  renderOnAppError(res, "company", data, () => {
    saveNotes(req.user.id, slug, notes);
    res.redirect(303, `/companies/${slug}?saved=1`);
  });
});
