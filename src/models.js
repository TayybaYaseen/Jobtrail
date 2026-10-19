export const STAGES = ["applied", "screening", "interview", "offer", "rejected"];

// Stages where there's a next step with a date.
export const NEXT_STEP_STAGES = ["screening", "interview", "offer"];

/**
 * An application, as the rest of the app sees it.
 * appliedOn and nextStepOn are Dates (midnight UTC); nextStepOn can be null.
 */
export function makeApplication({ id, company, role, source, appliedOn, stage, nextStepOn = null, notes = "" }) {
  return { id, company, role, source, appliedOn, stage, nextStepOn, notes };
}
