import { useEffect, useMemo, useRef, useState } from 'react';
import { readFile } from '../api';
import { foldCase } from '../utils/search';
import { Icon, type IconName } from './Icon';
import type { TFunc } from '../i18n';

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  initialQuery?: string;
  files: string[];
  activeFile: string | null;
  favorites: string[];
  recentFiles: string[];
  commands: PaletteCommand[];
  onOpenFile: (file: string) => void;
  onClose: () => void;
  t: TFunc;
}

function scoreMatch(name: string, q: string): number {
  if (!q) return 0;
  const fn = foldCase(name);
  const fq = foldCase(q);
  if (fn === fq) return 1000;
  if (fn.startsWith(fq)) return 500 - fn.length;
  const base = fn.replace(/\.md$/, '');
  if (base.startsWith(fq)) return 400 - base.length;
  const idx = fn.indexOf(fq);
  if (idx !== -1) return 200 - idx;
  // subsequence (harf sırası tutuyorsa) — zayıf eşleşme
  let qi = 0;
  for (let i = 0; i < fn.length && qi < fq.length; i++) {
    if (fn[i] === fq[qi]) qi++;
  }
  if (qi === fq.length) return 50 - fn.length;
  return -1;
}

type Row =
  | { kind: 'label'; label: string }
  | { kind: 'file'; file: string; sub?: string }
  | { kind: 'cmd'; cmd: PaletteCommand };

