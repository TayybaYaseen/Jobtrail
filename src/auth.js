// Who is logged in, and keeping everyone else out.

import { AppError } from "./errors.js";
import { SESSION_MAX_AGE_MS, userForSession } from "./services/accounts.js";

const COOKIE = "sid";

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(rest.join("="));
    } catch {
      return null; // a mangled cookie counts as no cookie
    }
  }
  return null;
}

/** Sets req.user (or null) from the session cookie. Unknown or tampered tokens mean logged out. */
export function loadUser(req, res, next) {
  req.sessionToken = readCookie(req, COOKIE);
  req.user = userForSession(req.sessionToken);
  res.locals.user = req.user;
  // F6: the page is sent with the theme already on <html>, so it never flashes white.
  // Logged out (Log in, Sign up) means Auto: follow the device.
  res.locals.theme = req.user?.theme ?? "auto";
  next();
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: SESSION_MAX_AGE_MS, path: "/" });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

/** Only paths on this site, so a link can't log you in and send you elsewhere. */
export function safeNext(next) {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export function requirePageLogin(req, res, next) {
  if (req.user) return next();
  const back = req.method === "GET" ? req.originalUrl : "/";
  res.redirect(`/login?next=${encodeURIComponent(back)}`);
}

export function requireApiLogin(req, res, next) {
  if (req.user) return next();
  next(new AppError("NOT_LOGGED_IN", "Log in first.", 401));
}
