/**
 * Finite starter list of mediums an artist can pick from, grouped by the
 * broad type of work they represent. Deliberately hand-curated in code
 * (not read from any database table) per the product decision: keep this
 * simple and fixed for now, and let an artist add anything not listed
 * here as free text via the "Other" field in MediumsPicker -- those
 * custom entries are stored exactly like the predefined ones (see
 * lib/utils.ts's parseCommaList/encodeJsonList), so nothing is lost if
 * this list is later replaced by a real, database-backed one.
 */
export interface MediumCategory {
  category: string;
  mediums: string[];
}

export const MEDIUM_CATEGORIES: MediumCategory[] = [
  {
    category: "Painting",
    mediums: [
      "Oil on Canvas",
      "Acrylic on Canvas",
      "Watercolour",
      "Gouache",
      "Tempera",
      "Oil on Paper",
    ],
  },
  {
    category: "Print Making",
    mediums: [
      "Etching",
      "Lithography",
      "Woodcut",
      "Linocut",
      "Screen Printing",
      "Aquatint",
      "Drypoint",
    ],
  },
  {
    category: "Drawing",
    mediums: ["Charcoal", "Graphite / Pencil", "Ink", "Pastel", "Colour Pencil", "Pen & Ink"],
  },
  {
    category: "Sculpture",
    mediums: [
      "Bronze",
      "Marble / Stone",
      "Wood Carving",
      "Terracotta / Clay",
      "Metal / Welded",
      "Fibreglass",
    ],
  },
  {
    category: "Mixed Media",
    mediums: ["Mixed Media", "Collage", "Assemblage", "Digital & Mixed Media"],
  },
];

/** Flat set of every predefined medium, for quickly checking whether a
 *  stored value is one of ours or an artist-added custom entry. */
export const ALL_PREDEFINED_MEDIUMS = new Set(
  MEDIUM_CATEGORIES.flatMap((c) => c.mediums)
);
