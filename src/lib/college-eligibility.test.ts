import { describe, it, expect, afterEach } from "vitest";
import { isCollegeEmail, canBuyCollegePlan, collegeVerificationOn } from "./college-eligibility";

const ENV_KEYS = ["COLLEGE_VERIFICATION", "COLLEGE_EMAIL_DOMAINS"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("isCollegeEmail", () => {
  it("accepts Indian academic domains", () => {
    expect(isCollegeEmail("a@iitd.ac.in")).toBe(true);
    expect(isCollegeEmail("a@snu.edu.in")).toBe(true);
    expect(isCollegeEmail("a@mit.edu")).toBe(true);
  });

  it("accepts a subdomain of an academic suffix", () => {
    /* Several IITs put students on their own subdomain; one suffix has to
       cover them without listing each college. */
    expect(isCollegeEmail("a@students.iitm.ac.in")).toBe(true);
    expect(isCollegeEmail("a@cse.iitb.ac.in")).toBe(true);
  });

  it("rejects ordinary consumer mail, which is the whole point", () => {
    expect(isCollegeEmail("a@gmail.com")).toBe(false);
    expect(isCollegeEmail("a@outlook.com")).toBe(false);
    expect(isCollegeEmail("a@poshan.co.in")).toBe(false);
  });

  it("is not fooled by an academic suffix inside the local part or a lookalike domain", () => {
    expect(isCollegeEmail("iitd.ac.in@gmail.com")).toBe(false);
    /* Endswith on the bare string would pass "notedu"; the leading dot in
       the suffix is what stops it. */
    expect(isCollegeEmail("a@notedu")).toBe(false);
    expect(isCollegeEmail("a@fake-ac.in")).toBe(false);
  });

  it("uses the LAST @, so an address with one in the local part still resolves", () => {
    expect(isCollegeEmail('"we@ird"@iitd.ac.in')).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isCollegeEmail("A@IITD.AC.IN")).toBe(true);
  });

  it("fails closed on a missing or malformed address", () => {
    expect(isCollegeEmail(null)).toBe(false);
    expect(isCollegeEmail(undefined)).toBe(false);
    expect(isCollegeEmail("")).toBe(false);
    expect(isCollegeEmail("no-at-sign")).toBe(false);
    expect(isCollegeEmail("trailing@")).toBe(false);
  });

  it("honours COLLEGE_EMAIL_DOMAINS, including subdomains of a listed domain", () => {
    expect(isCollegeEmail("a@ashoka.example")).toBe(false);
    process.env.COLLEGE_EMAIL_DOMAINS = "ashoka.example, @krea.example";
    expect(isCollegeEmail("a@ashoka.example")).toBe(true);
    expect(isCollegeEmail("a@students.ashoka.example")).toBe(true);
    /* A leading @ in the config is a natural way to write it and should not
       break the match. */
    expect(isCollegeEmail("a@krea.example")).toBe(true);
    expect(isCollegeEmail("a@notashoka.example")).toBe(false);
  });
});

describe("canBuyCollegePlan", () => {
  it("blocks a consumer address while the gate is on", () => {
    expect(collegeVerificationOn()).toBe(true);
    expect(canBuyCollegePlan("a@gmail.com")).toBe(false);
  });

  it("lets anyone through once the gate is switched off", () => {
    process.env.COLLEGE_VERIFICATION = "off";
    expect(collegeVerificationOn()).toBe(false);
    expect(canBuyCollegePlan("a@gmail.com")).toBe(true);
    expect(canBuyCollegePlan(null)).toBe(true);
  });

  it("only the literal \"off\" disables it — a typo leaves the gate on", () => {
    process.env.COLLEGE_VERIFICATION = "false";
    expect(canBuyCollegePlan("a@gmail.com")).toBe(false);
  });
});
