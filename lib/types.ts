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
  pricecharting_id: string | null;
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
  ebay_title: string | null;
  ebay_item_id: string | null;
  ebay_url: string | null;
  purchase_price_cents: number;
  purchase_date: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pricecharting_id: string | null;
}

export interface WatchlistCard {
  id: string;
  user_id: string;
  search_key: string | null;
  sport: string;
  year: number | null;
  player_name: string;
  set_name: string | null;
  card_number: string | null;
  grade: string | null;
  image_url: string | null;
  ebay_title: string | null;
  ebay_item_id: string | null;
  ebay_url: string | null;
  target_price_cents: number | null;
  notes: string | null;
  snapshot_price_cents: number | null;
  snapshot_taken_at: string | null;
  created_at: string;
  updated_at: string;
  pricecharting_id: string | null;
}

/**
 * Categories we support for cards. Historically these were all sports, but
 * we've left the name as `Sport` to avoid a mass rename. New non-sport
 * categories (e.g. "pokemon", "formula1", "magic") can be added here
 * since the underlying DB column is plain `text`, no migration needed.
 */
export type Sport = "baseball" | "basketball" | "football" | "hockey" | "pokemon" | "formula1";

export const SPORTS: Sport[] = ["baseball", "basketball", "football", "hockey", "pokemon", "formula1"];

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
  /**
   * Canonical grade token parsed from the listing title
   * (e.g. "PSA 10", "BGS 9.5"). `null` means raw/ungraded or unparseable.
   */
  grade: string | null;
  imageUrl: string | null;
  currentPriceCents: number | null;
  trend7dPct: number | null;
  source: "ebay" | "mock";
}

export interface PriceHistoryPoint {
  date: string;
  priceCents: number;
}
