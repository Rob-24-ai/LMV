// The reference knowledge, surfaced as readable pages. These same .md files
// ground the AI calls (see reference.server.ts) — here they're for the human.
// slug = route + filename stem; accent = groovy palette color for the card.

export interface Guide {
  slug: string;
  file: string;
  title: string;
  blurb: string;
  accent: "pumpkin" | "mustard" | "avocado" | "teal" | "brick" | "rose";
}

export const GUIDES: Guide[] = [
  {
    slug: "dating",
    file: "dating-authentication.md",
    title: "Dating & Authentication",
    blurb: "Pin the decade using at least three independent cues.",
    accent: "pumpkin",
  },
  {
    slug: "condition",
    file: "condition-grading.md",
    title: "Condition & Flaws",
    blurb: "Grade honestly and disclose every flaw to dodge SNAD claims.",
    accent: "brick",
  },
  {
    slug: "photos",
    file: "photos-shipping-policy.md",
    title: "Photos, Shipping & Policy",
    blurb: "Display methods, shipping, returns, scams, account health.",
    accent: "teal",
  },
  {
    slug: "keywords",
    file: "keywords.md",
    title: "Keywords That Sell",
    blurb: "Era + aesthetic clusters buyers actually search for.",
    accent: "avocado",
  },
  {
    slug: "titles",
    file: "title-seo.md",
    title: "Titles & Cassini SEO",
    blurb: "The 80-character title formula and search ranking.",
    accent: "mustard",
  },
  {
    slug: "pricing",
    file: "pricing-fees-sourcing.md",
    title: "Pricing, Fees & Sourcing",
    blurb: "Price from sold comps; know the fees before you list.",
    accent: "rose",
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
