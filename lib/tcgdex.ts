import TCGdex from "@tcgdex/sdk";

// A single Japanese-only SDK instance keeps the catalogue language invariant
// and allows the SDK's in-memory cache to be reused by route handlers.
export const tcgdex = new TCGdex("ja");
