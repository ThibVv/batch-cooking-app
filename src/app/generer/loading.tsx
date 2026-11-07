import { PageSkeleton } from "@/components/ui";

export default function Loading() {
  return <PageSkeleton title="Nouvelle semaine" cards={5} height="h-28" />;
}
