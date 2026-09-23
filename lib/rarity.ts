const aliases: Record<string, { code: string; label: string }> = {
  "illustration rare": { code: "AR", label: "Art Rare" },
  "art rare": { code: "AR", label: "Art Rare" },
  "special illustration rare": { code: "SAR", label: "Special Art Rare" },
  "special art rare": { code: "SAR", label: "Special Art Rare" },
  "ultra rare": { code: "UR", label: "Ultra Rare" },
  "hyper rare": { code: "HR", label: "Hyper Rare" },
  "mega hyper rare": { code: "MUR", label: "Mega Ultra Rare" },
  "secret rare": { code: "SR", label: "Secret Rare" },
  "double rare": { code: "RR", label: "Double Rare" },
  "triple rare": { code: "RRR", label: "Triple Rare" },
  "character rare": { code: "CHR", label: "Character Rare" },
  "character super rare": { code: "CSR", label: "Character Super Rare" },
  "shiny rare": { code: "S", label: "Shiny Rare" },
  "shiny ultra rare": { code: "SSR", label: "Shiny Ultra Rare" },
  "ace spec rare": { code: "ACE", label: "ACE SPEC Rare" },
  "radiant rare": { code: "K", label: "Radiant Rare" },
  "holo rare": { code: "R", label: "Holo Rare" },
  "rare holo": { code: "R", label: "Holo Rare" },
  rare: { code: "R", label: "Rare" },
  uncommon: { code: "U", label: "Uncommon" },
  common: { code: "C", label: "Common" },
  promo: { code: "PROMO", label: "Promo" },
  none: { code: "—", label: "No rarity" },
};

export function normalizeRarity(value?: string | null) {
  const original = value?.trim() || "None";
  return {
    original,
    ...(aliases[original.toLowerCase()] || { code: original, label: original }),
  };
}
