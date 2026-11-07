import Image from "next/image";
import { LogoMark } from "@/components/Logo";

/**
 * Photo d'un plat, avec repli sur une vignette colorée tant qu'il n'y en a pas.
 * La teinte dépend du rang de la recette : la bibliothèque garde un air vivant
 * même sans aucune photo.
 */
const TINTS: [string, string][] = [
  ["#E7DCC8", "#D5C3A0"],
  ["#D9E6DA", "#BBD4BF"],
  ["#F1D9CC", "#E2BAA5"],
  ["#DCE3F2", "#BECBE7"],
  ["#E9E2C9", "#D6CB9F"],
  ["#E2D9E8", "#C8B8D4"],
];

export function RecipePhoto({
  name,
  url,
  index = 0,
  className = "",
  sizes = "(max-width: 480px) 50vw, 240px",
  glyph = 26,
  priority = false,
  children,
}: {
  name: string;
  url?: string | null;
  /** Rang dans la liste, pour varier les teintes de repli */
  index?: number;
  className?: string;
  sizes?: string;
  /** Taille de la cocotte affichée à la place d'une photo */
  glyph?: number;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const [from, to] = TINTS[index % TINTS.length];
  return (
    <div
      className={`relative overflow-hidden bg-chip ${className}`}
      style={url ? undefined : { background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {url ? (
        // alt vide : le nom du plat est juste à côté, la photo est décorative
        <Image src={url} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-white/60" title={name}>
          <LogoMark size={glyph} />
        </span>
      )}
      {children}
    </div>
  );
}
