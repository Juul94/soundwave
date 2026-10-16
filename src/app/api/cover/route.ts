import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Private covers behind a stable URL, so each device downloads a cover once and then uses its own cache.
// Storage policies still apply: only signed-in, active members can read.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p");
  if (!p || p.includes("..")) return new Response(null, { status: 400 });
  const thumb = req.nextUrl.searchParams.has("t");

  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return new Response(null, { status: 401 });

  const covers = sb.storage.from("covers");
  let blob = thumb ? (await covers.download(`thumbs/${p}`)).data : null;
  const exact = !thumb || !!blob;
  blob ??= (await covers.download(p)).data;
  if (!blob) return new Response(null, { status: 404 });

  return new Response(blob, {
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      // paths are unique per upload, so a cover never changes; a missing thumbnail is retried after a day
      "Cache-Control": exact ? "private, max-age=31536000, immutable" : "private, max-age=86400",
    },
  });
}
