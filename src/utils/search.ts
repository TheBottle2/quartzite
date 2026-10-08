export interface TextMatch { start: number; end: number; }

export interface MentionSnippet { start: number; end: number; lineNo: number; line: string; }

/**
 * "Bağlantısız anma": Notun adı düz metin olarak geçiyor ama `[[...]]`
 * içinde değil. Obsidian'ın "Unlinked mentions" panelinin motoru — link
 * grafiğine girmemiş bağlantıları bulur.
 *
 * Filtre: eşleşmenin iki karakter solu `[[` ya da iki karakter sağı `]]`
 * ise bu bir wikilink'tir (zaten Backlinks'te görünür) → atlanır.
 */
export function findUnlinkedMentions(text: string, title: string, cap = 5): MentionSnippet[] {
  const needle = title.replace(/\.md$/, '').trim();
  if (needle.length < 2) return [];
  // Uzun/kısa isim: "Projeler/Not" yazılmışsa sadece son segment de geçebilir
  const candidates = new Set<string>([needle]);
  const base = needle.split('/').pop();
  if (base && base !== needle && base.length >= 3) candidates.add(base);

  const out: MentionSnippet[] = [];
  const seenLines = new Set<number>();
  for (const cand of candidates) {
    for (const m of findFoldedMatches(text, cand, 400)) {
      if (out.length >= cap) return out;
      const before2 = text.slice(Math.max(0, m.start - 2), m.start);
      const after2 = text.slice(m.end, m.end + 2);
      if (before2.endsWith('[[') || after2.startsWith(']]')) continue;
      const lineStart = text.lastIndexOf('\n', m.start - 1) + 1;
      let lineEnd = text.indexOf('\n', m.end);
      if (lineEnd === -1) lineEnd = text.length;
      const lineNo = text.slice(0, lineStart).split('\n').length;
      if (seenLines.has(lineNo)) continue;
      seenLines.add(lineNo);
      out.push({ start: m.start, end: m.end, lineNo, line: text.slice(lineStart, lineEnd).trim().slice(0, 160) });
    }
  }
  out.sort((a, b) => a.start - b.start);
  return out.slice(0, cap);
}

export interface TextSearchOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
  wholeWord?: boolean;
  cap?: number;
}

/**
 * SearchBar + GlobalSearch ortak eşleştirici: düz metin + duyarsız yol
 * Türkçe-İ güvenli katlamalıdır, regex/yapışkan seçenekler SearchBar
 * ile birebir aynı davranır.
 */
export function findTextMatches(text: string, query: string, opts: TextSearchOptions = {}): TextMatch[] {
  const { caseSensitive = false, useRegex = false, wholeWord = false, cap = 5000 } = opts;
  if (!query) return [];
  if (!useRegex && !wholeWord && !caseSensitive) return findFoldedMatches(text, query, Math.min(cap, 5000));
  try {
    const escaped = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b(?:${escaped})\\b` : escaped;
    const re = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    const out: TextMatch[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length });
      if (m[0].length === 0) re.lastIndex++;
      if (out.length >= cap) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Türkçe-İ güvenli katlama: İ/ı → i, sonra küçük harf.
 * Neden: `"İ".toLowerCase()` 2 birimlik "i̇" üretir; uzunluk bozulunca
 * `indexOf`/`split` ile bulunan indisler orijinal metne uymaz (ve ASCII
 * "iznik", "İznik" sorgusuyla hiç bulunamaz). Bu eşleme 1:1 uzunluk
 * korur, indisler orijinal metinde geçerlidir.
 */
export function foldCase(s: string): string {
  return s.replace(/İ/g, 'i').replace(/ı/g, 'i').toLowerCase();
}

/**
 * Düz-metin (regexsiz), büyük/küçük harf duyarsız isabet konumları.
 * Katlanmış metinde arar; katlama uzunluk koruduğu için indisler
 * ORİJİNAL metne aittir. Büyük/küçük harf + Türkçe-İ güvenlidir.
 */
export function findFoldedMatches(text: string, query: string, cap = 500): TextMatch[] {
  const out: TextMatch[] = [];
  if (!query) return out;
  const ft = foldCase(text);
  const fq = foldCase(query);
  if (ft.length !== text.length || fq.length !== query.length) return out; // güvenlik: uzunluk bozulduysa vazgeç
  let i = ft.indexOf(fq);
  while (i !== -1 && out.length < cap) {
    out.push({ start: i, end: i + fq.length });
    i = ft.indexOf(fq, i + 1);
  }
  return out;
}
