/**
 * Nom et couleur de l'app, réglables sans toucher au code : dans Vercel,
 * Settings → Environment Variables, puis redéployer.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Batch cooking";

const DEFAULT_COLOR = "#1f6b4a";
const color = process.env.NEXT_PUBLIC_APP_COLOR?.trim() ?? "";
export const BRAND_COLOR = /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_COLOR;
export const CUSTOM_COLOR = BRAND_COLOR !== DEFAULT_COLOR;
