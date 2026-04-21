export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SoldListing {
  id: string;
  ebay_item_id: string;
  title: string;
  player_name: string | null;
  set_name: string | null;
  year: number | null;
  card_number: string | null;
  sport: string;
  grade: string | null;
  sold_price_cents: number;
  sold_date: string;
  image_url: string | null;
  ebay_url: string;
  created_at: string;
}

export interface PriceAggregate {
  id: string;
  search_key: string;
  player_name: string;
  set_name: string | null;
  year: number | null;
  sport: string;
  grade: string | null;
  avg_price_cents: number;
  median_price_cents: number;
  min_price_cents: number;
  max_price_cents: number;
  num_sales: number;
  price_7d_ago_cents: number | null;
  price_30d_ago_cents: number | null;
  trend_7d_pct: number | null;
  trend_30d_pct: number | null;
  last_computed_at: string;
}

export interface PortfolioCard {
  id: string;
  user_id: string;
  card_name: string;
  search_key: string | null;
  sport: string;
  year: number | null;
  player_name: string;
  set_name: string | null;
  card_number: string | null;
  grade: string | null;
  image_url: string | null;
  back_image_url: string | null;
  purchase_price_cents: number;
  purchase_date: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Sport = "baseball" | "basketball" | "football" | "hockey";

export const SPORTS: Sport[] = ["baseball", "basketball", "football", "hockey"];

export interface MarketMover {
  searchKey: string;
  playerName: string;
  setName: string | null;
  year: number | null;
  sport: string;
  imageUrl: string | null;
  avgPriceCents: number;
  trend7dPct: number;
  trend30dPct: number | null;
  numSales: number;
}

export interface CardSearchResult {
  id: string;
  title: string;
  playerName: string;
  setName: string | null;
  year: number | null;
  cardNumber: string | null;
  sport: string;
  imageUrl: string | null;
  currentPriceCents: number | null;
  trend7dPct: number | null;
  source: "ebay" | "mock";
}

export interface PriceHistoryPoint {
  date: string;
  priceCents: number;
}
