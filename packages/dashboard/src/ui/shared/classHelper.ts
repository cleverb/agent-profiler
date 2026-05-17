/**
 * Compose a trimmed `class` attribute value from a base name, optional extras, and grid span.
 */
function normalizeAddedClasses(
  addedClasses: string | (string | undefined)[],
): string[] {
  if (typeof addedClasses === "string") {
    return addedClasses
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return addedClasses
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
}

export function classHelper(
  className = "",
  addedClasses: string | (string | undefined)[] = [],
  span?: number,
): string {
  const parts: string[] = [];

  const base = className.trim();
  if (base) {
    parts.push(base);
  }

  parts.push(...normalizeAddedClasses(addedClasses));

  if (
    typeof span === "number" &&
    Number.isFinite(span) &&
    span >= 2 &&
    Number.isInteger(span)
  ) {
    parts.push(`span-${span}`);
  }

  return parts.join(" ").trim();
}
