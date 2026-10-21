// F5 · The citation and shape checks on the model's answer.

import { describe, expect, test } from "vitest";
import { checkQuestions, normalise, parseAnswer, quoteFound } from "../../src/services/prep-check.js";

const JOB = "We need someone to design REST APIs in Node.js.\nYou will write SQL   queries every day.";
const CV = "Built a REST API with Express.\nDatabase course: SQL joins and indexes.";

const q = (question, why, talk) => ({ question, why: { quote: why }, talk_about: { quote: talk } });

describe("parseAnswer: the shape in criterion 8, anything else rejected", () => {
  test("reads a valid answer and trims the text", () => {
    const text = JSON.stringify({ questions: [q(" How do you design an API? ", " design REST APIs ", "Built a REST API")] });
    expect(parseAnswer(text)).toEqual([q("How do you design an API?", "design REST APIs", "Built a REST API")]);
  });

  test.each([
    ["not JSON", "Here are your questions: 1. Tell me about REST"],
    ["cut off JSON", '{"questions": [{"question": "Why'],
    ["JSON null", "null"],
    ["no questions array", JSON.stringify({ items: [] })],
    ["questions not an array", JSON.stringify({ questions: "REST" })],
    ["a question with no text", JSON.stringify({ questions: [q("", "design REST APIs", "Built a REST API")] })],
    ["a quote that isn't a string", JSON.stringify({ questions: [{ question: "Q?", why: { quote: 5 }, talk_about: { quote: "Built a REST API" } }] })],
    ["a missing talk_about", JSON.stringify({ questions: [{ question: "Q?", why: { quote: "design REST APIs" } }] })],
    ["a quote given as a plain string", JSON.stringify({ questions: [{ question: "Q?", why: "design REST APIs", talk_about: "Built" }] })],
  ])("rejects %s", (_name, text) => {
    expect(parseAnswer(text)).toBeNull();
  });
});

describe("quoteFound: word for word, ignoring case and repeated spaces", () => {
  test("ignores case, repeated spaces and line breaks", () => {
    expect(quoteFound("design rest apis", JOB)).toBe(true);
    expect(quoteFound("You will write SQL queries", JOB)).toBe(true); // three spaces in the post
    expect(quoteFound("in Node.js. You will", JOB)).toBe(true); // a line break in the post
  });

  test("drops a made-up quote, or one with words changed", () => {
    expect(quoteFound("5 years of Kubernetes experience", JOB)).toBe(false);
    expect(quoteFound("design RESTful APIs", JOB)).toBe(false);
    expect(quoteFound("design REST APIs ... SQL", JOB)).toBe(false);
  });

  test("a quote is 3 to 300 characters", () => {
    expect(quoteFound("We", JOB)).toBe(false);
    expect(quoteFound("We ", JOB)).toBe(false);
    expect(quoteFound("We n", JOB)).toBe(true);
    const long = "a".repeat(301);
    expect(quoteFound(long, long)).toBe(false);
    expect(quoteFound(long.slice(1), long)).toBe(true);
  });

  test("Urdu quotes match in their own script", () => {
    const post = "ہمیں ایک بیک اینڈ ڈویلپر چاہیے جو Node.js جانتا ہو۔";
    expect(quoteFound("بیک اینڈ ڈویلپر چاہیے", post)).toBe(true);
    expect(normalise("  Node.JS\n\tجانتا ")).toBe("node.js جانتا");
  });
});

describe("checkQuestions", () => {
  test("keeps a question only if both quotes are found in their own document", () => {
    const kept = checkQuestions(
      [
        q("REST?", "design REST APIs", "Built a REST API"),
        q("Made-up job quote?", "Kubernetes in production", "Built a REST API"),
        q("Made-up CV quote?", "write SQL queries", "Led a team of 20 data engineers"),
        q("Swapped sources?", "Built a REST API", "design REST APIs"),
        q("SQL?", "write SQL queries", "SQL joins and indexes"),
      ],
      JOB,
      CV,
    );
    expect(kept.map((k) => k.question)).toEqual(["REST?", "SQL?"]);
  });

  test("no question appears twice", () => {
    const kept = checkQuestions(
      [q("How do you design an API?", "design REST APIs", "Built a REST API"), q("how do you  design an API?", "write SQL queries", "SQL joins")],
      JOB,
      CV,
    );
    expect(kept).toHaveLength(1);
  });

  test("keeps at most 8", () => {
    const many = Array.from({ length: 11 }, (_, i) => q(`Question ${i}?`, "design REST APIs", "Built a REST API"));
    expect(checkQuestions(many, JOB, CV).map((k) => k.question)).toEqual(many.slice(0, 8).map((k) => k.question));
  });
});
