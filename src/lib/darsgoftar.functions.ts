import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parse, type HTMLElement } from "node-html-parser";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UA = "Mozilla/5.0 (compatible; HozatonaBot/1.0; +https://hozatona.lovable.app)";

async function fetchHtml(url: string): Promise<HTMLElement> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return parse(await res.text());
}

function cleanText(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

// Parse an /mbook/{bookId}/{sessionId} page
function parseSessionPage(root: HTMLElement) {
  const bookTitle = cleanText(root.querySelector(".taqrirviewTopLessonInfo h1")?.text);
  const sessionTitle = cleanText(root.querySelector("#darstitle")?.text);
  const artist = cleanText(
    root.querySelector(".taqrirviewTopArtist .flex-grow-1 a")?.text,
  );
  const boxes = root.querySelectorAll("#boxes .box").map(box => {
    const number = cleanText(box.querySelector(".part_list--number")?.text);
    const title = cleanText(box.querySelector(".title")?.text);
    const descEl = box.querySelector(".desc");
    const html = descEl?.innerHTML?.trim() ?? "";
    const text = cleanText(descEl?.text);
    const type = box.getAttribute("type") ?? "";
    return { number, title, html, text, type };
  });
  // next/prev session URLs
  const linkBtns = root.querySelectorAll(".taqrirviewTopLink a");
  let prevUrl: string | null = null;
  let nextUrl: string | null = null;
  linkBtns.forEach(a => {
    const txt = cleanText(a.text);
    const href = a.getAttribute("href") ?? "";
    if (txt.includes("قبل")) prevUrl = href && !a.hasAttribute("disabled") ? href : null;
    if (txt.includes("بعد")) nextUrl = href || null;
  });
  return { bookTitle, sessionTitle, artist, boxes, prevUrl, nextUrl };
}

function combineBoxesToHtml(boxes: { title: string; html: string }[]): string {
  return boxes
    .filter(b => b.html || b.title)
    .map(b => `<section class="dg-box"><h3>${escapeHtml(b.title)}</h3>${b.html}</section>`) 
    .join("\n");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const fetchDarsgoftarSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().url() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("teacher")) {
      throw new Error("Unauthorized");
    }
    if (!/^https?:\/\/(www\.)?darsgoftar\.net\//i.test(data.url)) {
      throw new Error("URL must be on darsgoftar.net");
    }
    const root = await fetchHtml(data.url);
    const parsed = parseSessionPage(root);
    return {
      ...parsed,
      combinedHtml: combineBoxesToHtml(parsed.boxes),
      sourceUrl: data.url,
    };
  });

// List sessions for an mbook id; walks pagination
export const listDarsgoftarSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ mbookId: z.string().regex(/^\d+$/), maxPages: z.number().int().min(1).max(20).default(20) }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("teacher")) throw new Error("Unauthorized");

    const seen = new Set<string>();
    const sessions: { url: string; number: string; title: string }[] = [];
    let bookTitle = "";
    for (let page = 1; page <= data.maxPages; page++) {
      const url = `https://darsgoftar.net/mbook/${data.mbookId}?page=${page}`;
      const root = await fetchHtml(url);
      if (!bookTitle) bookTitle = cleanText(root.querySelector("h1.fs-3")?.text);
      const items = root.querySelectorAll(".list-group a.list-group-item");
      if (items.length === 0) break;
      let added = 0;
      for (const a of items) {
        const href = a.getAttribute("href") ?? "";
        if (!href.includes(`/mbook/${data.mbookId}/`)) continue;
        if (seen.has(href)) continue;
        seen.add(href);
        sessions.push({
          url: href,
          number: cleanText(a.querySelector(".episodes_list--number")?.text),
          title: cleanText(a.querySelector(".episodes_list--title")?.text),
        });
        added++;
      }
      if (added === 0) break;
    }
    return { bookTitle, sessions };
  });

