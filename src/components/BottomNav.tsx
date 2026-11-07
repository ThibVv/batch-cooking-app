"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, CalendarIcon, CartIcon, DiceIcon, PotIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Semaine", Icon: CalendarIcon },
  { href: "/recettes", label: "Recettes", Icon: BookIcon },
  { href: "/generer", label: "Générer", Icon: DiceIcon },
  { href: "/courses", label: "Courses", Icon: CartIcon },
  { href: "/prep", label: "Prep", Icon: PotIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-[68px] max-w-md px-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors active:scale-95 ${
                active ? "font-semibold text-brand" : "text-muted"
              }`}
            >
              <span className={`transition-transform duration-200 ${active ? "-translate-y-px scale-110" : ""}`}>
                <Icon />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
