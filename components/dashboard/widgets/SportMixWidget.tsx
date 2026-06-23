import { SportMix } from "@/components/SportMix";
import { useFilteredTrending } from "@/lib/dashboard/use-filtered-trending";
import type { WidgetComponentProps } from "@/lib/dashboard/types";

export function SportMixWidget(_props: WidgetComponentProps) {
  const { filtered } = useFilteredTrending();
  return <SportMix cards={filtered} />;
}
