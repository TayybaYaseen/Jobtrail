import { Router } from "express";
import { clearSessionCookie, safeNext, setSessionCookie } from "../auth.js";
import { AppError } from "../errors.js";
import { endSession, logIn, signUp, startSession } from "../services/accounts.js";

export const authRouter = Router();

// Shows the form again with the message when the input is wrong.
function renderOnAppError(res, view, data, fn) {
  try {
    fn();
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    res.status(err.status).render(view, { ...data, error: err.message });
  }
}

function logInAs(req, res, userId) {
  endSession(req.sessionToken);
  setSessionCookie(res, startSession(userId));
}

authRouter.get("/signup", (req, res) => {
  res.render("signup", { email: "", error: null });
});

authRouter.post("/signup", (req, res) => {
  const { email = "", password = "" } = req.body ?? {};
  renderOnAppError(res, "signup", { email }, () => {
    logInAs(req, res, signUp(email, password));
    res.redirect(303, "/");
  });
});

authRouter.get("/login", (req, res) => {
  res.render("login", { email: "", next: safeNext(req.query.next), error: null });
});

authRouter.post("/login", (req, res) => {
  const { email = "", password = "" } = req.body ?? {};
  const next = safeNext(req.body?.next);
  renderOnAppError(res, "login", { email, next }, () => {
    logInAs(req, res, logIn(email, password));
    res.redirect(303, next);
  });
});

authRouter.post("/logout", (req, res) => {
  endSession(req.sessionToken);
  clearSessionCookie(res);
  res.redirect(303, "/login");
});
