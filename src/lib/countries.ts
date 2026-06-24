// Shared catalog of countries supported by SebPay Mobile Money in
// Nexora IPTV's checkout. Prices on the site are displayed in USD;
// SebPay charges in the country's local currency, so each entry carries
// its own ISO currency + approximate USD→local FX rate used at checkout.
//
// Operators are filtered per country so the customer never sees a Mobile
// Money provider that doesn't exist in their country.

export type Operator =
  | "MTN Mobile Money"
  | "Orange Money"
  | "Moov Money"
  | "Wave"
  | "Free Money"
  | "Airtel Money"
  | "T-Money";

export type CountryConfig = {
  code: string;          // ISO alpha-2
  label: string;         // shown in the country <select>
  dial: string;          // international dial code (no "+")
  currency: string;      // ISO 4217 (XOF, XAF, GNF, CDF…)
  fxFromUsd: number;     // 1 USD → N local units (approx, server-side authoritative)
  operators: Operator[]; // Mobile Money operators available in this country
};

export const COUNTRIES: CountryConfig[] = [
  // West Africa — UEMOA (XOF / CFA BCEAO)
  { code: "BJ", label: "Bénin (BJ)",        dial: "229", currency: "XOF", fxFromUsd: 600,
    operators: ["MTN Mobile Money", "Moov Money"] },
  { code: "CI", label: "Côte d'Ivoire (CI)", dial: "225", currency: "XOF", fxFromUsd: 600,
    operators: ["MTN Mobile Money", "Orange Money", "Moov Money", "Wave"] },
  { code: "SN", label: "Sénégal (SN)",      dial: "221", currency: "XOF", fxFromUsd: 600,
    operators: ["Orange Money", "Wave", "Free Money"] },
  { code: "TG", label: "Togo (TG)",         dial: "228", currency: "XOF", fxFromUsd: 600,
    operators: ["T-Money", "Moov Money"] },
  { code: "BF", label: "Burkina Faso (BF)", dial: "226", currency: "XOF", fxFromUsd: 600,
    operators: ["Orange Money", "Moov Money"] },
  { code: "ML", label: "Mali (ML)",         dial: "223", currency: "XOF", fxFromUsd: 600,
    operators: ["Orange Money", "Moov Money"] },
  { code: "NE", label: "Niger (NE)",        dial: "227", currency: "XOF", fxFromUsd: 600,
    operators: ["Airtel Money", "Moov Money", "Orange Money"] },

  // Central Africa — CEMAC (XAF / CFA BEAC)
  { code: "CM", label: "Cameroun (CM)",     dial: "237", currency: "XAF", fxFromUsd: 600,
    operators: ["MTN Mobile Money", "Orange Money"] },
  { code: "GA", label: "Gabon (GA)",        dial: "241", currency: "XAF", fxFromUsd: 600,
    operators: ["Airtel Money", "Moov Money"] },
  { code: "CG", label: "Congo (CG)",        dial: "242", currency: "XAF", fxFromUsd: 600,
    operators: ["MTN Mobile Money", "Airtel Money"] },

  // Other Mobile Money corridors
  { code: "GN", label: "Guinée (GN)",       dial: "224", currency: "GNF", fxFromUsd: 8600,
    operators: ["Orange Money", "MTN Mobile Money"] },
  { code: "CD", label: "RD Congo (CD)",     dial: "243", currency: "CDF", fxFromUsd: 2800,
    operators: ["Orange Money", "Airtel Money"] },
];

export const COUNTRY_BY_CODE: Record<string, CountryConfig> =
  Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string | undefined | null): CountryConfig | undefined {
  if (!code) return undefined;
  return COUNTRY_BY_CODE[String(code).toUpperCase()];
}

/** Convert a USD amount to the country's local currency (integer units). */
export function convertUsdToLocal(usd: number, code: string): { amount: number; currency: string } {
  const c = getCountry(code);
  if (!c) return { amount: Math.round(usd * 600), currency: "XOF" };
  // For XOF/XAF/GNF/CDF the smallest accounting unit is the franc itself
  // (no decimals on Mobile Money), so we round to the nearest integer.
  return { amount: Math.round(usd * c.fxFromUsd), currency: c.currency };
}

/** Build a wa.me-friendly E.164 phone (digits only, country code prefixed). */
export function toE164(phone: string, countryCode: string | undefined | null): string {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const c = getCountry(countryCode);
  if (!c) return digits;
  if (digits.startsWith(c.dial)) return digits;
  // strip a leading 0 from the local part before prefixing the dial code
  const local = digits.replace(/^0+/, "");
  return `${c.dial}${local}`;
}