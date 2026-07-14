import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#1B2430",
          padding: "80px",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#E8A33D",
            marginBottom: 40,
            boxShadow: "0 0 40px rgba(232,163,61,0.6)",
          }}
        />
        <div
          style={{
            fontSize: 84,
            color: "#EDE6D6",
            fontWeight: 600,
            letterSpacing: "-2px",
            marginBottom: 20,
          }}
        >
          Vates
        </div>
        <div style={{ fontSize: 32, color: "#96A0B2", textAlign: "center" }}>
          A daily-prompt writing space for fiction &amp; fanfic writers
        </div>
      </div>
    ),
    { ...size }
  );
}