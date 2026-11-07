import type { Criteria, Person } from "@/lib/types";

/** Critères de génération : ceux de la dernière semaine, complétés pour les personnes et réglages nouveaux. */
export function criteriaFor(people: Person[], previous?: Partial<Criteria>): Criteria {
  return {
    people: people.map(
      (p) =>
        previous?.people?.find((c) => c.personId === p.id) ?? {
          personId: p.id,
          count: 5,
          tags: p.likes,
        },
    ),
    maxMinutes: previous?.maxMinutes ?? 180,
    minTags: previous?.minTags ?? {},
    excludeIngredients: previous?.excludeIngredients ?? [],
    avoidRecentWeeks: previous?.avoidRecentWeeks ?? 3,
    shareIngredients: previous?.shareIngredients ?? true,
    usePantry: previous?.usePantry ?? true,
    share: previous?.share ?? true,
    extras: previous?.extras ?? {},
  };
}
