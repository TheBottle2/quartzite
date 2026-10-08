import { useMemo } from 'react';
import type { TFunc } from '../i18n';

interface StatusBarProps {
  activeFile: string | null;
  content: string;
  filesCount: number;
  backlinksCount: number;
  t: TFunc;
}

export function StatusBar({ activeFile, content, filesCount, backlinksCount, t }: StatusBarProps) {
  const stats = useMemo(() => {
    const chars = content.length;
    const lines = content ? content.split('\n').length : 0;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { chars, lines, words, minutes };
  }, [content]);

  return (
    <footer className="statusbar" role="status" aria-live="polite">
      <div className="statusbar-left">
        <span className="statusbar-item" title={t('vaultNotesHint')}>
          ◈ {filesCount} {t('notes')}
        </span>
        {activeFile && (
          <>
            <span className="statusbar-sep" aria-hidden="true">|</span>
            <span className="statusbar-item">↔ {backlinksCount} {t('backlinksShort')}</span>
          </>
        )}
      </div>
      <div className="statusbar-right">
        {activeFile ? (
          <>
            <span className="statusbar-item">{t('words', { count: String(stats.words) })}</span>
            <span className="statusbar-sep" aria-hidden="true">|</span>
            <span className="statusbar-item">{t('chars', { count: String(stats.chars) })}</span>
            <span className="statusbar-sep" aria-hidden="true">|</span>
            <span className="statusbar-item">{t('lines', { count: String(stats.lines) })}</span>
            <span className="statusbar-sep" aria-hidden="true">|</span>
            <span className="statusbar-item">~{stats.minutes} {t('minRead')}</span>
          </>
        ) : (
          <span className="statusbar-item statusbar-muted">{t('localFirst')}</span>
        )}
      </div>
    </footer>
  );
}
