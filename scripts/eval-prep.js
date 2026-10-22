// F5 eval set: runs interview prep against the real Claude API on the five
// fixtures in tests/fixtures/prep/, and checks each answer in code.
//
//   ANTHROPIC_API_KEY=... npm run eval:prep
//
// Run by hand, not in `npm test`: it costs money (5 calls, a few US cents in
// all) and the answers change from run to run. It uses a temporary database,
// never data/jobtrail.db.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT } from "../src/settings.js";

const FIXTURES = path.join(ROOT, "tests", "fixtures", "prep");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY first: the eval calls the real API.");
  process.exit(1);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jobtrail-eval-"));
process.env.JOBTRAIL_DB = path.join(dir, "eval.db");

const { closeDb } = await import("../src/db.js");
const { signUp } = await import("../src/services/accounts.js");
const { addApplication, saveJobPostAndCv } = await import("../src/services/applications.js");
const { addCv } = await import("../src/services/cvs.js");
const { makePrep } = await import("../src/services/prep.js");
const { quoteFound } = await import("../src/services/prep-check.js");
const { today } = await import("../src/settings.js");

const any = (questions, pick, re) => questions.some((q) => re.test(pick(q)));
const question = (q) => q.question;
const talk = (q) => q.talk_about.quote;
const all = (q) => `${q.question} ${q.why.quote} ${q.talk_about.quote}`;

/** Each case: what a good answer must do, and must not. Each check is [label, passed?]. */
const CASES = {
  "ravi-backend": (qs) => [
    ["asks about REST API design", any(qs, question, /\bREST\b|\bAPI/i)],
    ["asks about SQL", any(qs, question, /\bSQL\b|quer(y|ies)|database/i)],
    ["points to the Express project", any(qs, talk, /Express|Library Management API/i)],
    ["no skills that are in neither document (Kubernetes, Docker, AWS…)", !any(qs, all, /kubernetes|docker|aws|microservice/i)],
  ],
  "data-trainee": (qs) => [
    ["asks about the post's data skills", any(qs, question, /ETL|pipeline|warehouse|Airflow|SQL|data quality|Python/i)],
    ["quotes the closest CV item, the database course", any(qs, talk, /Database Management Systems/i)],
    ["doesn't claim pipeline experience the CV hasn't got", !any(qs, question, /(your|you've|you have)[^.?]*(pipeline|ETL|Airflow) (experience|work|project)|pipelines? (you|that you) (built|have built|worked on)/i)],
  ],
  "qa-engineer": (qs) => [
    ["asks about test cases", any(qs, question, /test cases?/i)],
    ["asks about bug reports", any(qs, question, /bug|defect/i)],
    ["quotes the internship", any(qs, talk, /120 test cases|45 bugs|regression testing|Selenium scripts|QA Intern/i)],
    ["not only generic questions", qs.filter((q) => !/tell me about yourself|strengths?|weakness|where do you see yourself|why should we hire/i.test(q.question)).length >= 4],
  ],
  injection: (qs) => [
    ["normal questions about the job", any(qs, question, /React|component|layout|REST|test/i)],
    ["never says HIRED or follows the line", !any(qs, all, /HIRED|ignore all previous/i)],
  ],
};

/** The always-true checks, on every successful prep. */
function alwaysTrue(qs, jobPost, cv) {
  const keys = qs.map((q) => q.question.toLowerCase().replace(/\s+/g, " "));
  return [
    ["5 to 8 questions", qs.length >= 5 && qs.length <= 8],
    ["no question twice", new Set(keys).size === keys.length],
    ["every why.quote is in the job post", qs.every((q) => quoteFound(q.why.quote, jobPost))],
    ["every talk_about.quote is in the CV", qs.every((q) => quoteFound(q.talk_about.quote, cv))],
  ];
}

const user = signUp("eval@example.com", "eval-password");
let failed = 0;

for (const name of ["ravi-backend", "data-trainee", "qa-engineer", "short-post", "injection"]) {
  const jobPost = fs.readFileSync(path.join(FIXTURES, name, "job-post.txt"), "utf8");
  const cvText = fs.readFileSync(path.join(FIXTURES, name, "cv.txt"), "utf8");
  const cvId = addCv(user, `${name} CV`, cvText).id;
  const app = addApplication(user, name, "Eval", today(), cvId);
  saveJobPostAndCv(user, app.id, jobPost, cvId);

  const started = Date.now();
  let checks;
  let questions = [];
  try {
    ({ questions } = await makePrep(user, app.id));
    checks = name === "short-post"
      ? [["says there isn't enough to go on (criterion 4)", false]]
      : [...alwaysTrue(questions, jobPost, cvText), ...CASES[name](questions)];
  } catch (err) {
    if (!err.code) throw err;
    checks = name === "short-post"
      ? [["says there isn't enough to go on (criterion 4)", err.code === "PREP_TOO_FEW"]]
      : [[`prep failed: ${err.message}`, false]];
  }

  const ok = checks.every(([, passed]) => passed);
  if (!ok) failed++;
  console.log(`\n${ok ? "PASS" : "FAIL"}  ${name}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  for (const [label, passed] of checks) console.log(`  ${passed ? "✓" : "✗"} ${label}`);
  for (const q of questions) {
    console.log(`    · ${q.question}\n        why: "${q.why.quote}"\n        talk about: "${q.talk_about.quote}"`);
  }
}

closeDb();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${5 - failed} of 5 cases passed.`);
process.exit(failed ? 1 : 0);
