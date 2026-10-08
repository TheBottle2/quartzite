import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmDialog, readFile } from '../api';
import { useDebouncedValue } from '../hooks/useDebounce';
import { findTextMatches, type TextMatch } from '../utils/search';
import { Icon } from './Icon';
import type { TFunc } from '../i18n';

interface GlobalSearchProps {
  isOpen: boolean;
  files: string[];
  activeFile: string | null;
  activeFileContent: string;
  onFileHit: (file: string, start: number, end: number) => void;
  onReplaceFile: (file: string, matches: TextMatch[], replacement: string) => Promise<void>;
  onClose: () => void;
  t: TFunc;
}

interface FileResult {
  file: string;
  matches: TextMatch[];
  truncated: boolean;
}

interface FlatHit {
  file: string;
  match: TextMatch;
}

const PER_FILE_CAP = 200;

function matchLine(text: string, m: TextMatch): { lineNo: number; before: string; hit: string; after: string } {
  const lineStart = text.lastIndexOf('\n', m.start - 1) + 1;
  let lineEnd = text.indexOf('\n', m.end);
  if (lineEnd === -1) lineEnd = text.length;
  const lineNo = text.slice(0, lineStart).split('\n').length;
  let before = text.slice(lineStart, m.start);
  const hit = text.slice(m.start, m.end);
  let after = text.slice(m.end, lineEnd);
  // Uzun satırları isabet etrafında kırp
  if (before.length + hit.length + after.length > 140) {
    before = before.length > 60 ? '…' + before.slice(-60) : before;
    after = after.length > 60 ? after.slice(0, 60) + '…' : after;
  }
  return { lineNo, before, hit, after };
}

