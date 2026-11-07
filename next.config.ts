import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos des plats : seule la banque d'images utilisée est autorisée
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
