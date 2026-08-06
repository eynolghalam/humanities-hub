// Server-only: free Google Translate fallback (used when AI credits run out).
// HTML-aware: only text nodes are translated, tags/attributes are preserved.

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";

async function translateChunk(text: string, target: string): Promise<string> {
  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`google-translate: ${res.status}`);
  const json = (await res.json()) as unknown;
  const rows = Array.isArray(json) && Array.isArray((json as any[])[0]) ? ((json as any[])[0] as any[]) : [];
  return rows.map(r => (Array.isArray(r) ? String(r[0] ?? "") : "")).join("");
}

async function translatePlain(text: string, target: string): Promise<string> {
  const MAX = 1800;
  if (text.length <= MAX) return translateChunk(text, target);
  const parts: string[] = [];
  let buf = "";
  for (const sentence of text.split(/(?<=[.!?؟۔\n])\s+/)) {
    if ((buf + sentence).length > MAX) { if (buf) parts.push(buf); buf = sentence; }
    else buf += (buf ? " " : "") + sentence;
  }
  if (buf) parts.push(buf);
  const out: string[] = [];
  for (const p of parts) out.push(await translateChunk(p, target));
  return out.join(" ");
}

/** Translate a string that may contain HTML, preserving markup. */
export async function googleTranslate(text: string, target = "fa"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (!/<[a-zA-Z!/]/.test(trimmed)) return translatePlain(trimmed, target);

  const tokens = trimmed.split(/(<[^>]+>)/g);
  let inSkip = false;
  const out: string[] = [];
  for (const tok of tokens) {
    if (tok.startsWith("<")) {
      const tag = tok.toLowerCase();
      if (/^<\s*(script|style)\b/.test(tag)) inSkip = true;
      if (/^<\s*\/\s*(script|style)\b/.test(tag)) inSkip = false;
      out.push(tok);
      continue;
    }
    if (inSkip || !tok.trim()) { out.push(tok); continue; }
    const lead = tok.match(/^\s*/)?.[0] ?? "";
    const tail = tok.match(/\s*$/)?.[0] ?? "";
    try {
      out.push(lead + (await translatePlain(tok.trim(), target)) + tail);
    } catch {
      out.push(tok);
    }
  }
  return out.join("");
}
