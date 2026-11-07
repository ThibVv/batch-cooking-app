import { PageSkeleton } from "@/components/ui";

export default function Loading() {
  return <PageSkeleton title="Recettes" cards={4} height="h-32" />;
}
