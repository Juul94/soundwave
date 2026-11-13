import type { VOICES } from "@/constants/requests";

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
