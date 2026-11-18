"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Ctx = { has: (id: string) => boolean; toggle: (id: string) => Promise<void> };
const FavCtx = createContext<Ctx | null>(null);

export const useFavorites = () => {
  const c = useContext(FavCtx);
  if (!c) throw new Error("useFavorites outside FavoritesProvider");
  return c;
};

type FavoritesProviderProps = {
  userId: string;
  initial: string[];
  children: React.ReactNode;
};

export function FavoritesProvider({ userId, initial, children }: FavoritesProviderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [ids, setIds] = useState(() => new Set(initial));

  const toggle = useCallback(
    async (songId: string) => {
      const adding = !ids.has(songId);
      const apply = (add: boolean) =>
        setIds((prev) => {
          const n = new Set(prev);
          if (add) n.add(songId);
          else n.delete(songId);
          return n;
        });
      apply(adding); // optimistic
      const { error } = adding
        ? await supabase.from("favorites").insert({ user_id: userId, song_id: songId })
        : await supabase.from("favorites").delete().eq("user_id", userId).eq("song_id", songId);
      if (error && error.code !== "23505") apply(!adding); // roll back (ignore duplicate)
    },
    [ids, supabase, userId],
  );

  const value = useMemo(() => ({ has: (id: string) => ids.has(id), toggle }), [ids, toggle]);
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>;
}
