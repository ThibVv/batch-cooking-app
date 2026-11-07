import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME, BRAND_COLOR, CUSTOM_COLOR } from "@/lib/brand";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Planificateur de batch cooking",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      {CUSTOM_COLOR && (
        // La couleur choisie remplace celle du thème ; ses nuances foncée et claire en découlent
        <head>
          <style>{`:root{--color-brand:${BRAND_COLOR};--color-brand-dark:color-mix(in srgb,${BRAND_COLOR} 78%,black);--color-brand-soft:color-mix(in srgb,${BRAND_COLOR} 13%,white)}`}</style>
        </head>
      )}
      <body className={`${inter.variable} ${bricolage.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
