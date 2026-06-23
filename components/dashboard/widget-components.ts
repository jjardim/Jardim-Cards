import type { WidgetComponent, WidgetId } from "@/lib/dashboard/types";
import { DiscoverWidget } from "./widgets/DiscoverWidget";
import { HotCarouselWidget } from "./widgets/HotCarouselWidget";
import { HottestWidget } from "./widgets/HottestWidget";
import { MarketStatsWidget } from "./widgets/MarketStatsWidget";
import { PortfolioSummaryWidget } from "./widgets/PortfolioSummaryWidget";
import { RecentSoldWidget } from "./widgets/RecentSoldWidget";
import { SportMixWidget } from "./widgets/SportMixWidget";
import { TrendListWidget } from "./widgets/TrendListWidget";

export const WIDGET_COMPONENTS: Record<WidgetId, WidgetComponent> = {
  hottest: HottestWidget,
  portfolio: PortfolioSummaryWidget,
  discover: DiscoverWidget,
  "market-stats": MarketStatsWidget,
  "sport-mix": SportMixWidget,
  "hot-carousel": HotCarouselWidget,
  "trend-list": TrendListWidget,
  "recent-sold": RecentSoldWidget,
};
