/** One lyric line; `gap` marks the start of a new verse. */
export type LyricLine = { text: string; gap?: boolean };

const TAG = /^\[[^\]]*\]$/; // Suno section tags like [Verse 1] or [Chorus]

export function parseLyrics(src: string): LyricLine[] {
  const out: LyricLine[] = [];
  let gap = false;
  for (const raw of src.replace(/\r/g, "").split("\n")) {
    const text = raw.trim();
    if (!text || TAG.test(text)) {
      gap = out.length > 0;
      continue;
    }
    out.push({ text, gap });
    gap = false;
  }
  return out;
}
