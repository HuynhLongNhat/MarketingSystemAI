export const WEBSITE_TEMPLATES = [
  {
    id: "business-corporate",
    name: "Business Corporate",
    category: "Corporate",
    description: "A trustworthy company profile with services, proof points, and a contact CTA.",
    sections: ["header", "hero", "services", "about", "features", "testimonials", "contact", "footer"],
  },
  {
    id: "real-estate-landing",
    name: "Real Estate Landing Page",
    category: "Real estate",
    description: "A property-focused campaign page with listings, highlights, and lead capture.",
    sections: ["header", "hero", "gallery", "features", "about", "testimonials", "contact", "footer"],
  },
  {
    id: "digital-agency-landing",
    name: "Digital Agency Landing Page",
    category: "Marketing",
    description: "A modern service showcase for agencies and digital-first teams.",
    sections: ["header", "hero", "services", "features", "testimonials", "faq", "contact", "footer"],
  },
] as const;

export type WebsiteTemplateId = (typeof WEBSITE_TEMPLATES)[number]["id"];

export function isWebsiteTemplateId(value: string): value is WebsiteTemplateId {
  return WEBSITE_TEMPLATES.some((template) => template.id === value);
}
