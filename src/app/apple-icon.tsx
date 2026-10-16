import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "linear-gradient(135deg,#7c5cff,#3b82f6)",
        }}
      >
        {bars.map((h, i) => (
          <div key={i} style={{ width: 13, height: h * 105, borderRadius: 7, background: "#fff" }} />
        ))}
      </div>
    ),
    size,
  );
}
