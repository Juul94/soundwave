export const VIBES = [
  "Happy", "Sad", "Romantic", "Chill", "Energetic", "Party", "Dance", "Old school",
  "Nostalgic", "Uplifting", "Dark", "Acoustic", "Rock", "Pop", "Hip hop", "Ballad",
] as const;

export const VOICES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "duet", label: "Duet" },
  { value: "any", label: "No preference" },
] as const;

export type Voice = (typeof VOICES)[number]["value"];

export type SongRequest = {
  id: string;
  title: string;
  moods: string[];
  voice: Voice;
  style_notes: string | null;
  lyrics: string | null;
  description: string | null;
  status: "new" | "done";
  created_at: string;
  profiles: { display_name: string | null; email: string | null } | null;
};
