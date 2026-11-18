import { firstParam, parseSongSort } from "@/utils/searchParams";

describe("firstParam", () => {
  it("returns a single value as it is", () => {
    expect(firstParam("rock")).toBe("rock");
  });

  it("returns the first value when the key is repeated", () => {
    expect(firstParam(["rock", "jazz"])).toBe("rock");
  });

  it("returns undefined when the parameter is missing", () => {
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });
});

describe("parseSongSort", () => {
  it.each(["new", "az", "plays"] as const)("accepts %s", (sort) => {
    expect(parseSongSort(sort)).toBe(sort);
  });

  it("falls back to newest first for missing or unknown values", () => {
    expect(parseSongSort(undefined)).toBe("new");
    expect(parseSongSort("random")).toBe("new");
  });

  it("uses the first value when the key is repeated", () => {
    expect(parseSongSort(["az", "plays"])).toBe("az");
  });
});
