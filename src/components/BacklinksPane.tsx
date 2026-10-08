import { useEffect, useMemo, useRef, useState } from 'react';
import { getBacklinks, readFile } from '../api';
import { extractTags, parseOutline } from '../utils/preview';
import { findUnlinkedMentions, type MentionSnippet } from '../utils/search';
import { Icon } from './Icon';
import type { TFunc } from '../i18n';

interface BacklinksPaneProps {
  currentFile: string | null;
  /** canlı editör içeriği (outline + tag için disk okuması gerekmez) */
  content: string;
  files: string[];
  onFileSelect: (file: string) => void;
  onFileHit: (file: string, start: number, end: number) => void;
  onHeadingClick: (offset: number) => void;
  onTagClick: (tag: string) => void;
  t: TFunc;
}

interface BacklinkWithContext {
  file: string;
  context: string;
}

interface MentionGroup { file: string; snippets: MentionSnippet[]; }

type Tab = 'backlinks' | 'mentions' | 'outline' | 'tags';

function collectMentions(cache: Map<string, string>, files: string[], currentFile: string): MentionGroup[] {
  const out: MentionGroup[] = [];
  for (const f of files) {
    if (f === currentFile) continue;
    const text = cache.get(f);
    if (!text) continue;
    const snippets = findUnlinkedMentions(text, currentFile, 4);
    if (snippets.length > 0) out.push({ file: f, snippets });
  }
  return out.slice(0, 30);
}

