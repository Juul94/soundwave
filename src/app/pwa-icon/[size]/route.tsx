import { ImageResponse } from "next/og";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size: raw } = await ctx.params;
  const size = raw === "512" ? 512 : 192;
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5];
  const k = size / 180;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10 * k,
          background: "linear-gradient(135deg,#7c5cff,#3b82f6)",
        }}
      >
        {bars.map((h, i) => (
          <div key={i} style={{ width: 13 * k, height: h * 105 * k, borderRadius: 7 * k, background: "#fff" }} />
        ))}
      </div>
    ),
    { width: size, height: size },
  );
}
