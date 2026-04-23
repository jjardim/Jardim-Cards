import type { CardSearchResult, MarketMover, PriceHistoryPoint } from "./types";

export const MOCK_TRENDING: MarketMover[] = [
  // Baseball
  { searchKey: "1993-sp-derek-jeter-279", playerName: "Derek Jeter", setName: "1993 SP", year: 1993, sport: "baseball", imageUrl: null, avgPriceCents: 285000, trend7dPct: 12.5, trend30dPct: 28.3, numSales: 47 },
  { searchKey: "2011-topps-update-mike-trout-us175", playerName: "Mike Trout", setName: "2011 Topps Update", year: 2011, sport: "baseball", imageUrl: null, avgPriceCents: 45000, trend7dPct: 8.2, trend30dPct: 15.7, numSales: 124 },
  { searchKey: "1952-topps-mickey-mantle-311", playerName: "Mickey Mantle", setName: "1952 Topps", year: 1952, sport: "baseball", imageUrl: null, avgPriceCents: 1250000, trend7dPct: 5.1, trend30dPct: 10.2, numSales: 8 },
  { searchKey: "2001-bowman-chrome-albert-pujols-340", playerName: "Albert Pujols", setName: "2001 Bowman Chrome", year: 2001, sport: "baseball", imageUrl: null, avgPriceCents: 32000, trend7dPct: -3.4, trend30dPct: 2.1, numSales: 65 },
  { searchKey: "2018-topps-chrome-ronald-acuna-193", playerName: "Ronald Acuna Jr", setName: "2018 Topps Chrome", year: 2018, sport: "baseball", imageUrl: null, avgPriceCents: 18500, trend7dPct: 22.1, trend30dPct: 45.6, numSales: 89 },
  { searchKey: "1989-upper-deck-ken-griffey-1", playerName: "Ken Griffey Jr", setName: "1989 Upper Deck", year: 1989, sport: "baseball", imageUrl: null, avgPriceCents: 8500, trend7dPct: -1.2, trend30dPct: -5.8, numSales: 210 },
  { searchKey: "2019-bowman-chrome-wander-franco-bcp1", playerName: "Wander Franco", setName: "2019 Bowman Chrome", year: 2019, sport: "baseball", imageUrl: null, avgPriceCents: 12000, trend7dPct: -18.5, trend30dPct: -42.3, numSales: 156 },
  { searchKey: "2020-bowman-chrome-jasson-dominguez", playerName: "Jasson Dominguez", setName: "2020 Bowman Chrome", year: 2020, sport: "baseball", imageUrl: null, avgPriceCents: 7500, trend7dPct: 15.3, trend30dPct: 32.8, numSales: 73 },
  // Basketball
  { searchKey: "1986-fleer-michael-jordan-57", playerName: "Michael Jordan", setName: "1986 Fleer", year: 1986, sport: "basketball", imageUrl: null, avgPriceCents: 3500000, trend7dPct: 4.2, trend30dPct: 8.1, numSales: 12 },
  { searchKey: "2003-topps-chrome-lebron-james-111", playerName: "LeBron James", setName: "2003 Topps Chrome", year: 2003, sport: "basketball", imageUrl: null, avgPriceCents: 850000, trend7dPct: 6.8, trend30dPct: 12.4, numSales: 28 },
  { searchKey: "2018-panini-prizm-luka-doncic-280", playerName: "Luka Doncic", setName: "2018 Panini Prizm", year: 2018, sport: "basketball", imageUrl: null, avgPriceCents: 42000, trend7dPct: 11.3, trend30dPct: 22.7, numSales: 95 },
  { searchKey: "2019-panini-prizm-zion-williamson-248", playerName: "Zion Williamson", setName: "2019 Panini Prizm", year: 2019, sport: "basketball", imageUrl: null, avgPriceCents: 15000, trend7dPct: -8.5, trend30dPct: -15.2, numSales: 180 },
  { searchKey: "1996-topps-chrome-kobe-bryant-138", playerName: "Kobe Bryant", setName: "1996 Topps Chrome", year: 1996, sport: "basketball", imageUrl: null, avgPriceCents: 450000, trend7dPct: 3.1, trend30dPct: 7.5, numSales: 22 },
  { searchKey: "2009-panini-stephen-curry", playerName: "Stephen Curry", setName: "2009 Panini", year: 2009, sport: "basketball", imageUrl: null, avgPriceCents: 125000, trend7dPct: 9.4, trend30dPct: 18.6, numSales: 35 },
  { searchKey: "2020-panini-prizm-anthony-edwards", playerName: "Anthony Edwards", setName: "2020 Panini Prizm", year: 2020, sport: "basketball", imageUrl: null, avgPriceCents: 8500, trend7dPct: 18.2, trend30dPct: 35.0, numSales: 145 },
  { searchKey: "2022-panini-prizm-victor-wembanyama", playerName: "Victor Wembanyama", setName: "2023 Panini Prizm", year: 2023, sport: "basketball", imageUrl: null, avgPriceCents: 22000, trend7dPct: 25.6, trend30dPct: 55.0, numSales: 200 },
  // Football
  { searchKey: "2000-bowman-chrome-tom-brady-236", playerName: "Tom Brady", setName: "2000 Bowman Chrome", year: 2000, sport: "football", imageUrl: null, avgPriceCents: 950000, trend7dPct: 2.3, trend30dPct: 5.8, numSales: 18 },
  { searchKey: "2017-panini-prizm-patrick-mahomes-269", playerName: "Patrick Mahomes", setName: "2017 Panini Prizm", year: 2017, sport: "football", imageUrl: null, avgPriceCents: 185000, trend7dPct: 7.2, trend30dPct: 14.3, numSales: 52 },
  { searchKey: "2020-panini-prizm-justin-herbert-325", playerName: "Justin Herbert", setName: "2020 Panini Prizm", year: 2020, sport: "football", imageUrl: null, avgPriceCents: 12500, trend7dPct: -4.1, trend30dPct: -9.8, numSales: 110 },
  { searchKey: "2020-panini-prizm-joe-burrow-307", playerName: "Joe Burrow", setName: "2020 Panini Prizm", year: 2020, sport: "football", imageUrl: null, avgPriceCents: 18000, trend7dPct: 13.5, trend30dPct: 28.9, numSales: 88 },
  { searchKey: "2021-panini-prizm-trevor-lawrence", playerName: "Trevor Lawrence", setName: "2021 Panini Prizm", year: 2021, sport: "football", imageUrl: null, avgPriceCents: 5500, trend7dPct: -12.3, trend30dPct: -25.0, numSales: 140 },
  { searchKey: "1958-topps-jim-brown-62", playerName: "Jim Brown", setName: "1958 Topps", year: 1958, sport: "football", imageUrl: null, avgPriceCents: 2800000, trend7dPct: 1.8, trend30dPct: 4.2, numSales: 5 },
  { searchKey: "2023-panini-prizm-cj-stroud", playerName: "C.J. Stroud", setName: "2023 Panini Prizm", year: 2023, sport: "football", imageUrl: null, avgPriceCents: 9500, trend7dPct: 20.1, trend30dPct: 42.0, numSales: 175 },
  { searchKey: "2024-panini-prizm-caleb-williams", playerName: "Caleb Williams", setName: "2024 Panini Prizm", year: 2024, sport: "football", imageUrl: null, avgPriceCents: 7200, trend7dPct: 15.8, trend30dPct: 30.0, numSales: 210 },
  // Hockey
  { searchKey: "1979-topps-wayne-gretzky-18", playerName: "Wayne Gretzky", setName: "1979 Topps", year: 1979, sport: "hockey", imageUrl: null, avgPriceCents: 1500000, trend7dPct: 3.5, trend30dPct: 6.2, numSales: 10 },
  { searchKey: "2005-upper-deck-sidney-crosby-201", playerName: "Sidney Crosby", setName: "2005 Upper Deck", year: 2005, sport: "hockey", imageUrl: null, avgPriceCents: 125000, trend7dPct: 5.2, trend30dPct: 11.0, numSales: 25 },
  { searchKey: "2015-upper-deck-connor-mcdavid-201", playerName: "Connor McDavid", setName: "2015 Upper Deck", year: 2015, sport: "hockey", imageUrl: null, avgPriceCents: 85000, trend7dPct: 8.9, trend30dPct: 16.5, numSales: 40 },
  { searchKey: "2016-upper-deck-auston-matthews", playerName: "Auston Matthews", setName: "2016 Upper Deck", year: 2016, sport: "hockey", imageUrl: null, avgPriceCents: 32000, trend7dPct: 6.1, trend30dPct: 13.2, numSales: 55 },
  { searchKey: "1966-topps-bobby-orr-35", playerName: "Bobby Orr", setName: "1966 Topps", year: 1966, sport: "hockey", imageUrl: null, avgPriceCents: 850000, trend7dPct: 2.0, trend30dPct: 4.8, numSales: 7 },
  { searchKey: "1951-parkhurst-gordie-howe-66", playerName: "Gordie Howe", setName: "1951 Parkhurst", year: 1951, sport: "hockey", imageUrl: null, avgPriceCents: 650000, trend7dPct: 1.5, trend30dPct: 3.2, numSales: 4 },
  { searchKey: "2023-upper-deck-connor-bedard", playerName: "Connor Bedard", setName: "2023 Upper Deck", year: 2023, sport: "hockey", imageUrl: null, avgPriceCents: 15000, trend7dPct: 22.0, trend30dPct: 48.0, numSales: 165 },
  { searchKey: "2019-upper-deck-cale-makar", playerName: "Cale Makar", setName: "2019 Upper Deck", year: 2019, sport: "hockey", imageUrl: null, avgPriceCents: 18500, trend7dPct: 10.5, trend30dPct: 20.3, numSales: 60 },
];

