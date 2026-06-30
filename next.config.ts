import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "writes-fabulous-connected-gmt.trycloudflare.com",
    "*.trycloudflare.com",
  ],
  // Desactiva el overlay de errores de Next.js dev (no aparece dentro de Telegram)
  devIndicators: false,
};

export default nextConfig;
