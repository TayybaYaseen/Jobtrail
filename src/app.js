import express from "express";
import path from "node:path";
import { webRouter } from "./routes/web.js";
import { apiRouter } from "./routes/api.js";
import { AppError } from "./errors.js";
import { ROOT } from "./settings.js";

export const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(ROOT, "src", "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", webRouter);
app.use("/api", apiRouter);

// Errors: AppError becomes a JSON error; anything else is a bug, so log it.
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  console.error(err);
  res.status(500).send("Internal Server Error");
});
