/** The one error type JobTrail throws on purpose. Turned into JSON in app.js. */
export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