export const MOCK_SEARCH_RESULTS: CardSearchResult[] = [
  { id: "mock-1", title: "1993 SP Derek Jeter Foil #279 RC", playerName: "Derek Jeter", setName: "1993 SP", year: 1993, cardNumber: "279", sport: "baseball", grade: null, imageUrl: null, currentPriceCents: 285000, trend7dPct: 12.5, source: "mock" },
  { id: "mock-2", title: "2011 Topps Update Mike Trout #US175 RC", playerName: "Mike Trout", setName: "2011 Topps Update", year: 2011, cardNumber: "US175", sport: "baseball", grade: null, imageUrl: null, currentPriceCents: 45000, trend7dPct: 8.2, source: "mock" },
  { id: "mock-3", title: "1952 Topps Mickey Mantle #311", playerName: "Mickey Mantle", setName: "1952 Topps", year: 1952, cardNumber: "311", sport: "baseball", grade: null, imageUrl: null, currentPriceCents: 1250000, trend7dPct: 5.1, source: "mock" },
];

export function generateMockPriceHistory(basePriceCents: number, days: number = 90): PriceHistoryPoint[] {
  const points: PriceHistoryPoint[] = [];
  let price = basePriceCents * 0.85;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const volatility = (Math.random() - 0.45) * 0.04;
    price = Math.max(price * (1 + volatility), basePriceCents * 0.5);
    points.push({ date: date.toISOString().split("T")[0], priceCents: Math.round(price) });
  }
  return points;
}

