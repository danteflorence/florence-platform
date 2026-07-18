// Country flags for live-class presence. Peloton-style: the room shows WHERE
// the class is, as flags only. Counts come later, when the numbers are big
// enough to be the story.
//
// Profiles store country as free text (signup + market routing accept names
// or ISO codes), so we normalize to ISO 3166-1 alpha-2 client-side and send
// only the code. Unmapped countries simply show no flag; extend NAME_TO_ISO
// as new cohorts appear.

const NAME_TO_ISO: Record<string, string> = {
  philippines: "PH",
  "the philippines": "PH",
  kenya: "KE",
  ghana: "GH",
  nigeria: "NG",
  india: "IN",
  "united states": "US",
  usa: "US",
  "united states of america": "US",
  "united kingdom": "GB",
  uk: "GB",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  canada: "CA",
  australia: "AU",
  jamaica: "JM",
  nepal: "NP",
  pakistan: "PK",
  bangladesh: "BD",
  ethiopia: "ET",
  uganda: "UG",
  tanzania: "TZ",
  zimbabwe: "ZW",
  "south africa": "ZA",
  egypt: "EG",
  mexico: "MX",
  brazil: "BR",
  cameroon: "CM",
  rwanda: "RW",
  zambia: "ZM",
  malawi: "MW",
  botswana: "BW",
  liberia: "LR",
  "sierra leone": "SL",
  gambia: "GM",
  "the gambia": "GM",
};

/** Normalize a profile's country (name or code) to ISO alpha-2, or null. */
export function countryToIso(country: string | undefined | null): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return NAME_TO_ISO[trimmed.toLowerCase()] ?? null;
}

/** ISO alpha-2 → flag emoji via regional indicator symbols. */
export function isoToFlag(iso: string): string | null {
  if (!/^[A-Z]{2}$/.test(iso)) return null;
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + iso.charCodeAt(0) - 65) +
    String.fromCodePoint(A + iso.charCodeAt(1) - 65)
  );
}
