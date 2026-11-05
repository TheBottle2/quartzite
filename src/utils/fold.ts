// Önizlemede başlık bölümlerini katlanabilir (kapatılabilir) yapar.
//
// Wikipedia/VS Code tarzı "site" görünümü: her başlığın solunda bir katlama
// oku var; tıklanınca o başlığın gövdesi (ve alt bölümleri) kapanır.
//
// Uygulama DOM üzerinde çalışır: Rust'un ürettiği HTML bir kez yazılır
// (dangerouslySetInnerHTML), sonra bölüm ağacı JS ile kurulur. Böylece
// React'in içeriği yeniden yönetmesi gerekmez.
//
// Başlık hiyerarşisi: h2 > h3 > h4 gibi iç içe bölümler. Bir bölüm
// katlandığında içindeki alt bölümler de gizlenir (wiki davranışı).

export interface FoldLabels {
  /** bölümü katla (kapat) */
  fold: string;
  /** bölümü aç */
  unfold: string;
}

const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M9 6l6 6-6 6"/></svg>';

const STORAGE_PREFIX = 'quartzite.folds:';

interface OpenSection {
  level: number;
  body: HTMLElement;
}

/**
 * Başlık bölümlerini kurar ve verilen katlanmış anahtar kümesini uygular.
 * DOM zaten işlenmişse (data-fold-applied) yeniden kurmaz, yalnızca
 * durumları tazeler.
 */
export function applyFoldSections(root: HTMLElement, foldedKeys: Set<string>, labels: FoldLabels): void {
  if (root.dataset.foldApplied !== '1') {
    buildSections(root);
    root.dataset.foldApplied = '1';
  }
  root.querySelectorAll<HTMLElement>('.fold-btn').forEach((btn) => {
    const key = btn.dataset.foldKey;
    const section = btn.closest('.preview-section') as HTMLElement | null;
    if (!key || !section) return;
    const folded = foldedKeys.has(key);
    section.classList.toggle('folded', folded);
    btn.setAttribute('aria-expanded', folded ? 'false' : 'true');
    btn.setAttribute('title', folded ? labels.unfold : labels.fold);
    btn.setAttribute('aria-label', folded ? labels.unfold : labels.fold);
  });
}

/** Bölüm ağacını kurar: her h1-h6 kendi bölümünü, gövdesi alt bölümleri de kapsar. */
function buildSections(root: HTMLElement): void {
  const children = Array.from(root.children);
  const frag = document.createDocumentFragment();
  const stack: OpenSection[] = [];
  const dupCount = new Map<string, number>();

  const target = (): HTMLElement | DocumentFragment =>
    stack.length ? stack[stack.length - 1].body : frag;

  for (const node of children) {
    const match = /^H([1-6])$/.exec(node.tagName);
    if (!match) {
      target().appendChild(node);
      continue;
    }
    const level = Number(match[1]);
    // Bu seviyeye eşit/derin bölümler kapanır: yeni başlık onların yerine geçer.
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();

    const heading = node as HTMLElement;
    const text = (heading.textContent || '').trim();
    const baseKey = `${level}:${text}`;
    const seen = dupCount.get(baseKey) ?? 0;
    dupCount.set(baseKey, seen + 1);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fold-btn';
    btn.dataset.foldKey = `${baseKey}#${seen}`;
    btn.innerHTML = CHEVRON_SVG;
    heading.insertBefore(btn, heading.firstChild);

    const section = document.createElement('div');
    section.className = 'preview-section';
    section.dataset.level = String(level);
    const body = document.createElement('div');
    body.className = 'preview-section-body';

    section.appendChild(heading);
    section.appendChild(body);
    target().appendChild(section);
    stack.push({ level, body });
  }

  root.replaceChildren(...Array.from(frag.childNodes));
}

/** Tek bir bölümün katlanma durumunu değiştirir; yeni durumun kapalı olup olmadığını döner. */
export function toggleFold(root: HTMLElement, key: string, foldedKeys: Set<string>): boolean {
  const folded = foldedKeys.has(key);
  if (folded) foldedKeys.delete(key);
  else foldedKeys.add(key);
  const section = root.querySelector<HTMLElement>(`.fold-btn[data-fold-key="${cssEscape(key)}"]`)?.closest('.preview-section') as HTMLElement | null;
  if (section) section.classList.toggle('folded', !folded);
  const btn = root.querySelector<HTMLElement>(`.fold-btn[data-fold-key="${cssEscape(key)}"]`);
  if (btn) btn.setAttribute('aria-expanded', folded ? 'true' : 'false');
  return !folded;
}

/** Katlanmış bölüm anahtarlarını diskten okur (dosya bazında). */
export function loadFolds(fileName: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + fileName);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === 'string'));
  } catch {
    return new Set();
  }
}

/** Katlanmış bölüm anahtarlarını diske yazar. */
export function saveFolds(fileName: string, foldedKeys: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + fileName, JSON.stringify([...foldedKeys]));
  } catch {
    /* kota dolu / private mode → sessizce yoksay */
  }
}

/** CSS attribute seçicisi için güvenli kaçış (anahtarlar başlık metni içerir). */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}