export function getTrendingCards(sport?: string, yearMin?: number, yearMax?: number): MarketMover[] {
  let results = MOCK_TRENDING;
  if (sport) results = results.filter((r) => r.sport === sport);
  if (yearMin) results = results.filter((r) => (r.year ?? 0) >= yearMin);
  if (yearMax) results = results.filter((r) => (r.year ?? 9999) <= yearMax);
  return results.sort((a, b) => Math.abs(b.trend7dPct) - Math.abs(a.trend7dPct));
}

export function searchCards(query: string): CardSearchResult[] {
  const q = query.toLowerCase();
  return MOCK_SEARCH_RESULTS.filter(
    (card) => card.title.toLowerCase().includes(q) || card.playerName.toLowerCase().includes(q)
  );
}

export function getCardBySearchKey(searchKey: string): MarketMover | undefined {
  return MOCK_TRENDING.find((c) => c.searchKey === searchKey);
}

export function getRelatedCards(card: MarketMover): MarketMover[] {
  return MOCK_TRENDING.filter(
    (c) =>
      c.searchKey !== card.searchKey &&
      (c.sport === card.sport &&
        (isSimilarEra(c.year, card.year) || c.trend7dPct > 0 === card.trend7dPct > 0))
  ).slice(0, 4);
}

function isSimilarEra(yearA: number | null, yearB: number | null): boolean {
  if (!yearA || !yearB) return false;
  return Math.abs(yearA - yearB) <= 15;
}

export function getBuyPrice(card: MarketMover): { priceCents: number; label: string } {
  const discount = card.trend7dPct > 10 ? 0.88 : card.trend7dPct > 0 ? 0.92 : 0.95;
  const buyAt = Math.round(card.avgPriceCents * discount);
  let label: string;
  if (card.trend7dPct > 15) {
    label = "Hot card \u2013 prices are inflated. If you see it at this price, grab it.";
  } else if (card.trend7dPct > 5) {
    label = "Trending up. This is a fair entry point before it climbs more.";
  } else if (card.trend7dPct > -5) {
    label = "Stable price. Good time to buy if you want this card.";
  } else {
    label = "Price is dipping \u2013 could be a buy-low opportunity if you believe in the player.";
  }
  return { priceCents: buyAt, label };
}

export function getTrendReason(card: MarketMover): string {
  if (card.trend7dPct > 15) {
    return `${card.playerName} cards are surging. High demand with ${card.numSales} recent sales is driving prices up ${card.trend7dPct.toFixed(1)}% this week. Could be tied to a hot streak, award buzz, or prospect hype.`;
  } else if (card.trend7dPct > 5) {
    return `Steady climb for ${card.playerName}. With ${card.numSales} sales in the last week and a ${card.trend7dPct.toFixed(1)}% gain, collectors are showing renewed interest.`;
  } else if (card.trend7dPct > -5) {
    return `${card.playerName} cards are holding steady. The market is stable with ${card.numSales} recent transactions and minimal price movement.`;
  } else if (card.trend7dPct > -15) {
    return `${card.playerName} is cooling off, down ${Math.abs(card.trend7dPct).toFixed(1)}% this week. Could be a correction after a run-up, or fading interest.`;
  } else {
    return `Significant drop for ${card.playerName} \u2013 down ${Math.abs(card.trend7dPct).toFixed(1)}% this week across ${card.numSales} sales. Potential sell signal, or a contrarian buy opportunity.`;
  }
}
