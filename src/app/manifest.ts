import type { MetadataRoute } from "next";
import { APP_NAME, BRAND_COLOR } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Planificateur de batch cooking",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4ef",
    theme_color: BRAND_COLOR,
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
