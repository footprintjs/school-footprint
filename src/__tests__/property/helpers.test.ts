import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  SCHOOL_TYPES_LIST,
  isValidSchoolType,
  getSchoolTypeConfig,
  getAllSchoolTypeConfigs,
  resolveSchoolTerminology,
  pluralize,
  checkFlowError,
} from "../../helpers.js";
import type { SchoolServiceResult } from "../../flows/schoolServiceComposer.js";

const validTypeArb = fc.constantFrom(...SCHOOL_TYPES_LIST);
const invalidTypeArb = fc.string().filter((s) => !(SCHOOL_TYPES_LIST as readonly string[]).includes(s));

describe("property: isValidSchoolType", () => {
  it("always returns true for valid types", () => {
    fc.assert(
      fc.property(validTypeArb, (type) => {
        expect(isValidSchoolType(type)).toBe(true);
      }),
    );
  });

  it("always returns false for invalid types", () => {
    fc.assert(
      fc.property(invalidTypeArb, (type) => {
        expect(isValidSchoolType(type)).toBe(false);
      }),
    );
  });
});

describe("property: getSchoolTypeConfig", () => {
  it("valid types always return config with matching type field", () => {
    fc.assert(
      fc.property(validTypeArb, (type) => {
        const config = getSchoolTypeConfig(type);
        expect(config).toBeDefined();
        expect(config!.type).toBe(type);
      }),
    );
  });

  it("invalid types always return undefined", () => {
    fc.assert(
      fc.property(invalidTypeArb, (type) => {
        expect(getSchoolTypeConfig(type)).toBeUndefined();
      }),
    );
  });

  it("configs are always deep copies (never share identity)", () => {
    fc.assert(
      fc.property(validTypeArb, (type) => {
        const a = getSchoolTypeConfig(type);
        const b = getSchoolTypeConfig(type);
        expect(a).toEqual(b);
        expect(a).not.toBe(b);
        expect(a!.theme).not.toBe(b!.theme);
      }),
    );
  });
});

describe("property: resolveSchoolTerminology", () => {
  it("every term has non-empty singular and plural", () => {
    fc.assert(
      fc.property(validTypeArb, (type) => {
        const terms = resolveSchoolTerminology(type);
        for (const label of Object.values(terms)) {
          expect(label.singular.length).toBeGreaterThan(0);
          expect(label.plural.length).toBeGreaterThan(0);
        }
      }),
    );
  });

  it("unknown types always produce same keys as k12", () => {
    fc.assert(
      fc.property(invalidTypeArb, (type) => {
        const k12Keys = Object.keys(resolveSchoolTerminology("k12")).sort();
        const keys = Object.keys(resolveSchoolTerminology(type)).sort();
        expect(keys).toEqual(k12Keys);
      }),
    );
  });
});

describe("property: pluralize", () => {
  it("always returns a non-empty string for non-empty input", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => /^[A-Za-z]+$/.test(s)),
        (word) => {
          expect(pluralize(word).length).toBeGreaterThan(0);
        },
      ),
    );
  });
});

describe("property: checkFlowError", () => {
  it("returns null for success, non-null for error", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("success", "error") as fc.Arbitrary<"success" | "error">,
        fc.string({ minLength: 1 }),
        (status, title) => {
          const result: SchoolServiceResult = {
            status,
            error: status === "error" ? "fail" : undefined,
            manifest: [],
            narrative: [],
          };
          const problem = checkFlowError(result, title);
          if (status === "success") {
            expect(problem).toBeNull();
          } else {
            expect(problem).not.toBeNull();
            expect(problem!.title).toBe(`${title} Failed`);
          }
        },
      ),
    );
  });
});

describe("property: getAllSchoolTypeConfigs", () => {
  it("always returns exactly 5 configs matching SCHOOL_TYPES_LIST", () => {
    const configs = getAllSchoolTypeConfigs();
    const keys = Object.keys(configs).sort();
    expect(keys).toEqual([...SCHOOL_TYPES_LIST].sort());
  });
});
