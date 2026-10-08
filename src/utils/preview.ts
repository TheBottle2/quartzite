/**
 * Obsidian-parity preview pipeline (client-side, Rust'a dokunmadan).
 *
 * Rust `parse_markdown` (pulldown-cmark) şunları YAPMAZ:
 * - `[[Not]]` wikilink'lerini <a>'ya çevirmez (düz metin kalır → önizlemeden gezinilemez)
 * - `#etiket` leri linklemez
 * - `![[Not]]` embed'leri bozar (kırık <img>)
 * - `> [!note]` callout'larını sınıflamaz
 * - `- [ ]` task'larını tıklanabilir yapmaz (disabled kalır)
 * - `--- frontmatter ---` i çöp olarak render eder (`<hr><h2>...`)
 *
 * Bu modül parse SONRASI html'i post-process eder. Kod blokları her
 * adımda korunur (placeholder), böylece `$`, `#`, `[[` içeren kodlar
 * asla dönüştürülmez.
 */

export interface OutlineHeading {
  level: number;
  text: string;
  /** ham markdown içindeki karakter ofseti (atlama için) */
  offset: number;
}

export interface FrontmatterResult {
  /** `---` bloğu sökülmüş gövde */
  body: string;
  /** anahtar → ham değer */
  data: Record<string, string>;
}

const CALLOUT_TYPES = [
  'note', 'tip', 'important', 'warning', 'caution', 'danger',
  'info', 'todo', 'question', 'hint', 'success', 'check', 'done',
  'failure', 'fail', 'missing', 'bug', 'example', 'quote', 'cite',
] as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** <pre>/<code> bloklarını geçici placeholder'a alır, geri koyucuyu döner. */
function protectCode(html: string): { safe: string; restore: (s: string) => string } {
  const blocks: string[] = [];
  const safe = html.replace(/<(?:pre|code)[^>]*>[\s\S]*?<\/(?:pre|code)>/g, (m) => {
    blocks.push(m);
    return `\u0000CODE${blocks.length - 1}\u0000`;
  });
  return {
    safe,
    restore: (s) => s.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => blocks[parseInt(i, 10)] ?? _m),
  };
}

/** ```` ``` ```` ve `` ` `` kodlarını söküp etiketsiz metin bırakır (tag/outline çıkarımı için). */
function stripCodeFences(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
}

export function extractFrontmatter(md: string): FrontmatterResult {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { body: md, data: {} };
  const data: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (k) data[k] = v;
    }
  }
  return { body: md.slice(m[0].length), data };
}