// Bulk import: fetch each session and insert as a lesson row under given book.
export const importDarsgoftarBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      mbookId: z.string().regex(/^\d+$/),
      bookId: z.string().uuid(),
      courseId: z.string().uuid(),
      startIndex: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(50).default(20),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("teacher")) throw new Error("Unauthorized");

    // existing lesson count for sort_order
    const { count: existing } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("book_id", data.bookId);

    // get session list
    const list = await fetchHtml(`https://darsgoftar.net/mbook/${data.mbookId}?page=1`);
    const all: string[] = [];
    for (let page = 1; page <= 20; page++) {
      const root = page === 1 ? list : await fetchHtml(`https://darsgoftar.net/mbook/${data.mbookId}?page=${page}`);
      const items = root.querySelectorAll(".list-group a.list-group-item");
      if (!items.length) break;
      let added = 0;
      for (const a of items) {
        const href = a.getAttribute("href") ?? "";
        if (href.includes(`/mbook/${data.mbookId}/`) && !all.includes(href)) {
          all.push(href);
          added++;
        }
      }
      if (added === 0) break;
    }

    const slice = all.slice(data.startIndex, data.startIndex + data.limit);
    const rows: Array<Record<string, unknown>> = [];
    let i = 0;
    for (const url of slice) {
      try {
        const root = await fetchHtml(url);
        const parsed = parseSessionPage(root);
        rows.push({
          course_id: data.courseId,
          book_id: data.bookId,
          title: parsed.sessionTitle || `جلسه ${data.startIndex + i + 1}`,
          explanation: combineBoxesToHtml(parsed.boxes),
          original_text: "",
          translation: "",
          content: "",
          sort_order: (existing ?? 0) + data.startIndex + i,
          created_by: userId,
        });
      } catch (e) {
        // skip failing sessions but record
        rows.push({ _error: true, url, message: e instanceof Error ? e.message : String(e) });
      }
      i++;
    }

    const insertable = rows.filter(r => !r._error);
    if (insertable.length) {
      const { error } = await supabase.from("lessons").insert(insertable as never);
      if (error) throw new Error(error.message);
    }
    return {
      total: all.length,
      attempted: slice.length,
      inserted: insertable.length,
      failed: rows.length - insertable.length,
      hasMore: data.startIndex + data.limit < all.length,
      nextStart: data.startIndex + data.limit,
    };
  });

// ---------------- Book text pages (/book/view/...) ----------------

function parseBookPage(root: HTMLElement) {
  const pgEl = root.querySelector("#selectable-content .page-content");
  const pageNum = cleanText(pgEl?.querySelector(".pgnum")?.getAttribute("data-text") ?? pgEl?.querySelector(".pgnum")?.text);
  const contentEl = pgEl?.querySelector(".pgcontent");
  // strip page-number markers from inner html
  const html = (contentEl?.innerHTML ?? "").trim();
  const text = cleanText(contentEl?.text);
  const bookTitle = cleanText(root.querySelector("h1")?.text);
  // next/prev page anchors
  const anchors = root.querySelectorAll("a.pagechange");
  let prevUrl: string | null = null;
  let nextUrl: string | null = null;
  anchors.forEach(a => {
    const dir = a.getAttribute("data-dir");
    const href = a.getAttribute("href") ?? "";
    if (!href) return;
    // data-dir="up" = next (next page number), "dwn" = previous
    if (dir === "up") nextUrl = href;
    else if (dir === "dwn") prevUrl = href;
  });
  return { bookTitle, pageNum, html, text, prevUrl, nextUrl };
}

const BOOK_URL_RE = /^https?:\/\/(www\.)?darsgoftar\.net\/book\/view\/\d+\/\d+\/\d+\/\d+\/?$/i;

export const fetchDarsgoftarBookPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().url() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("teacher")) throw new Error("Unauthorized");
    if (!BOOK_URL_RE.test(data.url)) throw new Error("URL باید مانند https://darsgoftar.net/book/view/A/B/C/PAGE باشد");
    const root = await fetchHtml(data.url);
    return parseBookPage(root);
  });

// Fetch a batch of consecutive pages starting at startUrl.
export const fetchDarsgoftarBookPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      startUrl: z.string().url(),
      limit: z.number().int().min(1).max(25).default(10),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map(r => r.role as string);
    if (!roles.includes("admin") && !roles.includes("teacher")) throw new Error("Unauthorized");
    if (!BOOK_URL_RE.test(data.startUrl)) throw new Error("URL باید مانند https://darsgoftar.net/book/view/A/B/C/PAGE باشد");

    const pages: Array<{ url: string; pageNum: string; html: string; text: string }> = [];
    let currentUrl: string | null = data.startUrl;
    let nextUrl: string | null = null;
    let bookTitle = "";
    for (let i = 0; i < data.limit && currentUrl; i++) {
      try {
        const root = await fetchHtml(currentUrl);
        const p = parseBookPage(root);
        if (!bookTitle) bookTitle = p.bookTitle;
        pages.push({ url: currentUrl, pageNum: p.pageNum, html: p.html, text: p.text });
        nextUrl = p.nextUrl;
        currentUrl = p.nextUrl;
      } catch {
        break;
      }
    }
    return { bookTitle, pages, nextUrl };
  });
