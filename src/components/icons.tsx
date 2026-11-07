import type { SVGProps } from "react";

function Icon({ children, size = 22, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CalendarIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);
export const BookIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h11" />
  </Icon>
);
export const DiceIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="15" r="1" />
    <circle cx="15" cy="9" r="1" />
    <circle cx="9" cy="15" r="1" />
  </Icon>
);
export const CartIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </Icon>
);
export const PotIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
    <path d="M2 10h2M20 10h2M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" />
  </Icon>
);
export const ChevronRight = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const ChevronLeft = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);
export const SwapIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </Icon>
);
export const PlusIcon = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const LinkIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </Icon>
);
export const TrashIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);
export const SearchIcon = (p: { size?: number }) => (
  <Icon {...p} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
);

export const ListIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </Icon>
);

// Un pictogramme par rayon, pour donner un repère visuel aux ingrédients ------

const CarrotIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M14 6.5 17.5 10 9 18.5a3.5 3.5 0 0 1-1.8 1l-3.7.9.9-3.7a3.5 3.5 0 0 1 1-1.8z" />
    <path d="M14.5 6c.5-1.8 2-3 4-3 0 2-1.2 3.5-3 4M17.8 9.3c1.8-.4 3.2.3 4.2 2-1.9.8-3.6.6-4.8-.6" />
  </Icon>
);

const FishIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M3 12c2.8-3.6 6.4-5 9.5-5 3.5 0 5.6 2.4 5.6 5s-2.1 5-5.6 5C9.4 17 5.8 15.6 3 12Z" />
    <path d="M18.4 9.6 21.5 7v10l-3.1-2.6M8 11.5h.01" />
  </Icon>
);

const MilkIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M9.5 3h5v2.8l1.8 3.1V19a2 2 0 0 1-2 2h-4.6a2 2 0 0 1-2-2V8.9L9.5 5.8z" />
    <path d="M7.7 12h8.6" />
  </Icon>
);

const CanIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M6.5 6.5c0-1.4 2.5-2.5 5.5-2.5s5.5 1.1 5.5 2.5v11c0 1.4-2.5 2.5-5.5 2.5s-5.5-1.1-5.5-2.5z" />
    <path d="M6.5 6.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5M6.5 13c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" />
  </Icon>
);

const CakeIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M4 20.5h16V15a3.5 3.5 0 0 0-3.5-3.5h-9A3.5 3.5 0 0 0 4 15z" />
    <path d="M12 11.5v-3M12 5.5v.01M4 16.5c2 1.4 4 1.4 6 0s4-1.4 6 0 2.6 1 4 0" />
  </Icon>
);

const SnowIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8M12 6.5 9.5 4.5M12 6.5 14.5 4.5M12 17.5 9.5 19.5M12 17.5l2.5 2" />
  </Icon>
);

const BreadIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M4.5 11.5A4.5 4.5 0 0 1 9 7h6a4.5 4.5 0 0 1 4.5 4.5L17.8 20H6.2z" />
    <path d="M9.5 11.5 8 17M14.5 11.5 16 17" />
  </Icon>
);

const BagIcon = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M5.5 8h13l-1.2 11a2 2 0 0 1-2 1.8H8.7a2 2 0 0 1-2-1.8z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </Icon>
);

/** Pictogramme d'un rayon de la liste de courses. */
export const AISLE_ICONS: Record<string, (p: { size?: number }) => React.ReactElement> = {
  "Fruits & légumes": CarrotIcon,
  "Boucherie & poisson": FishIcon,
  Crèmerie: MilkIcon,
  Épicerie: CanIcon,
  "Épicerie sucrée": CakeIcon,
  Surgelés: SnowIcon,
  Boulangerie: BreadIcon,
  Autre: BagIcon,
};

/** Icône du rayon, avec repli sur le sac pour un rayon inconnu. */
export function AisleIcon({ aisle, size = 18 }: { aisle: string; size?: number }) {
  const Glyph = AISLE_ICONS[aisle] ?? BagIcon;
  return <Glyph size={size} />;
}
