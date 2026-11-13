import { parseLyrics } from "@/utils/lyrics";

describe("parseLyrics", () => {
  it("returns one line per row of text", () => {
    expect(parseLyrics("Hello\nWorld")).toEqual([
      { text: "Hello", gap: false },
      { text: "World", gap: false },
    ]);
  });

  it("removes section tags and marks the next line as a new verse", () => {
    const lines = parseLyrics("[Verse 1]\nFirst line\n[Chorus]\nSecond line");

    expect(lines).toEqual([
      { text: "First line", gap: false },
      { text: "Second line", gap: true },
    ]);
  });

  it("treats an empty row as a verse break", () => {
    const lines = parseLyrics("One\n\nTwo");

    expect(lines[1]).toEqual({ text: "Two", gap: true });
  });

  it("trims spaces and handles Windows line endings", () => {
    expect(parseLyrics("  One  \r\nTwo")).toEqual([
      { text: "One", gap: false },
      { text: "Two", gap: false },
    ]);
  });

  it("returns an empty list when there are no lyrics", () => {
    expect(parseLyrics("")).toEqual([]);
  });
});
