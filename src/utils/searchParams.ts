import type { SongSort } from "@/types";

/** A query-string value as Next.js passes it to a page: repeated keys arrive as an array. */
type SearchParam = string | string[] | undefined;

/** The first value of a query-string parameter, or undefined when it is missing. */
export function firstParam(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads a song sort order from the URL, falling back to newest first. */
export function parseSongSort(value: SearchParam): SongSort {
  const sort = firstParam(value);
  return sort === "az" || sort === "plays" ? sort : "new";
}
