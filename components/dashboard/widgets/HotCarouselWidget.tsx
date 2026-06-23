import { HotCarousel } from "@/components/HotCarousel";
import { useFilteredTrending } from "@/lib/dashboard/use-filtered-trending";
import type { WidgetComponentProps } from "@/lib/dashboard/types";

export function HotCarouselWidget(_props: WidgetComponentProps) {
  const { filtered } = useFilteredTrending();
  return <HotCarousel cards={filtered} />;
}
