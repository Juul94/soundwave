"use client";

import { createContext, useContext } from "react";

/** Set on a playlist page so song menus can offer "Remove from this playlist". */
export const PlaylistScope = createContext<{ remove: (songId: string) => void } | null>(null);
export const usePlaylistScope = () => useContext(PlaylistScope);