export function BacklinksPane({ currentFile, content, files, onFileSelect, onFileHit, onHeadingClick, onTagClick, t }: BacklinksPaneProps) {
  const [backlinks, setBacklinks] = useState<BacklinkWithContext[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('backlinks');

  useEffect(() => {
    if (!currentFile) {
      setBacklinks([]);
      return;
    }

    const loadBacklinks = async () => {
      setLoading(true);
      try {
        const files = await getBacklinks(currentFile);
        const linksWithContext: BacklinkWithContext[] = [];

        for (const file of files) {
          try {
            const text = await readFile(file);
            const lines = text.split('\n');
            const regex = /\[\[([^\]]+)\]\]/g;
            let context = '';

            for (const line of lines) {
              regex.lastIndex = 0;
              if (regex.test(line)) {
                context = line.trim().slice(0, 120);
                break;
              }
            }

            linksWithContext.push({ file, context });
          } catch {
            linksWithContext.push({ file, context: '' });
          }
        }

        setBacklinks(linksWithContext);
      } catch (err) {
        console.error('Failed to load backlinks:', err);
        setBacklinks([]);
      } finally {
        setLoading(false);
      }
    };

    loadBacklinks();
  }, [currentFile]);

  const outline = useMemo(() => (currentFile ? parseOutline(content) : []), [currentFile, content]);
  const tags = useMemo(() => (currentFile ? extractTags(content) : []), [currentFile, content]);

  // Bağlantısız anmalar: tüm vault okunur (sekme açılınca, önbellekli).
  const [mentions, setMentions] = useState<MentionGroup[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const mentionCache = useRef<{ files: string[]; title: string; map: Map<string, string> }>({ files, title: '', map: new Map() });
  if (mentionCache.current.files !== files) mentionCache.current = { files, title: '', map: new Map() };

  useEffect(() => {
    if (tab !== 'mentions' || !currentFile) return;
    const title = currentFile.replace(/\.md$/, '');
    const cache = mentionCache.current;
    const missing = files.filter((f) => f !== currentFile && !cache.map.has(f));
    if (missing.length === 0) {
      setMentions(collectMentions(cache.map, files, currentFile));
      return;
    }
    let cancelled = false;
    setMentionsLoading(true);
    (async () => {
      await Promise.all(missing.map(async (f) => {
        try { cache.map.set(f, await readFile(f)); }
        catch { cache.map.set(f, ''); }
      }));
      if (cancelled) return;
      cache.title = title;
      setMentions(collectMentions(cache.map, files, currentFile));
      setMentionsLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, currentFile, files]);

  return (
    <aside className="backlinks-pane" role="complementary" aria-label="Backlinks">
      <header className="backlinks-header backlinks-tabs">
        <div className="pane-tabs" role="tablist">
          <button
            role="tab" aria-selected={tab === 'backlinks'}
            className={`pane-tab${tab === 'backlinks' ? ' active' : ''}`}
            onClick={() => setTab('backlinks')}
            title={t('backlinks')}
          >
            <Icon name="pen" size={12} />
            <span className="pane-tab-label">{t('backlinksShort')}</span>
            <span className="backlinks-count">{backlinks.length}</span>
          </button>
          <button
            role="tab" aria-selected={tab === 'mentions'}
            className={`pane-tab${tab === 'mentions' ? ' active' : ''}`}
            onClick={() => setTab('mentions')}
            title={t('unlinkedMentions')}
          >
            <Icon name="hash" size={12} />
            <span className="pane-tab-label">{t('mentionsShort')}</span>
            {mentions.length > 0 && <span className="backlinks-count">{mentions.length}</span>}
          </button>
          <button
            role="tab" aria-selected={tab === 'outline'}
            className={`pane-tab${tab === 'outline' ? ' active' : ''}`}
            onClick={() => setTab('outline')}
            title={t('outline')}
          >
            <Icon name="list-tree" size={12} />
            <span className="pane-tab-label">{t('outlineShort')}</span>
            {outline.length > 0 && <span className="backlinks-count">{outline.length}</span>}
          </button>
          <button
            role="tab" aria-selected={tab === 'tags'}
            className={`pane-tab${tab === 'tags' ? ' active' : ''}`}
            onClick={() => setTab('tags')}
            title={t('tags')}
          >
            <Icon name="tag" size={12} />
            <span className="pane-tab-label">{t('tagsShort')}</span>
            {tags.length > 0 && <span className="backlinks-count">{tags.length}</span>}
          </button>
        </div>
      </header>

      <div className="backlinks-list" role="list" aria-label="Notes linking to current note">
        {!currentFile ? (
          <div className="backlinks-empty">{t('noNoteSelected')}</div>
        ) : tab === 'backlinks' ? (
          loading ? (
            <div className="backlinks-empty">{t('loading')}</div>
          ) : backlinks.length === 0 ? (
            <div className="backlinks-empty">
              {t('noBacklinksYet')}
              <span className="hint">{t('backlinkHint')}</span>
            </div>
          ) : (
            backlinks.map(({ file, context }) => (
              <div
                key={file}
                className="backlink-item"
                role="listitem"
                onClick={() => onFileSelect(file)}
                title={file}
              >
                <div className="backlink-title">{file.replace(/\.md$/, '')}</div>
                {context && (
                  <div className="backlink-context">{context}</div>
                )}
              </div>
            ))
          )
        ) : tab === 'mentions' ? (
          mentionsLoading ? (
            <div className="backlinks-empty">{t('loading')}</div>
          ) : mentions.length === 0 ? (
            <div className="backlinks-empty">{t('noMentions')}<span className="hint">{t('mentionsHint')}</span></div>
          ) : (
            mentions.map((g) => (
              <div key={g.file} className="mention-group">
                <div className="mention-file" onClick={() => onFileSelect(g.file)} role="listitem" title={g.file}>
                  <Icon name="file" size={12} />
                  <span>{g.file.replace(/\.md$/, '')}</span>
                  <span className="backlinks-count">{g.snippets.length}</span>
                </div>
                {g.snippets.map((s) => (
                  <div
                    key={s.start}
                    className="mention-line"
                    onClick={() => onFileHit(g.file, s.start, s.end)}
                    title={`${g.file}:${s.lineNo}`}
                  >
                    <span className="mention-line-no">{s.lineNo}</span>
                    <span className="mention-line-text">{s.line}</span>
                  </div>
                ))}
              </div>
            ))
          )
        ) : tab === 'outline' ? (
          outline.length === 0 ? (
            <div className="backlinks-empty">{t('noOutline')}<span className="hint">{t('outlineHint')}</span></div>
          ) : (
            outline.map((h, i) => (
              <div
                key={i}
                className="outline-item"
                data-level={h.level}
                style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                onClick={() => onHeadingClick(h.offset)}
                title={h.text}
                role="listitem"
              >
                <span className="outline-text">{h.text}</span>
              </div>
            ))
          )
        ) : tags.length === 0 ? (
          <div className="backlinks-empty">{t('noTags')}<span className="hint">{t('tagsHint')}</span></div>
        ) : (
          <div className="tags-cloud">
            {tags.map((tag) => (
              <button key={tag} className="tag-chip" onClick={() => onTagClick(tag)} title={`#${tag}`}>
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
