export const STAGES = ["applied", "screening", "interview", "offer", "rejected"];

// Stages where there's a next step with a date.
export const NEXT_STEP_STAGES = ["screening", "interview", "offer"];

/**
 * An application, as the rest of the app sees it.
 * appliedOn and nextStepOn are Dates (midnight UTC); nextStepOn can be null.
 * jobPost is the pasted job post or null; cv is the CV sent ({ id, name }) or null.
 * lastChangedOn (added, or stage changed) and followedUpOn are Dates or null.
 * salaryMin, salaryMax and salaryOffered are monthly rupees (whole numbers) or null.
 */
export function makeApplication({
  id,
  company,
  role,
  source,
  appliedOn,
  stage,
  nextStepOn = null,
  notes = "",
  jobPost = null,
  cv = null,
  lastChangedOn = null,
  followedUpOn = null,
  salaryMin = null,
  salaryMax = null,
  salaryOffered = null,
}) {
  return {
    id, company, role, source, appliedOn, stage, nextStepOn, notes, jobPost, cv, lastChangedOn, followedUpOn,
    salaryMin, salaryMax, salaryOffered,
  };
}
