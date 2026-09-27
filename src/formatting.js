// How dates and stages look on the page.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** e.g. "Tue 20 Oct". Blank when there's no date. */
export function niceDate(date) {
  if (!date) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${DAYS[date.getUTCDay()]} ${day} ${MONTHS[date.getUTCMonth()]}`;
}

export function stageLabel(stage) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