export function frontmatterTable(data: Record<string, string>): string {
  const keys = Object.keys(data);
  if (keys.length === 0) return '';
  const rows = keys
    .slice(0, 12)
    .map((k) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(data[k])}</td></tr>`)
    .join('');
  return `<table class="frontmatter"><tbody>${rows}</tbody></table>`;
}

export function parseOutline(md: string): OutlineHeading[] {
  const clean = stripCodeFences(extractFrontmatter(md).body);
  const out: OutlineHeading[] = [];
  const re = /^(#{1,6})\s+(.+?)\s*#?\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null && out.length < 200) {
    const text = m[2].replace(/\s+#+\s*$/, '').trim();
    if (!text) continue;
    out.push({ level: m[1].length, text: text.slice(0, 120), offset: m.index });
  }
  return out;
}

export function extractTags(md: string): string[] {
  const clean = stripCodeFences(extractFrontmatter(md).body);
  const seen = new Set<string>();
  const out: string[] = [];
  // #tag, #üst-tag/alt — baştaki # yalnız değilse, url fragment'i (#anchor) değilse
  const re = /(?:^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_\-/]*)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null && out.length < 100) {
    const tag = m[1].replace(/\/+$/, '');
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** Kaçıncı markdown task satırının (`- [ ]`) kaçıncı checkbox'a denk geldiğini bulur. */
export function taskLineIndices(md: string): number[] {
  const lines = md.split('\n');
  const idx: number[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && /^\s*[-*+]\s+\[[ xX]\]/.test(line)) idx.push(i);
  });
  return idx;
}

/**
 * parse_markdown html çıktısını Obsidian benzeri zengin html'e çevirir.
 * Sıra: wikilink → embed → tag → callout → task. En sonda restore.
 */
export function enhancePreviewHtml(html: string): string {
  const { safe: s0, restore } = protectCode(html);
  let s = s0;

  // 1) Embed placeholder'ları: Rust bunları kırık <img> ya da düz metin yapar.
  //    <p>![[Ad]]</p> ve varyantlarını tıklanabilir karta çevir.
  s = s.replace(/<p>\s*!?\[\[([^\]]+)\]\]\s*<\/p>/g, (_m, inner: string) => {
    const parts = String(inner).split('|');
    const name = parts[0].trim();
    const alias = (parts[1] ?? name).trim();
    return `<div class="embed" data-embed="${escapeHtml(name)}" title="${escapeHtml(name)}"><div class="embed-title">⤵ ${escapeHtml(alias)}</div><div class="embed-hint">${escapeHtml(name)}</div></div>`;
  });
  // Metin içi ![[Ad]] (paragraf dışı kalanlar)
  s = s.replace(/!\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
    const parts = String(inner).split('|');
    const name = parts[0].trim();
    const alias = (parts[1] ?? name).trim();
    return `<span class="embed-inline" data-embed="${escapeHtml(name)}">⤵ ${escapeHtml(alias)}</span>`;
  });

  // 2) Wikilink'ler: [[Ad]] ve [[Ad|Görünen]]
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, name: string, alias?: string) => {
    const n = String(name).trim();
    const a = (alias ?? n).trim();
    if (!n) return _m;
    return `<a data-wiki-link="${escapeHtml(n)}">${escapeHtml(a)}</a>`;
  });

  // 3) Tag'ler: #etiket (html attribute içleri hariç — kaba ama güvenli:
  //    `="...` içinde geçenleri atla)
  s = s.replace(/(^|[\s(>"'])(#[\p{L}\p{N}_][\p{L}\p{N}_\-/]*)/gu, (m, pre: string, tag: string) => {
    // url fragment (#section) gibi kısa/tekil durumları ele: önceki char `"` ise attribute olabilir
    if (pre === '"' || pre === "'") return m;
    const name = tag.slice(1);
    return `${pre}<a data-tag="${escapeHtml(name)}">${escapeHtml(tag)}</a>`;
  });

  // 4) Callout'lar: pulldown `> [!note] başlık` → <blockquote><p>[!note] başlık...
  s = s.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER|INFO|TODO|QUESTION|HINT|SUCCESS|CHECK|DONE|FAILURE|FAIL|MISSING|BUG|EXAMPLE|QUOTE|CITE)\]\s*([\s\S]*?)<\/blockquote>/gi,
    (_m, kind: string, inner: string) => {
      const k = String(kind).toLowerCase();
      const cls = CALLOUT_TYPES.includes(k as (typeof CALLOUT_TYPES)[number]) ? k : 'note';
      // İlk satır başlık, kalanı gövde
      const firstClose = inner.indexOf('</p>');
      let title = '';
      let body = inner;
      if (firstClose !== -1) {
        title = inner.slice(0, firstClose).replace(/<\/?p>/g, '').trim();
        body = inner.slice(firstClose + 5);
      }
      return `<blockquote class="callout callout-${cls}"><div class="callout-title">${escapeHtml(kind as string)}</div>${title ? `<div class="callout-head">${title}</div>` : ''}${body}</blockquote>`;
    }
  );

  // 5) Task'lar: disabled checkbox'ları tıklanabilir yap + sayaç için index ver.
  let taskIdx = 0;
  s = s.replace(/<input([^>]*type="checkbox"[^>]*)>/g, (m) => {
    if (/data-task/.test(m)) return m;
    const checked = /checked/.test(m) ? ' checked' : '';
    const out = `<input class="task-checkbox" data-task="${taskIdx++}" type="checkbox"${checked} />`;
    return out;
  });
  // pulldown tasklist üretmediyse metinsel fallback: <li>[ ] ...] — nadir
  s = s.replace(/<li>\s*\[([ xX])\]/g, (_m, state: string) => {
    const checked = state.toLowerCase() === 'x' ? ' checked' : '';
    return `<li class="task-item"><input class="task-checkbox" data-task="${taskIdx++}" type="checkbox"${checked} />`;
  });

  return restore(s);
}
