import express from "express";
import path from "node:path";
import { loadUser, requireApiLogin, requirePageLogin } from "./auth.js";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";
import { webRouter } from "./routes/web.js";
import { AppError } from "./errors.js";
import { ROOT } from "./settings.js";

export const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(ROOT, "src", "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Styles are public: Log in and Sign up need them too.
app.use(express.static(path.join(ROOT, "public")));
app.use(loadUser);
// The nav marks the page you're on.
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Sign up and Log in are open to everyone; everything else needs a login.
app.use("/api", requireApiLogin, apiRouter);
app.use("/", authRouter);
app.use("/", requirePageLogin, webRouter);

// Errors: AppError becomes a JSON error; anything else is a bug, so log it.
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  console.error(err);
  res.status(500).send("Internal Server Error");
});
