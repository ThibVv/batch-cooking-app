/**
 * Identité de l'app : une cocotte et sa vapeur, reprise de l'icône de l'app
 * (`src/app/icon.svg`). Le dessin prend la couleur courante, pour poser le
 * logo aussi bien en vert sur fond clair qu'en blanc sur fond vert.
 */

import { APP_NAME } from "@/lib/brand";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* la cocotte */}
      <path d="M14 30h36v10a10 10 0 0 1-10 10H24a10 10 0 0 1-10-10z" fill="currentColor" />
      {/* les anses */}
      <path d="M10 30h4M50 30h4" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
      {/* la vapeur */}
      <path d="M25 23c0-3.2 3-3.2 3-6.4S25 13.4 25 10.2M38 23c0-3.2 3-3.2 3-6.4S38 13.4 38 10.2" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/** Le logo complet : la cocotte et le nom. */
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display font-bold tracking-[-0.5px]" style={{ fontSize: size * 0.95 }}>
        {APP_NAME}
      </span>
    </span>
  );
}
