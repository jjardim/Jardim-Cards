export interface ParsedCardData {
  playerName: string | null;
  setName: string | null;
  year: number | null;
  cardNumber: string | null;
  grade: string | null;
  rawText: string;
}

export function parseCardText(textBlocks: string[]): ParsedCardData {
  const rawText = textBlocks.join("\n");
  const allText = textBlocks.join(" ");

  return {
    year: extractYear(allText),
    setName: extractSetName(allText),
    playerName: extractPlayerName(textBlocks),
    cardNumber: extractCardNumber(allText),
    grade: extractGrade(allText),
    rawText,
  };
}

function extractYear(text: string): number | null {
  const match = text.match(/\b(19[0-9]{2}|20[0-2][0-9])\b/);
  return match ? parseInt(match[1]) : null;
}

const SET_PATTERNS = [
  /topps\s*(chrome|update|heritage|stadium\s*club|allen\s*&?\s*ginter|gallery|finest)?/i,
  /bowman\s*(chrome|draft|sterling|best|platinum)?/i,
  /upper\s*deck/i,
  /panini\s*(prizm|select|mosaic|chronicles|donruss|spectra|flawless|national\s*treasures)?/i,
  /donruss\s*(optic)?/i,
  /prizm/i,
  /sp\s*(authentic)?/i,
  /fleer\s*(ultra)?/i,
  /score/i,
];

function extractSetName(text: string): string | null {
  for (const pattern of SET_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

function extractPlayerName(textBlocks: string[]): string | null {
  const gradeKeywords = /\b(psa|bgs|sgc|cgc|gem|mint|near|graded|\d{1,2}(\.\d)?)\b/i;
  const setKeywords = /\b(topps|bowman|chrome|panini|prizm|donruss|upper|deck|sp|fleer|score|select|mosaic|rookie|rc|auto|refractor|parallel|insert|base)\b/i;
  const numberPattern = /^[\d#.\/\-]+$/;

  const candidates = textBlocks
    .map((b) => b.trim())
    .filter((b) => b.length >= 3)
    .filter((b) => !gradeKeywords.test(b))
    .filter((b) => !numberPattern.test(b))
    .filter((b) => {
      const words = b.split(/\s+/);
      const setWordCount = words.filter((w) => setKeywords.test(w)).length;
      return setWordCount < words.length / 2;
    });

  const nameLike = candidates.find((c) => {
    const words = c.split(/\s+/);
    return words.length >= 2 && words.length <= 4 && /^[A-Z]/.test(c);
  });

  return nameLike ?? candidates[0] ?? null;
}

function extractCardNumber(text: string): string | null {
  const patterns = [
    /#\s*(\S+)/,
    /(?:no\.?|number)\s*(\S+)/i,
    /(?:card)\s*#?\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractGrade(text: string): string | null {
  const patterns = [
    /(PSA\s*\d{1,2}(\.\d)?)/i,
    /(BGS\s*\d{1,2}(\.\d)?)/i,
    /(SGC\s*\d{1,2}(\.\d)?)/i,
    /(CGC\s*\d{1,2}(\.\d)?)/i,
    /GEM\s*MINT\s*(\d{1,2})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return null;
}
