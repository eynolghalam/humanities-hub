/** Client-safe helpers for phone based auth. */

/** Normalize Iranian numbers to 98XXXXXXXXXX (digits only). */
export function normalizePhone(input: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  let s = (input ?? "")
    .split("")
    .map(ch => {
      const i = fa.indexOf(ch) >= 0 ? fa.indexOf(ch) : ar.indexOf(ch);
      return i >= 0 ? String(i) : ch;
    })
    .join("")
    .replace(/[^\d+]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("0")) s = `98${s.slice(1)}`;
  if (s.length === 10 && s.startsWith("9")) s = `98${s}`;
  return s;
}

export function isValidPhone(input: string): boolean {
  const p = normalizePhone(input);
  return /^989\d{9}$/.test(p) || /^\d{10,15}$/.test(p);
}

/** Deterministic alias email used for the Supabase account behind a phone number. */
export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@phone.hozatona.app`;
}
