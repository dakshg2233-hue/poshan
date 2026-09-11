import { describe, it, expect } from "vitest";
import { checkAiSafety, gateAiReply, SAFE_REPLACEMENT } from "./ai-safety";

/**
 * The gate that stands between a language model and a user's medication.
 *
 * Two failure modes, and they are not symmetric. A false negative — a
 * dosing instruction reaching a user — is the one that cannot be undone,
 * so the "must be caught" cases below are the point of this file. A false
 * positive costs a follow-up question, so the "must not be caught" cases
 * exist to stop the patterns growing until the chatbot refuses to discuss
 * food, which would be its own kind of failure.
 */

describe("checkAiSafety — dosing", () => {
  it.each([
    "You can take 500 mg twice daily with food.",
    "Start with 10 units of insulin before dinner.",
    "You should double your metformin if sugars stay high.",
    "It's fine to stop your atorvastatin for a few weeks.",
    "Take 2 tablets after meals.",
    "You could reduce the dose of your medication by half.",
  ])("catches %j", (text) => {
    const v = checkAiSafety(text);
    expect(v.safe).toBe(false);
    if (!v.safe) expect(v.category).toBe("dosing");
  });

  it("catches a drug name paired with a schedule", () => {
    const v = checkAiSafety("Metformin is usually taken twice daily.");
    expect(v.safe).toBe(false);
  });
});

describe("checkAiSafety — diagnosis", () => {
  it.each([
    "Based on what you've described, you have diabetes.",
    "You are prediabetic.",
    "That means you have PCOS.",
    "You have been diagnosed with hypothyroidism.",
  ])("catches %j", (text) => {
    const v = checkAiSafety(text);
    expect(v.safe).toBe(false);
    if (!v.safe) expect(["diagnosis", "lab_verdict"]).toContain(v.category);
  });

  it("does not catch education about a condition", () => {
    /* The whole value of the nutrition chatbot is explaining conditions.
       A gate that cannot tell "diabetes is a condition where…" from "you
       have diabetes" would make the product useless. */
    expect(
      checkAiSafety(
        "Diabetes is a condition where the body cannot regulate blood glucose well. Eating more fibre with each meal helps slow the rise after eating."
      ).safe
    ).toBe(true);

    expect(
      checkAiSafety("People with PCOS often find that a lower-glycaemic breakfast helps.").safe
    ).toBe(true);
  });
});

describe("checkAiSafety — lab verdicts", () => {
  it.each([
    "Your HbA1c is fine, nothing to worry about.",
    "Your results look normal.",
    "Don't worry about that cholesterol reading.",
    "Your sugar levels are dangerous.",
  ])("catches %j", (text) => {
    const v = checkAiSafety(text);
    expect(v.safe).toBe(false);
  });

  it("allows stating a reference range, which is education not judgment", () => {
    /* Deliberate gap documented in ai-safety.ts: the normal range is a
       fact about the test; "yours is fine" is a judgment about the person. */
    expect(
      checkAiSafety("The normal range for HbA1c is usually quoted as 4 to 5.6%.").safe
    ).toBe(true);
  });

  it("allows explaining what a marker measures", () => {
    expect(
      checkAiSafety(
        "HbA1c measures the average blood glucose over roughly three months. Wholegrains and pulses tend to move it slowly rather than sharply."
      ).safe
    ).toBe(true);
  });
});

describe("checkAiSafety — emergencies", () => {
  it.each([
    "I have crushing chest pain right now",
    "I can't breathe properly",
    "there is blood in my stool",
    "blood in stool since yesterday",
    "I have been having thoughts of harming myself",
    "I keep thinking about hurting myself",
    "I feel suicidal",
  ])("catches %j", (text) => {
    const v = checkAiSafety(text);
    expect(v.safe).toBe(false);
    if (!v.safe) expect(v.category).toBe("emergency");
  });

  it("ranks emergency above every other category", () => {
    /* A message that is both an emergency and a dosing question must be
       answered as an emergency. The ordering in CATEGORIES is what
       guarantees it, and ordering is exactly the thing a refactor breaks
       silently. */
    const v = checkAiSafety("I have chest pain, should I take 500 mg of aspirin?");
    expect(v.safe).toBe(false);
    if (!v.safe) expect(v.category).toBe("emergency");
  });
});

describe("checkAiSafety — ordinary nutrition answers pass", () => {
  it.each([
    "A katori of dal with two rotis is a good balance of protein and fibre for lunch.",
    "Try swapping white rice for brown rice at dinner — more fibre, slower rise.",
    "Ragi is one of the better millets for protein, and it works well as dosa.",
    "Adding curd to the meal helps, and it's a cheap way to get more protein.",
    "For a busy weekday, poha with peanuts takes ten minutes and keeps you full.",
  ])("passes %j", (text) => {
    expect(checkAiSafety(text).safe).toBe(true);
  });

  it("passes an empty reply", () => {
    expect(checkAiSafety("").safe).toBe(true);
  });
});

describe("gateAiReply", () => {
  it("answers an emergency from the user's own message, whatever the model said", () => {
    const r = gateAiReply(
      "Dal is a great source of protein and pairs well with rice.",
      "I'm having chest pain and feel breathless"
    );
    expect(r.gated).toBe("emergency");
    expect(r.text).toBe(SAFE_REPLACEMENT.emergency.en);
    expect(r.text).toContain("108");
  });

  it("lets a user ASK about their medication without gating the question", () => {
    /* A user is allowed to ask about metformin; they just can't be told
       what to do about it. Gating the question would refuse the very
       people the app exists for. */
    const r = gateAiReply(
      "Food can affect how you feel on that medicine. More fibre with meals is a good place to start, and your doctor can tell you whether anything needs changing.",
      "I take metformin, what should I eat?"
    );
    expect(r.gated).toBeNull();
  });

  it("replaces a dosing answer to that same question", () => {
    const r = gateAiReply(
      "You should increase your metformin to 1000 mg if sugars stay high.",
      "I take metformin, what should I eat?"
    );
    expect(r.gated).toBe("dosing");
    expect(r.text).toBe(SAFE_REPLACEMENT.dosing.en);
  });

  it("returns the model's own words untouched when nothing fires", () => {
    const reply = "Two rotis with a katori of rajma is a solid lunch.";
    expect(gateAiReply(reply, "what should I have for lunch?")).toEqual({
      text: reply,
      gated: null,
    });
  });

  it("answers in the user's language", () => {
    const r = gateAiReply("You have diabetes.", "am I diabetic?", "hi");
    expect(r.gated).toBe("diagnosis");
    expect(r.text).toBe(SAFE_REPLACEMENT.diagnosis.hi);
    expect(r.text).not.toBe(SAFE_REPLACEMENT.diagnosis.en);
  });

  it("names the boundary rather than refusing blankly", () => {
    /* A user told only "I can't help with that" asks the same question
       somewhere with fewer scruples. Every replacement must offer the
       thing Poshan CAN do. */
    for (const category of ["dosing", "diagnosis", "lab_verdict"] as const) {
      for (const lang of ["en", "hi"] as const) {
        expect(SAFE_REPLACEMENT[category][lang].length).toBeGreaterThan(80);
      }
    }
  });

  it("carries Indian emergency numbers in both languages", () => {
    for (const lang of ["en", "hi"] as const) {
      expect(SAFE_REPLACEMENT.emergency[lang]).toContain("108");
      expect(SAFE_REPLACEMENT.emergency[lang]).toContain("112");
      expect(SAFE_REPLACEMENT.emergency[lang]).toContain("14416");
    }
  });
});