export function GlobalSearch({
  isOpen, files, activeFile, activeFileContent, onFileHit, onReplaceFile, onClose, t,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [contents, setContents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const [replacing, setReplacing] = useState(false);
  const [rev, setRev] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query, 300);
  const opts = { caseSensitive, useRegex, wholeWord };

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen ]);

  // Vault içeriği: panel açıkken bir kez yüklenir (aktif dosya canlı içerik).
  const cacheRef = useRef<{ files: string[]; map: Map<string, string>; rev: number }>({ files, map: new Map(), rev });
  if (cacheRef.current.files !== files || cacheRef.current.rev !== rev) {
    cacheRef.current = { files, map: new Map(), rev };
  }
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const cached = cacheRef.current.map;
      const missing = files.filter((f) => f !== activeFile && !cached.has(f));
      if (missing.length > 0) {
        await Promise.all(missing.map(async (f) => {
          try { cached.set(f, await readFile(f)); }
          catch { cached.set(f, ''); }
        }));
      }
      if (!cancelled) {
        setContents(new Map(cached));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, files, activeFile, rev]);

  const textOf = (f: string) => (f === activeFile ? activeFileContent : (contents.get(f) ?? ''));

  const results: FileResult[] = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];
    const out: FileResult[] = [];
    for (const f of files) {
      const matches = findTextMatches(textOf(f), q, { ...opts, cap: PER_FILE_CAP + 1 });
      if (matches.length > 0) {
        out.push({
          file: f,
          matches: matches.slice(0, PER_FILE_CAP),
          truncated: matches.length > PER_FILE_CAP,
        });
      }
    }
    out.sort((a, b) => b.matches.length - a.matches.length);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, files, contents, activeFile, activeFileContent, caseSensitive, useRegex, wholeWord]);

  const flat: FlatHit[] = useMemo(() => {
    const out: FlatHit[] = [];
    for (const r of results) for (const m of r.matches) out.push({ file: r.file, match: m });
    return out;
  }, [results]);

  const totalMatches = flat.length;

  useEffect(() => { setSel(0); }, [debouncedQuery]);
  useEffect(() => {
    if (sel >= flat.length) setSel(Math.max(0, flat.length - 1));
  }, [flat.length, sel]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-hit="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!isOpen) return null;

  const jump = (h: FlatHit) => onFileHit(h.file, h.match.start, h.match.end);

  const replaceOneFile = async (r: FileResult) => {
    if (replacing) return;
    setReplacing(true);
    try {
      await onReplaceFile(r.file, r.matches, replaceText);
      setRev((v) => v + 1);
    } finally {
      setReplacing(false);
    }
  };

  const replaceAll = async () => {
    if (replacing || totalMatches === 0) return;
    const ok = await confirmDialog(t('confirmReplaceAllVault', { matches: String(totalMatches), files: String(results.length) }));
    if (!ok) return;
    setReplacing(true);
    try {
      for (const r of results) {
        // eslint-disable-next-line no-await-in-loop
        await onReplaceFile(r.file, r.matches, replaceText);
      }
      setRev((v) => v + 1);
    } finally {
      setReplacing(false);
    }
  };

  let cursor = -1;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('globalSearch')}>
      <div className="modal-content global-search" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{t('globalSearch')}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label={t('cancel')}><Icon name="x" size={20} /></button>
        </header>
        <div className="modal-body global-search-body">
          <div className="search-row">
            <Icon name="search" size={14} />
            <input
              ref={inputRef}
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('globalSearchPlaceholder')}
              aria-label={t('globalSearch')}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') { onClose(); return; }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const h = flat[sel];
                  if (h) { jump(h); onClose(); }
                } else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(flat.length - 1, i + 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(0, i - 1)); }
              }}
            />
            <span className="search-count">
              {debouncedQuery.trim() && !loading ? t('filesWithMatches', { files: String(results.length), matches: String(totalMatches) }) : ''}
            </span>
            <button className={`search-btn ${showReplace ? 'active' : ''}`} onClick={() => setShowReplace(!showReplace)} title={t('findAndReplace')}>
              <Icon name="replace" size={14} />
            </button>
          </div>
          {showReplace && (
            <div className="search-row">
              <input
                className="search-input"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder={t('replacePlaceholder')}
                aria-label={t('replaceWith')}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') { onClose(); return; }
                  if (e.key === 'Enter') { e.preventDefault(); void replaceAll(); }
                }}
              />
              <button className="search-btn" disabled={!totalMatches || replacing} onClick={() => void replaceAll()}>
                {t('replaceAll')}
              </button>
            </div>
          )}
          <div className="search-options">
            <label className="search-option"><input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />{t('caseSensitive')}</label>
            <label className="search-option"><input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} />{t('useRegex')}</label>
            <label className="search-option"><input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />{t('wholeWord')}</label>
          </div>
          <div className="global-results" ref={listRef} role="listbox" aria-label={t('globalSearch')}>
            {!debouncedQuery.trim() ? (
              <div className="backlinks-empty">{t('globalSearchHint')}</div>
            ) : loading && contents.size === 0 ? (
              <div className="backlinks-empty">{t('loading')}</div>
            ) : results.length === 0 ? (
              <div className="backlinks-empty">{t('noMatches')}</div>
            ) : (
              results.map((r) => (
                <div key={r.file} className="global-file-group">
                  <div className="global-file-header">
                    <button
                      className="global-file-title"
                      onClick={() => onFileHit(r.file, r.matches[0].start, r.matches[0].end)}
                      title={r.file}
                    >
                      <Icon name="file" size={13} />
                      <span>{r.file.replace(/\.md$/, '')}</span>
                      <span className="file-hits">{r.matches.length}{r.truncated ? '+' : ''}</span>
                    </button>
                    {showReplace && (
                      <button
                        className="search-btn"
                        disabled={replacing}
                        title={t('replaceInFile')}
                        onClick={() => void replaceOneFile(r)}
                      >
                        {t('replace')}
                      </button>
                    )}
                  </div>
                  {r.matches.map((m, i) => {
                    cursor++;
                    const ci = cursor;
                    const ctx = matchLine(textOf(r.file), m);
                    return (
                      <div
                        key={`${r.file}:${m.start}`}
                        data-hit={ci}
                        role="option"
                        aria-selected={ci === sel}
                        className={`global-hit${ci === sel ? ' selected' : ''}`}
                        onMouseEnter={() => setSel(ci)}
                        onClick={() => { jump({ file: r.file, match: m }); onClose(); }}
                        title={`${r.file}:${ctx.lineNo}`}
                      >
                        <span className="global-hit-line">{ctx.lineNo}</span>
                        <span className="global-hit-text">
                          {ctx.before}<mark>{ctx.hit || ' '}</mark>{ctx.after}
                        </span>
                        {i === 0 && <span className="sr-only">{r.file}</span>}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
