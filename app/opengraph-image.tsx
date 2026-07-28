import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Aluga Casa Búzios — Casas de temporada em Armação dos Búzios";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #0284c7 100%)",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.08)",
            top: -150,
            right: -70,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: 9999,
            background: "rgba(125, 211, 252, 0.12)",
            bottom: -130,
            left: -80,
          }}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            padding: "70px 85px",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#7dd3fc",
            }}
          >
            Casas de temporada
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 930,
              fontSize: 76,
              lineHeight: 1.05,
              fontWeight: 900,
            }}
          >
            Aluga Casa Búzios
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 850,
              fontSize: 31,
              lineHeight: 1.4,
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            Conforto, segurança e atendimento direto para sua hospedagem em
            Armação dos Búzios.
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 45,
              alignItems: "center",
              gap: 14,
              fontSize: 25,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            <span>🏠</span>
            <span>alugacasabuzios.com.br</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}