import { cleanName } from "@/services/playlists";

// playlists.ts talks to Supabase. cleanName does not, so the client is replaced with an empty mock.
jest.mock("@/lib/supabase/client", () => ({ createClient: jest.fn() }));

describe("cleanName", () => {
  it("trims spaces at both ends", () => {
    expect(cleanName("  Road trip  ")).toBe("Road trip");
  });

  it("collapses repeated spaces into one", () => {
    expect(cleanName("Road    trip")).toBe("Road trip");
  });

  it("cuts the name at 60 characters", () => {
    expect(cleanName("a".repeat(100))).toHaveLength(60);
  });
});
