/**
 * Describes WHAT an ad contains.
 * This file does not know anything about mobile, kiosks, or React.
 */

export type ElementType = "text" | "image" | "button";

export type ElementRole =
  | "primary"
  | "secondary"
  | "hero"
  | "branding"
  | "action";

export type Priority = 1 | 2 | 3;
export type AdPriority = Priority; // Alias for engine backwards-compatibility

export interface AdElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: Priority;

  content?: string;
  src?: string;
  alt?: string;

  /* Natural media width / height, when useful for an image element. */
  aspectRatio?: number;
}

export interface AdSpec {
  id?: string;
  name?: string;
  elements: AdElement[];
}

/**
 * Validates one declarative ad specification.
 * It prevents duplicate IDs and ensures that the resolver receives valid data.
 */
export function defineAd(spec: AdSpec): AdSpec {
  if (!Array.isArray(spec.elements) || spec.elements.length === 0) {
    throw new Error("[AdSpec Error] An ad spec must contain at least one element.");
  }

  const seenIds = new Set<string>();

  for (const element of spec.elements) {
    if (!element.id || typeof element.id !== "string") {
      throw new Error(
        '[AdSpec Error] Every element needs a valid string "id".',
      );
    }

    if (seenIds.has(element.id)) {
      throw new Error(
        `[AdSpec Error] Duplicate element ID detected: "${element.id}".`,
      );
    }

    seenIds.add(element.id);
  }

  const hasHeadline = spec.elements.some(
    (element) => element.role === "primary",
  );

  const hasCta = spec.elements.some(
    (element) => element.role === "action",
  );

  if (!hasHeadline) {
    throw new Error(
      "[AdSpec Error] An ad needs a primary headline element.",
    );
  }

  if (!hasCta) {
    throw new Error(
      "[AdSpec Error] An ad needs an action/CTA element.",
    );
  }

  return spec;
}

/**
 * Default MacBook Pro Midnight Blue Product Ad Spec
 */
export const defaultAdSpec: AdSpec = defineAd({
  id: "macbook-pro-midnight-ad",
  name: "MacBook Pro Midnight Blue Launch Ad",
  elements: [
    {
      id: "headline",
      type: "text",
      role: "primary",
      priority: 1,
      content: "MacBook Pro M3",
    },
    {
      id: "product-image",
      type: "image",
      role: "hero",
      priority: 1,
      src: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
      alt: "Sleek Midnight Blue MacBook Pro",
      aspectRatio: 1.4,
    },
    {
      id: "cta",
      type: "button",
      role: "action",
      priority: 1,
      content: "Buy MacBook Pro",
    },
    {
      id: "price",
      type: "text",
      role: "secondary",
      priority: 2,
      content: "Midnight • M3 Max Chip",
    },
    {
      id: "logo",
      type: "image",
      role: "branding",
      priority: 3,
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
      alt: "Apple Logo",
      aspectRatio: 2.5,
    },
  ],
});