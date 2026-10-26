// F13 · The shared page: anyone with the link can read it, without logging in.
// It shows only a name and each application's company, role, stage and dates,
// and has nothing that changes anything: every method but GET is a 405.

import { Router } from "express";
import { niceDate, stageLabel } from "../formatting.js";
import { allowShareRequest, openLink, sharedPage } from "../services/sharing.js";

export const shareRouter = Router();

const helpers = { niceDate, stageLabel };

function render(res, status, data) {
  res.status(status);
  res.set({ "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex", "Cache-Control": "no-store" });
  res.render("share", { message: null, name: null, apps: [], ...data, ...helpers });
}

// A made-up token and someone's old one never reached here look the same, so
// the page gives no hint whether any user exists.
const doesntExist = (res) => render(res, 404, { message: "This link doesn't exist." });

// 30 requests a minute per IP, counting every request to a share URL.
shareRouter.use((req, res, next) => {
  if (allowShareRequest(req.ip)) return next();
  res.set("Retry-After", "60");
  render(res, 429, { message: "Too many requests. Try again in a minute." });
});

shareRouter.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  res.set("Allow", "GET, HEAD").status(405).send("Method Not Allowed");
});

shareRouter.get("/:token", (req, res) => {
  const link = openLink(req.params.token);
  if (!link) return doesntExist(res);
  if (link.turnedOff) return render(res, 410, { message: "This link has been turned off." });
  render(res, 200, sharedPage(link.userId));
});

shareRouter.use((req, res) => doesntExist(res));