export function CommandPalette({
  isOpen, initialQuery = '', files, activeFile, favorites, recentFiles, commands, onOpenFile, onClose, t,
}: CommandPaletteProps) {
  const [query, setQuery] = useState(initialQuery);
  const [index, setIndex] = useState(0);
  const [tagFiles, setTagFiles] = useState<Map<string, string[]> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setIndex(0);
      setTagFiles(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, initialQuery]);

  // #tag sorgusu: içerik taraması (lazy, önbellekli)
  const isTagQuery = query.trim().startsWith('#') && query.trim().length > 1;
  useEffect(() => {
    if (!isOpen || !isTagQuery || tagFiles) return;
    let cancelled = false;
    (async () => {
      const map = new Map<string, string[]>();
      await Promise.all(files.map(async (f) => {
        try {
          const text = await readFile(f);
          const tags = new Set<string>();
          const re = /(?:^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_\-/]*)/gu;
          let m: RegExpExecArray | null;
          const clean = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
          while ((m = re.exec(clean)) !== null) tags.add(m[1]);
          if (!cancelled && tags.size > 0) map.set(f, [...tags]);
        } catch { /* ignore */ }
      }));
      if (!cancelled) setTagFiles(map);
    })();
    return () => { cancelled = true; };
  }, [isOpen, isTagQuery, files, tagFiles]);

  const rows: Row[] = useMemo(() => {
    const q = query.trim();
    const favSet = new Set(favorites);
    if (isTagQuery) {
      const tag = q.slice(1).toLowerCase();
      const out: Row[] = [];
      if (!tagFiles) {
        out.push({ kind: 'label', label: t('loading') });
        return out;
      }
      const hits = [...tagFiles.entries()].filter(([, tags]) =>
        tags.some((x) => x.toLowerCase().includes(tag))
      ).map(([f]) => f);
      if (hits.length === 0) out.push({ kind: 'label', label: t('noSearchResults') });
      else {
        out.push({ kind: 'label', label: `#${tag} — ${hits.length}` });
        hits.slice(0, 20).forEach((f) => out.push({ kind: 'file', file: f }));
      }
      return out;
    }
    if (!q) {
      const out: Row[] = [];
      const recents = recentFiles.filter((f) => files.includes(f)).slice(0, 5);
      if (recents.length > 0) {
        out.push({ kind: 'label', label: t('recentFiles') });
        recents.forEach((f) => out.push({ kind: 'file', file: f, sub: favSet.has(f) ? '★' : undefined }));
      }
      const favs = favorites.filter((f) => files.includes(f) && !recents.includes(f)).slice(0, 5);
      if (favs.length > 0) {
        out.push({ kind: 'label', label: t('favorites') });
        favs.forEach((f) => out.push({ kind: 'file', file: f, sub: '★' }));
      }
      out.push({ kind: 'label', label: t('allNotes') });
      files.slice().sort((a, b) => a.localeCompare(b)).slice(0, 8).forEach((f) =>
        out.push({ kind: 'file', file: f, sub: favSet.has(f) ? '★' : undefined })
      );
      out.push({ kind: 'label', label: t('commands') });
      commands.slice(0, 8).forEach((c) => out.push({ kind: 'cmd', cmd: c }));
      return out;
    }
    const scored = files
      .map((f) => ({ f, s: scoreMatch(f.replace(/\.md$/, ''), q) + (favSet.has(f) ? 5 : 0) - (f === activeFile ? 1000 : 0) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 9);
    const matchedCmds = commands
      .filter((c) => foldCase(c.label).includes(foldCase(q)))
      .slice(0, 5);
    const out: Row[] = [];
    if (scored.length > 0) {
      out.push({ kind: 'label', label: t('allNotes') });
      scored.forEach(({ f }) => out.push({ kind: 'file', file: f, sub: favSet.has(f) ? '★' : undefined }));
    }
    if (matchedCmds.length > 0) {
      out.push({ kind: 'label', label: t('commands') });
      matchedCmds.forEach((c) => out.push({ kind: 'cmd', cmd: c }));
    }
    if (out.length === 0) out.push({ kind: 'label', label: t('noSearchResults') });
    return out;
  }, [query, files, favorites, recentFiles, commands, activeFile, isTagQuery, tagFiles, t]);

  const selectable = useMemo(() => rows.filter((r) => r.kind !== 'label'), [rows]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    if (index >= selectable.length) setIndex(Math.max(0, selectable.length - 1));
  }, [selectable.length, index]);

  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [index, isOpen]);

  if (!isOpen) return null;

  const activate = (row: Row) => {
    if (row.kind === 'file') { onOpenFile(row.file); onClose(); }
    else if (row.kind === 'cmd') { onClose(); setTimeout(() => row.cmd.run(), 0); }
  };

  let selCursor = -1;

  return (
    <div className="modal-overlay palette-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('commandPalette')}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input-row">
          <Icon name="command" size={16} />
          <input
            ref={inputRef}
            className="palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('palettePlaceholder')}
            aria-label={t('commandPalette')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(selectable.length - 1, i + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); const r = selectable[index]; if (r) activate(r); }
            }}
          />
          <kbd className="shortcut-kbd">esc</kbd>
        </div>
        <div className="palette-list" ref={listRef} role="listbox">
          {rows.map((r, i) => {
            if (r.kind === 'label') {
              return <div key={`l${i}`} className="palette-label">{r.label}</div>;
            }
            selCursor++;
            const si = selCursor;
            const selected = si === index;
            if (r.kind === 'file') {
              return (
                <div
                  key={`f${r.file}`}
                  data-idx={si}
                  role="option"
                  aria-selected={selected}
                  className={`palette-item${selected ? ' selected' : ''}${activeFile === r.file ? ' active' : ''}`}
                  onMouseEnter={() => setIndex(si)}
                  onClick={() => activate(r)}
                >
                  <Icon name="file" size={14} />
                  <span className="palette-item-label">{r.file.replace(/\.md$/, '')}</span>
                  {r.sub && <span className="palette-item-sub">{r.sub}</span>}
                  {activeFile === r.file && <span className="palette-item-sub">•</span>}
                </div>
              );
            }
            return (
              <div
                key={`c${r.cmd.id}`}
                data-idx={si}
                role="option"
                aria-selected={selected}
                className={`palette-item${selected ? ' selected' : ''}`}
                onMouseEnter={() => setIndex(si)}
                onClick={() => activate(r)}
              >
                <Icon name={r.cmd.icon} size={14} />
                <span className="palette-item-label">{r.cmd.label}</span>
                {r.cmd.hint && <span className="palette-item-sub">{r.cmd.hint}</span>}
              </div>
            );
          })}
        </div>
        <div className="palette-footer">
          <span><kbd>↑↓</kbd> {t('navigateHint')}</span>
          <span><kbd>↵</kbd> {t('openHint')}</span>
          <span><kbd>#</kbd> {t('tagSearchHint')}</span>
        </div>
      </div>
    </div>
  );
}
