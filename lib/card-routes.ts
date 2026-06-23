import type { MarketMover } from "@/lib/types";

type CardRouteInput = Pick<
  MarketMover,
  "searchKey" | "playerName" | "setName" | "year" | "sport" | "grade"
>;

/** Build a card detail URL with enough query params to preserve grade + identity. */
export function buildCardDetailHref(card: CardRouteInput): string {
  const qs = new URLSearchParams({
    player: card.playerName,
    sport: card.sport,
    ...(card.setName ? { set: card.setName } : {}),
    ...(card.year ? { year: String(card.year) } : {}),
    ...(card.grade ? { grade: card.grade } : {}),
  }).toString();
  return `/card/${card.searchKey}?${qs}`;
}
