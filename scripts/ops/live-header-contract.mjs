/**
 * Normalise comma-separated HTTP directives instead of matching escaped regexes
 * against headers. Check whole tokens: "noindex-other" is not "noindex", and
 * "public, no-store" is not a valid private-cache contract.
 */
const directives = (header) =>
  (typeof header === "string" ? header : "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

export const hasNoindex = (header) => directives(header).includes("noindex");

export const hasPrivateNoStore = (header) => {
  const parts = directives(header);
  return parts.includes("no-store") && parts.includes("private") && !parts.includes("public");
};
