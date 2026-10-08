import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { readVault, readFile, getAllFiles, getAllFolders, createFile, createFolder, deleteFile, deleteFolder, renameFile, selectVaultFolder, writeFile, confirmDialog, getBacklinks } from './api';
import type { TextMatch } from './utils/search';
import { getVersion } from '@tauri-apps/api/app';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { BacklinksPane } from './components/BacklinksPane';
import { GraphModal } from './components/GraphModal';
import { WhatsNewModal } from './components/WhatsNewModal';
import { CommandPalette, type PaletteCommand } from './components/CommandPalette';
import { GlobalSearch } from './components/GlobalSearch';
import { StatusBar } from './components/StatusBar';
import { Logo } from './components/Logo';
import { Icon } from './components/Icon';
import { getDailyNotePath, getDailyNoteTemplate, extractDailyNoteDates } from './utils/dailyNotes';
import { createT, detectDefaultLang, LOCALES, LANG_LABELS, type Lang } from './i18n';

const DEFAULT_VAULT_PATH = '/mnt/harddisk/my_apps/vault';

const DEFAULT_SHORTCUTS = {
  newNote: 'Ctrl+N',
  saveNote: 'Ctrl+S',
  deleteNote: 'Ctrl+Shift+Delete',
  searchNotes: 'Ctrl+F',
  commandPalette: 'Ctrl+K',
  quickSwitch: 'Ctrl+P',
  vaultSearch: 'Ctrl+Shift+F',
  toggleSidebar: 'Ctrl+B',
  toggleGraph: 'Ctrl+G',
  toggleCalendar: 'Ctrl+Shift+C',
};

const MODIFIER_KEYS = new Set(['Ctrl', 'Shift', 'Alt', 'Cmd', 'Meta']);

function eventMatchesShortcut(e: KeyboardEvent, binding?: string): boolean {
  if (!binding) return false;
  const parts = binding.split('+').map(p => p.trim()).filter(Boolean);
  const needCtrl = parts.includes('Ctrl');
  const needShift = parts.includes('Shift');
  const needAlt = parts.includes('Alt');
  const needMeta = parts.includes('Cmd') || parts.includes('Meta');
  const main = parts.filter(p => !MODIFIER_KEYS.has(p)).pop();
  if (!main) return false;
  if (e.ctrlKey !== needCtrl || e.shiftKey !== needShift || e.altKey !== needAlt || e.metaKey !== needMeta) return false;
  const eventKey = e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  return eventKey === main.toUpperCase();
}

const SHORTCUT_LABEL_KEYS: Record<string, string> = {
  newNote: 'settingsShortcutActionNewNote',
  saveNote: 'settingsShortcutActionSaveNote',
  deleteNote: 'settingsShortcutActionDeleteNote',
  searchNotes: 'settingsShortcutActionSearchNotes',
  commandPalette: 'settingsShortcutActionCommandPalette',
  quickSwitch: 'settingsShortcutActionQuickSwitch',
  vaultSearch: 'settingsShortcutActionVaultSearch',
  toggleSidebar: 'settingsShortcutActionToggleSidebar',
  toggleGraph: 'settingsShortcutActionToggleGraph',
  toggleCalendar: 'settingsShortcutActionToggleCalendar',
};

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(() => localStorage.getItem('vaultPath'));
  const [files, setFiles] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [sidebarResetKey, setSidebarResetKey] = useState(0);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBacklinks, setShowBacklinks] = useState(true);
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [vaultDialogPath, setVaultDialogPath] = useState(() => localStorage.getItem('vaultPath') || DEFAULT_VAULT_PATH);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' || saved === 'light' || saved === 'system') ? saved as 'dark' | 'light' | 'system' : 'dark';
  });
  // 'system' seçiliyken OS tercihini takip eder (canlı güncellenir).
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const effectiveTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const eff = cur === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true ? 'dark' : 'light') : cur;
      return eff === 'dark' ? 'light' : 'dark';
    });
  }, []);
  const [transparentBg, setTransparentBg] = useState(() => localStorage.getItem('transparentBg') === 'true');
  const [windowOpacity, setWindowOpacity] = useState(() => {
    const val = localStorage.getItem('windowOpacity');
    return val ? parseFloat(val) : 0.9;
  });
  const [wordWrap, setWordWrap] = useState(() => localStorage.getItem('wordWrap') !== 'false');
  const [editorFontSize, setEditorFontSize] = useState(() => {
    const v = parseInt(localStorage.getItem('editorFontSize') || '14', 10);
    return isNaN(v) ? 14 : Math.min(24, Math.max(10, v));
  });
  const [dailyNotesFolder, setDailyNotesFolder] = useState(() => localStorage.getItem('dailyNotesFolder') || 'Daily/');
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    return saved && saved in LOCALES ? saved : detectDefaultLang();
  });
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(() => new Date());
  const [showEditor, setShowEditor] = useState(() => localStorage.getItem('showEditor') !== 'false');
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [recentVaults, setRecentVaults] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('recentVaults');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [shortcuts, setShortcuts] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('shortcuts');
    if (saved) { try { return JSON.parse(saved); } catch { return DEFAULT_SHORTCUTS; } }
    return DEFAULT_SHORTCUTS;
  });
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  // 0.3.0: komut paleti + favoriler + son açılanlar + durum çubuğu
  const [showPalette, setShowPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('openTabs') || '[]'); }
    catch { return []; }
  });
  const [dirtyFiles, setDirtyFiles] = useState<Record<string, boolean>>({});
  // Dışarıdan içerik değişimi sayacı (vault geneli değiştirme): Editor
  // bekleyen otomatik kaydı iptal edip geçmişi sıfırlar.
  const [contentRev, setContentRev] = useState(0);
  const [backlinksCount, setBacklinksCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
    catch { return []; }
  });
  const [recentFiles, setRecentFiles] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('recentFiles') || '[]'); }
    catch { return []; }
  });

  const contentRef = useRef(content);
  contentRef.current = content;

  const noteDates = useMemo(() => extractDailyNoteDates(files, dailyNotesFolder), [files, dailyNotesFolder]);
  const t = useMemo(() => createT(lang), [lang]);
  const locale = LOCALES[lang];

  const updateRecentVaults = useCallback((path: string) => {
    setRecentVaults(prev => {
      const updated = [path, ...prev.filter(v => v !== path)].slice(0, 5);
      localStorage.setItem('recentVaults', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadVault = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const vaultInfo = await readVault(path);
      setVaultPath(vaultInfo.path);
      localStorage.setItem('vaultPath', vaultInfo.path);
      updateRecentVaults(vaultInfo.path);
      setFiles(vaultInfo.files);
      try { setFolders(await getAllFolders()); } catch { setFolders([]); }
      setActiveFile(null);
      setContent('');
      setOpenTabs([]);
      setDirtyFiles({});
      localStorage.removeItem('openTabs');
    } catch (err) {
      console.error('Failed to load vault:', err);
      alert('Failed to load vault: ' + err);
    } finally { setLoading(false); }
  }, [updateRecentVaults]);

  const handleSwitchVault = useCallback(async (path: string) => {
    try { await loadVault(path); setShowSettings(false); }
    catch (error) { console.error('Failed to switch vault:', error); }
  }, [loadVault]);

  const handleRemoveRecentVault = useCallback((path: string) => {
    setRecentVaults(prev => {
      const updated = prev.filter(v => v !== path);
      localStorage.setItem('recentVaults', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetShortcuts = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.setItem('shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
    setEditingShortcut(null); setIsRecording(false); setRecordedKeys([]);
  }, []);

  const saveShortcut = useCallback((action: string) => {
    const keyString = recordedKeys.join('+');
    if (!keyString) return;
    const conflict = Object.entries(shortcuts).find(([a, k]) => a !== action && k === keyString);
    if (conflict) {
      alert(t('shortcutConflict', { action: t((SHORTCUT_LABEL_KEYS[conflict[0]] ?? conflict[0]) as never) }));
      return;
    }
    const newShortcuts = { ...shortcuts, [action]: keyString };
    setShortcuts(newShortcuts);
    localStorage.setItem('shortcuts', JSON.stringify(newShortcuts));
    setEditingShortcut(null); setIsRecording(false); setRecordedKeys([]);
  }, [shortcuts, recordedKeys, t]);

  useEffect(() => {
    if (!isRecording) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.metaKey) keys.push('Cmd');
      const key = e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        keys.push(key.length === 1 ? key.toUpperCase() : key);
        setRecordedKeys(keys);
        setIsRecording(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  // Sekmeler: her açılan not listede tutulur (Obsidian tarzı).
  // Silinen notlar listeden düşer; ağaç güncellenince de temizlenir.
  useEffect(() => {
    setOpenTabs((prev) => {
      const kept = prev.filter((f) => files.includes(f));
      return kept.length === prev.length ? prev : kept;
    });
  }, [files]);

  // Oturum başında sekmeleri geri yükle: son sekmeyi aç (bir kez).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || files.length === 0 || activeFile) return;
    const last = openTabs.filter((f) => files.includes(f)).pop();
    if (!last) { restoredRef.current = true; return; }
    restoredRef.current = true;
    readFile(last).then((text) => { setActiveFile(last); setContent(text); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, activeFile]);

  const openInTab = useCallback((file: string) => {
    setOpenTabs((prev) => {
      if (prev.includes(file)) return prev;
      const next = [...prev, file];
      localStorage.setItem('openTabs', JSON.stringify(next));
      return next;
    });
  }, []);

  const closeTab = useCallback(async (file: string) => {
    const isActive = file === activeFile;
    const idx = openTabs.indexOf(file);
    setOpenTabs((prev) => {
      const next = prev.filter((f) => f !== file);
      localStorage.setItem('openTabs', JSON.stringify(next));
      return next;
    });
    if (!isActive) return;
    const neighbor = idx >= 0 ? (openTabs[idx - 1] ?? openTabs[idx + 1]) : undefined;
    if (neighbor) {
      try {
        const text = await readFile(neighbor);
        setActiveFile(neighbor);
        setContent(text);
      } catch { setActiveFile(null); setContent(''); }
    } else {
      setActiveFile(null);
      setContent('');
    }
  }, [activeFile, openTabs]);

  const cycleTab = useCallback((dir: 1 | -1) => {
    if (openTabs.length === 0) return;
    const idx = activeFile ? openTabs.indexOf(activeFile) : -1;
    const next = openTabs[((idx + dir) % openTabs.length + openTabs.length) % openTabs.length];
    if (next && next !== activeFile) {
      readFile(next).then((text) => { setActiveFile(next); setContent(text); }).catch(() => {});
    }
  }, [openTabs, activeFile]);

  const handleDirtyChange = useCallback((file: string, dirty: boolean) => {
    setDirtyFiles((prev) => (dirty ? { ...prev, [file]: true } : (() => {
      const next = { ...prev };
      delete next[file];
      return next;
    })()));
  }, []);

  const loadFile = useCallback(async (file: string) => {
    if (activeFile === file) { setActiveFile(null); setContent(''); setOpenTabs((p) => p.filter((f) => f !== file)); return; }
    try {
      const fileContent = await readFile(file);
      setActiveFile(file);
      setContent(fileContent);
      openInTab(file);
      setRecentFiles((prev) => {
        const updated = [file, ...prev.filter((f) => f !== file)].slice(0, 10);
        localStorage.setItem('recentFiles', JSON.stringify(updated));
        return updated;
      });
    } catch (err) { console.error('Failed to load file:', err); }
  }, [activeFile, openInTab]);

  const toggleFavorite = useCallback((file: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file];
      localStorage.setItem('favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const openPalette = useCallback((query = '') => { setPaletteQuery(query); setShowPalette(true); }, []);
  const handleTagClick = useCallback((tag: string) => openPalette(`#${tag}`), [openPalette]);

  useEffect(() => {
    if (!activeFile) { setBacklinksCount(0); return; }
    let cancelled = false;
    getBacklinks(activeFile).then((list) => { if (!cancelled) setBacklinksCount(list.length); }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeFile, files]);

  // Ad doğrulama: oluşturmadan ÖNCE klasör/not çakışması ve geçersiz ad yakalanır.
  const validateFolderName = useCallback((raw: string): string | null => {
    const name = raw.trim().replace(/^\/+|\/+$/g, '');
    if (!name) return null; // boşken buton zaten kapalı
    const segs = name.split('/');
    if (segs.some((s) => s === '' || s === '.' || s === '..')) return t('invalidName');
    if (/[<>:"|?*\x00-\x1F]/.test(name)) return t('invalidName');
    if (folders.some((f) => f.toLowerCase() === name.toLowerCase())) return t('alreadyExists', { name });
    return null;
  }, [folders, t]);

  const validateNoteName = useCallback((raw: string): string | null => {
    const name = raw.trim();
    if (!name) return null;
    if (name.split('/').some((s) => s === '' || s === '.' || s === '..')) return t('invalidName');
    if (/[<>:"|?*\x00-\x1F]/.test(name)) return t('invalidName');
    const fileName = name.endsWith('.md') ? name : `${name}.md`;
    if (files.some((f) => f.toLowerCase() === fileName.toLowerCase())) return t('alreadyExists', { name });
    return null;
  }, [files, t]);

  const [newNoteError, setNewNoteError] = useState('');
  const [newFolderError, setNewFolderError] = useState('');

  const handleNewFile = useCallback(async (name: string): Promise<string | null> => {
    if (!name.trim()) return null;
    try {
      const fileName = name.trim().endsWith('.md') ? name.trim() : `${name.trim()}.md`;
      await createFile(fileName);
      setFiles(await getAllFiles());
      try { setFolders(await getAllFolders()); } catch { /* ignore */ }
      setSidebarResetKey(k => k + 1);
      loadFile(fileName);
      return null;
    } catch (err) { console.error('Failed to create file:', err); return String(err); }
  }, [loadFile]);

  const handleNewFolder = useCallback(async (name: string): Promise<string | null> => {
    if (!name.trim()) return null;
    try {
      const folder = name.trim().replace(/^\/+|\/+$/g, '');
      await createFolder(folder);
      setFiles(await getAllFiles());
      try { setFolders(await getAllFolders()); } catch { /* ignore */ }
      setSidebarResetKey(k => k + 1);
      return null;
    } catch (err) { console.error('Failed to create folder:', err); return String(err); }
  }, []);

  const handleDeleteFile = useCallback(async (fileName: string) => {
    try {
      await deleteFile(fileName);
      setFiles(await getAllFiles());
      try { setFolders(await getAllFolders()); } catch { /* ignore */ }
      setOpenTabs((prev) => prev.filter((f) => f !== fileName));
      setDirtyFiles((prev) => { const n = { ...prev }; delete n[fileName]; return n; });
      if (activeFile === fileName) { setActiveFile(null); setContent(''); }
    } catch (err) { console.error('Failed to delete file:', err); }
  }, [activeFile]);

  // Arama isabetine atlama: dosyayı açıp imleci isabetin üstüne koyar.
  const [pendingSelect, setPendingSelect] = useState<{ file: string; start: number; end: number } | null>(null);
  const consumePendingSelect = useCallback(() => setPendingSelect(null), []);
  const handleHeadingJump = useCallback((offset: number) => {
    if (activeFile) setPendingSelect({ file: activeFile, start: offset, end: offset });
  }, [activeFile]);
  const handleFileHit = useCallback(async (file: string, start: number, end: number) => {
    if (file !== activeFile) {
      try {
        const fileContent = await readFile(file);
        setActiveFile(file);
        setContent(fileContent);
        setShowEditor(true);
        openInTab(file);
        setPendingSelect({ file, start, end });
      } catch (err) { console.error('Failed to open file:', err); }
    } else {
      setPendingSelect({ file, start, end });
    }
  }, [activeFile, openInTab]);

  // Vault geneli değiştirme: taze metne uygula, diske yaz, editör bekleyen kaydını iptal etsin.
  const handleVaultReplace = useCallback(async (file: string, matches: TextMatch[], replacement: string) => {
    const apply = (text: string) => {
      const sorted = [...matches].sort((a, b) => a.start - b.start);
      let next = '';
      let last = 0;
      for (const m of sorted) {
        const s = Math.max(0, Math.min(m.start, text.length));
        const e = Math.max(s, Math.min(m.end, text.length));
        if (s < last) continue;
        next += text.slice(last, s) + replacement;
        last = e;
      }
      return next + text.slice(last);
    };
    try {
      if (file === activeFile) {
        const next = apply(contentRef.current);
        setContent(next);
        await writeFile(file, next);
        setContentRev((v) => v + 1);
      } else {
        const text = await readFile(file);
        await writeFile(file, apply(text));
      }
    } catch (err) { console.error('Failed to replace in file:', err); }
  }, [activeFile]);

  // Klasör silme: içindeki notlar da gider; sekmeler, favoriler ve
  // günlük not klasörü temizlenir.
  const handleDeleteFolder = useCallback(async (folder: string) => {
    const inside = files.filter((f) => f === folder || f.startsWith(`${folder}/`));
    const extraFolders = folders.filter((f) => f === folder || f.startsWith(`${folder}/`)).length;
    const count = inside.length;
    const ok = await confirmDialog(
      count > 0
        ? t('deleteFolderConfirm', { name: folder, count: String(count) })
        : t('deleteEmptyFolderConfirm', { name: folder })
    );
    if (!ok) return;
    try {
      // Aktif not silinecekse önce içeriği diske yaz (yoksa kaydedilmemiş yazı kaybolur)
      if (activeFile && (activeFile === folder || activeFile.startsWith(`${folder}/`))) {
        try { await writeFile(activeFile, contentRef.current); } catch { /* ignore */ }
      }
      await deleteFolder(folder);
      const nextFiles = await getAllFiles();
      setFiles(nextFiles);
      try { setFolders(await getAllFolders()); } catch { /* ignore */ }
      setOpenTabs((prev) => prev.filter((f) => !(f === folder || f.startsWith(`${folder}/`))));
      setFavorites((prev) => {
        const next = prev.filter((f) => !(f === folder || f.startsWith(`${folder}/`)));
        localStorage.setItem('favorites', JSON.stringify(next));
        return next;
      });
      setRecentFiles((prev) => {
        const next = prev.filter((f) => !(f === folder || f.startsWith(`${folder}/`)));
        localStorage.setItem('recentFiles', JSON.stringify(next));
        return next;
      });
      if (activeFile && (activeFile === folder || activeFile.startsWith(`${folder}/`))) {
        setActiveFile(null);
        setContent('');
      }
      if (dailyNotesFolder === folder || dailyNotesFolder === `${folder}/` || dailyNotesFolder.startsWith(`${folder}/`)) {
        setDailyNotesFolder('Daily/');
        localStorage.setItem('dailyNotesFolder', 'Daily/');
      }
      if (extraFolders > 0) setSidebarResetKey((k) => k + 1);
    } catch (err) { console.error('Failed to delete folder:', err); }
  }, [files, folders, activeFile, dailyNotesFolder, t]);

  const handleRenameFile = useCallback(async (oldName: string, newName: string) => {
    if (oldName === newName) return;
    try {
      // Aktif dosyayı taşıyorsak: ekrandaki güncel içeriği ÖNCE diske yaz,
      // yoksa debounced kayıp eski yolda kopya/boş dosya oluşturur.
      if (activeFile === oldName) {
        try { await writeFile(oldName, contentRef.current); } catch { /* ignore */ }
      }
      if (files.includes(newName)) {
        const ok = await confirmDialog(t('renameExists', { name: newName.replace(/\.md$/, '') }));
        if (!ok) return;
        await deleteFile(newName);
      }
      await renameFile(oldName, newName);
      setFiles(await getAllFiles());
      try { setFolders(await getAllFolders()); } catch { /* ignore */ }
      if (activeFile === oldName) setActiveFile(newName);
      setOpenTabs((prev) => prev.map((f) => (f === oldName ? newName : f)));
      setDirtyFiles((prev) => {
        if (!prev[oldName]) return prev;
        const n = { ...prev };
        n[newName] = true;
        delete n[oldName];
        return n;
      });
    } catch (err) { console.error('Failed to rename file:', err); alert(String(err)); }
  }, [files, activeFile, t]);

  const handleRefresh = useCallback(async () => {
    if (vaultPath) {
      setFiles(await getAllFiles());
      try { setFolders(await getAllFolders()); } catch { /* ignore */ }
    }
  }, [vaultPath]);

  // [[Not]] → gerçek dosya (ad veya yol, büyük/küçük harf duyarsız)
  const resolveLinkFile = useCallback((link: string) =>
    files.find((f) => f.toLowerCase().replace(/\.md$/, '') === link.toLowerCase())
    ?? files.find((f) => (f.split('/').pop() || '').toLowerCase().replace(/\.md$/, '') === link.toLowerCase())
    ?? null, [files]);

  const handleLinkClick = useCallback((link: string) => {
    const targetFile = resolveLinkFile(link);
    if (targetFile) {
      // Kendine bağlantı: notu kapatma, sadece odaklan (Obsidian davranışı).
      if (targetFile === activeFile) { setShowEditor(true); return; }
      loadFile(targetFile);
    } else {
      const newFileName = `${link}.md`;
      createFile(newFileName).then(() => handleRefresh()).then(() => loadFile(newFileName)).catch(console.error);
    }
  }, [resolveLinkFile, loadFile, handleRefresh, activeFile]);

  const handleOpenVaultDialog = useCallback(async () => {
    try {
      const path = await selectVaultFolder();
      if (path) setVaultDialogPath(path);
    } catch (err) { console.error('Failed to open dialog:', err); }
  }, []);

  const handleOpenGraphModal = useCallback(() => setShowGraphModal(true), []);
  const handleGraphModalCancel = useCallback(() => setShowGraphModal(false), []);

  const handleVaultDialogConfirm = useCallback(async () => {
    if (vaultDialogPath) { await loadVault(vaultDialogPath); setShowVaultDialog(false); }
  }, [vaultDialogPath, loadVault]);

  const handleVaultDialogCancel = useCallback(() => {
    setShowVaultDialog(false);
    setVaultDialogPath(vaultPath || DEFAULT_VAULT_PATH);
  }, [vaultPath]);

  const handleNewNoteConfirm = useCallback(async () => {
    if (!newNoteName.trim()) return;
    const live = validateNoteName(newNoteName);
    if (live) { setNewNoteError(live); return; }
    const err = await handleNewFile(newNoteName);
    if (err) setNewNoteError(err);
    else { setNewNoteName(''); setNewNoteError(''); setShowNewNoteModal(false); }
  }, [newNoteName, handleNewFile, validateNoteName]);

  const handleNewNoteCancel = useCallback(() => { setNewNoteName(''); setNewNoteError(''); setShowNewNoteModal(false); }, []);
  const handleOpenNewNoteModal = useCallback(() => { setNewNoteError(''); setShowNewNoteModal(true); }, []);
  const handleNewFolderConfirm = useCallback(async () => {
    if (!newFolderName.trim()) return;
    const live = validateFolderName(newFolderName);
    if (live) { setNewFolderError(live); return; }
    const err = await handleNewFolder(newFolderName);
    if (err) setNewFolderError(err);
    else { setNewFolderName(''); setNewFolderError(''); setShowNewFolderModal(false); }
  }, [newFolderName, handleNewFolder, validateFolderName]);
  const handleNewFolderCancel = useCallback(() => { setNewFolderName(''); setNewFolderError(''); setShowNewFolderModal(false); }, []);
  const handleOpenNewFolderModal = useCallback(() => { setNewFolderError(''); setShowNewFolderModal(true); }, []);
  // Klasör menüsünden "Klasöre yeni not": ad önceden doldurulur.
  const handleNewNoteInFolder = useCallback((folder: string) => {
    setNewNoteName(`${folder.replace(/^\/+|\/+$/g, '')}/`);
    setNewNoteError('');
    setShowNewNoteModal(true);
  }, []);

  const handleSetOpacity = useCallback((opacity: number) => {
    const clamped = Math.max(0.6, Math.min(1, opacity));
    setWindowOpacity(clamped);
    localStorage.setItem('windowOpacity', String(clamped));
    document.documentElement.style.setProperty('--window-opacity', String(clamped));
  }, []);

  const handleOpenDailyNote = useCallback(async (date: Date) => {
    const path = getDailyNotePath(dailyNotesFolder, date);
    const exists = files.some(f => f === path || f.endsWith(`/${path}`));
    if (!exists) {
      try {
        await createFile(path);
        await writeFile(path, getDailyNoteTemplate(date));
        setFiles(await getAllFiles());
      } catch (err) {
        console.error('Failed to create daily note:', err);
        alert('Failed to create daily note: ' + err);
        return;
      }
    }
    loadFile(path);
  }, [dailyNotesFolder, files, loadFile]);

  const handleSetDailyNotesFolder = useCallback((folder: string) => {
    const normalized = folder.trim().replace(/^\/+|\/+$/g, '') + '/';
    setDailyNotesFolder(normalized);
    localStorage.setItem('dailyNotesFolder', normalized);
  }, []);

  const handleSelectDailyFolder = useCallback(async () => {
    try {
      const path = await selectVaultFolder();
      if (path && vaultPath) {
        if (path.startsWith(vaultPath)) {
          const relative = path.replace(vaultPath, '').replace(/^\/+|\/+$/g, '');
          const val = relative ? relative + '/' : 'Daily/';
          setDailyNotesFolder(val); localStorage.setItem('dailyNotesFolder', val);
        } else {
          const val = (path.split('/').pop() || 'Daily') + '/';
          setDailyNotesFolder(val); localStorage.setItem('dailyNotesFolder', val);
        }
      }
    } catch (err) { console.error('Failed to select daily folder:', err); }
  }, [vaultPath]);

  const toggleCalendar = useCallback(() => {
    setShowCalendar(prev => !prev);
    if (!showCalendar) setShowSidebar(true);
  }, [showCalendar]);

  const openSearch = useCallback(() => {
    if (activeFile) { setShowEditor(true); setShowSearchBar(true); }
  }, [activeFile]);

  const handleSaveNow = useCallback(async () => {
    if (!activeFile) return;
    try { await writeFile(activeFile, contentRef.current); }
    catch (err) { console.error('Failed to save file:', err); }
  }, [activeFile]);

  const handleDeleteActive = useCallback(async () => {
    if (!activeFile) return;
    const ok = await confirmDialog(t('deleteNoteConfirm', { name: activeFile.replace(/\.md$/, '') }));
    if (ok) handleDeleteFile(activeFile);
  }, [activeFile, handleDeleteFile, t]);

  useEffect(() => {
    const savedVaultPath = localStorage.getItem('vaultPath');
    loadVault(savedVaultPath || DEFAULT_VAULT_PATH);
  }, [loadVault]);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('0.2.12'));
  }, []);

  // Sürüm değiştiyse Yenilikler penceresini bir kez göster (ilk kurulumda değil).
  useEffect(() => {
    if (!appVersion) return;
    const seen = localStorage.getItem('seenVersion');
    if (seen && seen !== appVersion) setShowWhatsNew(true);
    localStorage.setItem('seenVersion', appVersion);
  }, [appVersion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const match = (action: string) => eventMatchesShortcut(e, shortcuts[action]);
      if (match('newNote')) { e.preventDefault(); setShowNewNoteModal(true); return; }
      if (match('saveNote')) { e.preventDefault(); void handleSaveNow(); return; }
      if (match('deleteNote')) { e.preventDefault(); void handleDeleteActive(); return; }
      if (match('searchNotes')) { e.preventDefault(); openSearch(); return; }
      if (match('vaultSearch')) { e.preventDefault(); setShowGlobalSearch(true); return; }
      if (match('commandPalette') || match('quickSwitch')) { e.preventDefault(); openPalette(); return; }
      if (match('toggleSidebar')) { e.preventDefault(); setShowSidebar(s => !s); return; }
      if (match('toggleGraph')) { e.preventDefault(); setShowGraphModal(s => !s); return; }
      if (match('toggleCalendar')) { e.preventDefault(); toggleCalendar(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); setShowSettings(true); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); setShowBacklinks(s => !s); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); void handleOpenDailyNote(new Date()); return; }
      // Sekmeler: Ctrl+W kapatır, Ctrl+Tab / Ctrl+Shift+Tab gezinir
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') { e.preventDefault(); if (activeFile) void closeTab(activeFile); return; }
      if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); cycleTab(e.shiftKey ? -1 : 1); return; }
      if (e.key === 'Escape') {
        if (showGlobalSearch) setShowGlobalSearch(false);
        else if (showPalette) setShowPalette(false);
        else if (showSearchBar) setShowSearchBar(false);
        else if (showNewNoteModal) { setShowNewNoteModal(false); setNewNoteName(''); }
        else if (showVaultDialog) handleVaultDialogCancel();
        else if (showSettings) setShowSettings(false);
        else if (showGraphModal) setShowGraphModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    shortcuts, showNewNoteModal, showVaultDialog, showSettings, showGraphModal, showSearchBar, showPalette, showGlobalSearch,
    handleSaveNow, handleDeleteActive, openSearch, toggleCalendar, openPalette, activeFile, closeTab, cycleTab,
    handleVaultDialogCancel, handleOpenDailyNote,
  ]);

  useEffect(() => {
    if (transparentBg) {
      document.body.classList.add('transparent-bg');
      document.documentElement.style.setProperty('--window-opacity', String(windowOpacity));
    } else {
      document.body.classList.remove('transparent-bg');
    }
    localStorage.setItem('transparentBg', String(transparentBg));
  }, [transparentBg, windowOpacity]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    localStorage.setItem('theme', theme);
  }, [theme, effectiveTheme]);
  useEffect(() => { localStorage.setItem('wordWrap', String(wordWrap)); }, [wordWrap]);
  useEffect(() => { localStorage.setItem('editorFontSize', String(editorFontSize)); }, [editorFontSize]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => { localStorage.setItem('showEditor', String(showEditor)); }, [showEditor]);

  const paletteCommands: PaletteCommand[] = useMemo(() => [
    { id: 'new-note', label: t('newNoteTitle'), hint: shortcuts.newNote, icon: 'plus', run: () => setShowNewNoteModal(true) },
    { id: 'daily', label: t('dailyNote'), hint: 'Ctrl+Shift+D', icon: 'calendar', run: () => void handleOpenDailyNote(new Date()) },
    { id: 'palette-search', label: t('searchVault'), hint: shortcuts.searchNotes, icon: 'search', run: () => openSearch() },
    { id: 'vault-search', label: t('globalSearch'), hint: shortcuts.vaultSearch, icon: 'search', run: () => setShowGlobalSearch(true) },
    { id: 'graph', label: t('graphView'), hint: shortcuts.toggleGraph, icon: 'graph', run: () => setShowGraphModal(true) },
    { id: 'sidebar', label: t('toggleSidebar'), hint: shortcuts.toggleSidebar, icon: 'menu', run: () => setShowSidebar((s) => !s) },
    { id: 'backlinks', label: t('toggleBacklinks'), icon: 'pen', run: () => setShowBacklinks((s) => !s) },
    { id: 'calendar', label: t('showCalendar'), hint: shortcuts.toggleCalendar, icon: 'calendar', run: () => toggleCalendar() },
    { id: 'theme', label: `${t('settingsTheme')}: ${effectiveTheme === 'dark' ? t('settingsLight') : t('settingsDark')}`, icon: effectiveTheme === 'dark' ? 'sun' : 'moon', run: () => toggleTheme() },
    { id: 'wrap', label: `${t('settingsWordWrap')}: ${wordWrap ? t('off') : t('on')}`, icon: 'list', run: () => setWordWrap((w) => !w) },
    { id: 'settings', label: t('settings'), hint: 'Ctrl+,', icon: 'settings', run: () => setShowSettings(true) },
  ], [t, shortcuts, handleOpenDailyNote, openSearch, toggleCalendar, effectiveTheme, toggleTheme, theme, wordWrap]);

  return (
    <div className="app">
      <header className="toolbar" role="toolbar" aria-label="Main toolbar">
        <div className="toolbar-left">
          <button className="btn icon-only" onClick={() => setShowSidebar(!showSidebar)} aria-pressed={showSidebar} aria-label={t('toggleSidebar')} title={t('toggleSidebar')}>
            <Icon name="menu" />
          </button>
          <Logo size={18} />
          <span className="toolbar-title">{vaultPath ? vaultPath.split('/').pop() : 'Quartzite'}</span>
          {appVersion && <span className="version-badge">v{appVersion}</span>}
        </div>
        <div className="toolbar-right">
          <button className="btn icon-only palette-trigger" data-priority="1" onClick={() => openPalette()} aria-label={t('commandPalette')} title={t('commandPalette')}>
            <Icon name="command" />
          </button>
          <button className="btn icon-only" data-priority="3" onClick={() => void handleOpenDailyNote(new Date())} disabled={!vaultPath} aria-label={t('dailyNote')} title={t('dailyNote')}>
            <Icon name="calendar" />
          </button>
          <button className="btn icon-only" data-priority="1" onClick={handleOpenNewNoteModal} disabled={!vaultPath} aria-label={t('newNote')} title={t('newNote')}>
            <Icon name="plus" />
          </button>
          <button className="btn icon-only" data-priority="2" onClick={handleRefresh} disabled={!vaultPath || loading} aria-label={t('refresh')} title={t('refresh')}>
            <Icon name="refresh" />
          </button>
          <div className="toolbar-divider" data-div-priority="2" />
          <button className="btn icon-only" data-priority="2" onClick={() => setShowBacklinks(!showBacklinks)} aria-pressed={showBacklinks} aria-label={t('toggleBacklinks')} title={t('toggleBacklinks')}>
            <Icon name="pen" />
          </button>
          <div className="toolbar-divider" data-div-priority="3" />
          <button className="btn icon-only" data-priority="2" onClick={handleOpenGraphModal} aria-label={t('graphView')} title={t('graphView')}>
            <Icon name="graph" />
          </button>
          <button className="btn icon-only" data-priority="3" onClick={toggleTheme} aria-label={t('settingsTheme')} title={`${t('settingsTheme')}: ${effectiveTheme === 'dark' ? t('settingsLight') : t('settingsDark')}`}>
            <Icon name={effectiveTheme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button className="btn icon-only" data-priority="1" onClick={() => setShowSettings(true)} aria-label={t('settings')} title={t('settings')}>
            <Icon name="settings" />
          </button>
        </div>
      </header>
      <div className="app-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showSidebar && (
          <>
            <Sidebar
              files={files} folders={folders} resetKey={sidebarResetKey} activeFile={activeFile} activeFileContent={content}
              favorites={favorites} recentFiles={recentFiles} onToggleFavorite={toggleFavorite}
              onDeleteFolder={handleDeleteFolder} onNewNoteInFolder={handleNewNoteInFolder}
              onFileSelect={loadFile} onDeleteFile={handleDeleteFile}
              onFileHit={handleFileHit} onRenameFile={handleRenameFile}
              onNewNote={handleOpenNewNoteModal} onNewFolder={handleOpenNewFolderModal} currentCalendarMonth={currentCalendarMonth}
              onCalendarMonthChange={setCurrentCalendarMonth} onOpenDailyNote={handleOpenDailyNote}
              noteDates={noteDates} t={t} locale={locale} showCalendar={showCalendar}
            />
            <div
              className="resizer"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 240;
                const handleMove = (me: MouseEvent) => {
                  const newWidth = Math.max(200, Math.min(400, startWidth + (me.clientX - startX)));
                  document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
                };
                const handleUp = () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
              }}
              aria-label="Resize sidebar" role="separator"
            />
          </>
        )}
        <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
          <div className="editor-column">
            {openTabs.length > 0 && (
              <div className="tabbar" role="tablist" aria-label={t('openTabs')}>
                {openTabs.map((f) => (
                  <div
                    key={f}
                    role="tab"
                    aria-selected={f === activeFile}
                    tabIndex={0}
                    className={`tab${f === activeFile ? ' active' : ''}`}
                    title={f}
                    onClick={() => { if (f !== activeFile) loadFile(f); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && f !== activeFile) loadFile(f); }}
                    onAuxClick={(e) => { if (e.button === 1) void closeTab(f); }}
                  >
                    {dirtyFiles[f] && <span className="tab-dirty" aria-hidden="true" />}
                    <span className="tab-title">{f.replace(/\.md$/, '').split('/').pop()}</span>
                    <button
                      className="tab-close"
                      onClick={(e) => { e.stopPropagation(); void closeTab(f); }}
                      aria-label={t('closeTab')}
                      title={t('closeTab')}
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Editor
            fileName={activeFile} content={content} onContentChange={setContent} onLinkClick={handleLinkClick}
            onTagClick={handleTagClick} isFavorite={activeFile ? favorites.includes(activeFile) : false}
            onToggleFavorite={activeFile ? () => toggleFavorite(activeFile) : undefined}
            contentRevision={contentRev}
            onDeleteFile={handleDeleteFile} onOpenVault={() => setShowVaultDialog(true)}
            showEditor={showEditor} setShowEditor={setShowEditor}
            showSearchBar={showSearchBar} setShowSearchBar={setShowSearchBar}
            pendingSelect={pendingSelect} onPendingSelectConsumed={consumePendingSelect}
            wordWrap={wordWrap} fontSize={editorFontSize} onFontSizeChange={setEditorFontSize}
            resolveLink={resolveLinkFile}
            onDirtyChange={handleDirtyChange}
            t={t}
            />
          </div>
        </div>
        {showBacklinks && (
          <>
            <div
              className="resizer"
              style={{ left: 'auto', right: 'auto' }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--backlinks-width')) || 300;
                const handleMove = (me: MouseEvent) => {
                  const newWidth = Math.max(200, Math.min(400, startWidth - (me.clientX - startX)));
                  document.documentElement.style.setProperty('--backlinks-width', `${newWidth}px`);
                };
                const handleUp = () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
              }}
              aria-label="Resize backlinks pane" role="separator"
            />
            <BacklinksPane currentFile={activeFile} content={content} files={files} onFileSelect={loadFile} onFileHit={handleFileHit} onHeadingClick={handleHeadingJump} onTagClick={handleTagClick} t={t} />
          </>
        )}
      </div>
      <StatusBar activeFile={activeFile} content={content} filesCount={files.length} backlinksCount={backlinksCount} t={t} />

      <CommandPalette
        isOpen={showPalette}
        initialQuery={paletteQuery}
        files={files}
        activeFile={activeFile}
        favorites={favorites}
        recentFiles={recentFiles}
        commands={paletteCommands}
        onOpenFile={loadFile}
        onClose={() => setShowPalette(false)}
        t={t}
      />

      <GlobalSearch
        isOpen={showGlobalSearch}
        files={files}
        activeFile={activeFile}
        activeFileContent={content}
        onFileHit={handleFileHit}
        onReplaceFile={handleVaultReplace}
        onClose={() => setShowGlobalSearch(false)}
        t={t}
      />

      {showVaultDialog && (
        <div className="modal-overlay" onClick={handleVaultDialogCancel} role="dialog" aria-modal="true" aria-labelledby="vault-dialog-title">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="vault-dialog-title">{t('selectVaultFolder')}</h2>
              <button className="modal-close-btn" onClick={handleVaultDialogCancel} aria-label={t('cancel')}><Icon name="x" size={20} /></button>
            </header>
            <div className="modal-body">
              <p className="modal-description">{t('chooseVaultDesc')}</p>
              <div className="modal-path-input">
                <label htmlFor="vault-path-input" className="modal-label">{t('vaultPath')}</label>
                <div className="modal-input-wrapper">
                  <input id="vault-path-input" type="text" value={vaultDialogPath}
                    onChange={(e) => setVaultDialogPath(e.target.value)}
                    placeholder={t('vaultPlaceholder')} className="modal-input" autoFocus />
                  <button className="btn secondary" onClick={handleOpenVaultDialog}><Icon name="folder" /> {t('browse')}</button>
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn secondary" onClick={handleVaultDialogCancel}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleVaultDialogConfirm} disabled={!vaultDialogPath.trim()}>{t('selectVault')}</button>
            </footer>
          </div>
        </div>
      )}

      {showNewNoteModal && (
        <div className="modal-overlay" onClick={handleNewNoteCancel} role="dialog" aria-modal="true" aria-labelledby="newnote-dialog-title">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="newnote-dialog-title">{t('newNoteTitle')}</h2>
              <button className="modal-close-btn" onClick={handleNewNoteCancel} aria-label={t('cancel')}><Icon name="x" size={20} /></button>
            </header>
            <div className="modal-body">
              <div className="modal-path-input">
                <label htmlFor="newnote-name-input" className="modal-label">{t('noteName')}</label>
                <input id="newnote-name-input" type="text" value={newNoteName}
                  onChange={(e) => { setNewNoteName(e.target.value); setNewNoteError(''); }} placeholder={t('noteNamePlaceholder')}
                  className="modal-input" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNewNoteConfirm(); if (e.key === 'Escape') handleNewNoteCancel(); }} />
                {(newNoteError || validateNoteName(newNoteName)) && newNoteName.trim() && (
                  <p className="modal-error" role="alert">{newNoteError || validateNoteName(newNoteName)}</p>
                )}
                <p className="modal-hint" style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: '6px' }}>Subfolders with <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '3px' }}>/</code> — e.g. <code>Projects/My Note</code></p>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn secondary" onClick={handleNewNoteCancel}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleNewNoteConfirm} disabled={!newNoteName.trim() || !!validateNoteName(newNoteName)}>{t('create')}</button>
            </footer>
          </div>
        </div>
      )}

      {showNewFolderModal && (
        <div className="modal-overlay" onClick={handleNewFolderCancel} role="dialog" aria-modal="true" aria-labelledby="newfolder-dialog-title">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="newfolder-dialog-title">{t('newFolderTitle')}</h2>
              <button className="modal-close-btn" onClick={handleNewFolderCancel} aria-label={t('cancel')}><Icon name="x" size={20} /></button>
            </header>
            <div className="modal-body">
              <div className="modal-path-input">
                <label htmlFor="newfolder-name-input" className="modal-label">{t('folderName')}</label>
                <input id="newfolder-name-input" type="text" value={newFolderName}
                  onChange={(e) => { setNewFolderName(e.target.value); setNewFolderError(''); }} placeholder={t('folderNamePlaceholder')}
                  className="modal-input" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNewFolderConfirm(); if (e.key === 'Escape') handleNewFolderCancel(); }} />
                {(newFolderError || validateFolderName(newFolderName)) && newFolderName.trim() && (
                  <p className="modal-error" role="alert">{newFolderError || validateFolderName(newFolderName)}</p>
                )}
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn secondary" onClick={handleNewFolderCancel}>{t('cancel')}</button>
              <button className="btn primary" onClick={handleNewFolderConfirm} disabled={!newFolderName.trim() || !!validateFolderName(newFolderName)}>{t('createFolder')}</button>
            </footer>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)} role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="settings-dialog-title">{t('settings')}</h2>
              <button className="modal-close-btn" onClick={() => setShowSettings(false)} aria-label={t('cancel')}><Icon name="x" size={20} /></button>
            </header>
            <div className="modal-body">
              <div className="settings-body">
                <div className="settings-section">
                  <h3 className="settings-section-title">{t('settingsAppearance')}</h3>
                  <div className="settings-row language-row">
                    <label htmlFor="language" className="language-label">
                      <span className="label-icon">🌐</span>
                      {t('settingsLanguage')}
                    </label>
                    <select id="language" className="modal-input language-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                      {(Object.keys(LANG_LABELS) as Lang[]).map((code) => (
                        <option key={code} value={code}>{LANG_LABELS[code]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-row">
                    <label htmlFor="theme">{t('settingsTheme')}</label>
                    <select id="theme" className="modal-input" value={theme} onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}>
                      <option value="system">{t('settingsSystem')}</option>
                      <option value="light">{t('settingsLight')}</option>
                      <option value="dark">{t('settingsDark')}</option>
                    </select>
                  </div>
                </div>
                <div className="settings-section">
                  <h3 className="settings-section-title">{t('settingsVault')}</h3>
                  <div className="settings-row">
                    <div className="setting-label">
                      <span className="setting-label-text">{t('currentVault')}</span>
                      <span className="setting-label-desc">{vaultPath || t('noVaultSelected')}</span>
                    </div>
                    <button className="btn secondary" onClick={() => { setShowSettings(false); setShowVaultDialog(true); }}>
                      {t('changeVault')}
                    </button>
                  </div>
                  {recentVaults.length > 0 && (
                    <div className="recent-vaults">
                      <h4>{t('recentVaults')}</h4>
                      <ul className="recent-vaults-list">
                        {recentVaults.map((vault) => (
                          <li key={vault} className="recent-vault-item">
                            <span className="vault-path">{vault}</span>
                            <div className="vault-actions">
                              <button className="vault-switch-btn" onClick={() => handleSwitchVault(vault)}>{t('settingsSwitch')}</button>
                              <button className="vault-remove-btn" onClick={() => handleRemoveRecentVault(vault)} title={t('settingsRemove')}>×</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="settings-section">
                  <h3 className="settings-section-title">{t('dailyNotesSection')}</h3>
                  <div className="settings-row">
                    <div className="setting-label">
                      <span className="setting-label-text">{t('dailyNotesFolder')}</span>
                      <span className="setting-label-desc">{t('dailyNotesFolderDesc')}</span>
                    </div>
                    <div className="setting-control" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '300px' }}>
                      <input type="text" value={dailyNotesFolder} onChange={(e) => handleSetDailyNotesFolder(e.target.value)}
                        placeholder="Daily/" className="modal-input" style={{ flex: 1, fontSize: '14px', fontFamily: 'var(--font-mono)' }} />
                      <button className="btn secondary" onClick={handleSelectDailyFolder} title={t('browse')} style={{ whiteSpace: 'nowrap' }}>
                        <Icon name="folder" /> {t('browse')}
                      </button>
                    </div>
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <span className="setting-label-text">{t('template')}</span>
                      <span className="setting-label-desc">{t('templateDesc')}</span>
                    </div>
                    <div className="setting-control">
                      <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        {'# {{date}}\n\n'}{t('dailyNoteTemplateHeading')}
                      </code>
                    </div>
                  </div>
                </div>
                <div className="settings-section">
                  <h3 className="settings-section-title">{t('settingsAppearance')}</h3>
                  <div className="setting-row">
                    <div className="setting-label">
                      <span className="setting-label-text">{t('transparentBg')}</span>
                      <span className="setting-label-desc">{t('transparentBgDesc')}</span>
                    </div>
                    <div className="setting-control">
                      <label className="toggle-switch">
                        <input type="checkbox" checked={transparentBg} onChange={() => setTransparentBg(!transparentBg)} />
                        <span className="toggle-slider"></span>
                      </label>
                      <span style={{ color: 'var(--fg-muted)', fontSize: '13px', marginRight: '12px' }}>{transparentBg ? t('on') : t('off')}</span>
                    </div>
                  </div>
                  {transparentBg && (
                    <div className="setting-row">
                      <div className="setting-label">
                        <span className="setting-label-text">{t('windowOpacity')}</span>
                        <span className="setting-label-desc">{t('windowOpacityDesc')}</span>
                      </div>
                      <div className="setting-control" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '300px' }}>
                        <input type="range" min="0.6" max="1" step="0.05" value={windowOpacity}
                          onChange={(e) => handleSetOpacity(parseFloat(e.target.value))}
                          style={{ flex: 1, accentColor: 'var(--accent)' }} />
                        <span style={{ color: 'var(--fg-muted)', fontSize: '13px', minWidth: '45px', textAlign: 'right' }}>
                          {Math.round(windowOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="settings-section">
                  <h3 className="settings-section-title">{t('settingsEditor')}</h3>
                  <div className="setting-row">
                    <div className="setting-label">
                      <span className="setting-label-text">{t('settingsWordWrap')}</span>
                      <span className="setting-label-desc">{wordWrap ? (lang === 'tr' ? 'Uzun satırlar alt satıra sarılır' : 'Long lines wrap to next line') : (lang === 'tr' ? 'Yatay kaydırma ile tek satır' : 'Horizontal scroll, no wrap')}</span>
                    </div>
                    <div className="setting-control">
                      <label className="toggle-switch">
                        <input type="checkbox" checked={wordWrap} onChange={() => setWordWrap(!wordWrap)} />
                        <span className="toggle-slider"></span>
                      </label>
                      <span style={{ color: 'var(--fg-muted)', fontSize: '13px', marginRight: '12px' }}>{wordWrap ? t('on') : t('off')}</span>
                    </div>
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <span className="setting-label-text">{t('settingsFontSize')}</span>
                      <span className="setting-label-desc">{lang === 'tr' ? 'Ctrl +/- veya Ctrl+tekerlek (10–24)' : 'Ctrl +/- or Ctrl+Wheel (10–24)'}</span>
                    </div>
                    <div className="setting-control" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '300px' }}>
                      <input type="range" min="10" max="24" step="1" value={editorFontSize} onChange={(e) => setEditorFontSize(parseInt(e.target.value,10))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                      <span style={{ color: 'var(--fg-muted)', fontSize: '13px', minWidth: '35px', textAlign: 'right' }}>{editorFontSize}px</span>
                    </div>
                  </div>
                </div>
                <div className="settings-section">
                  <div className="settings-section-header">
                    <h3 className="settings-section-title">{t('settingsShortcuts')}</h3>
                    <button className="reset-shortcuts-btn" onClick={resetShortcuts}>{t('settingsResetShortcuts')}</button>
                  </div>
                  <div className="shortcuts-list">
                    {Object.entries(shortcuts).map(([action, keybinding]) => (
                      <div key={action} className="shortcut-item"
                        onClick={() => { setEditingShortcut(action); setRecordedKeys([]); setIsRecording(true); }}>
                        <span className="shortcut-action">{t((SHORTCUT_LABEL_KEYS[action] ?? action) as never)}</span>
                        <div className="shortcut-keys">
                          {editingShortcut === action && isRecording ? (
                            <span className="shortcut-recording">{t('settingsPressKeys')}</span>
                          ) : (
                            keybinding.split('+').map((key, idx) => (
                              <kbd key={idx} className="shortcut-kbd">{key}</kbd>
                            ))
                          )}
                          <span className="shortcut-edit-icon">✎</span>
                        </div>
                      </div>
                    ))}
                    {editingShortcut && !isRecording && recordedKeys.length > 0 && (
                      <div className="shortcut-save-modal">
                        <div className="shortcut-save-content">
                          <p>{t('settingsNewShortcut')}: <strong>{recordedKeys.join('+')}</strong></p>
                          <div className="shortcut-save-actions">
                            <button className="shortcut-save-btn" onClick={() => saveShortcut(editingShortcut)}>{t('settingsSave')}</button>
                            <button className="shortcut-cancel-btn" onClick={() => { setEditingShortcut(null); setIsRecording(false); setRecordedKeys([]); }}>{t('settingsCancel')}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <footer className="modal-footer">
                <button
                  className="version-badge footer-version clickable"
                  onClick={() => setShowWhatsNew(true)}
                  title={t('whatsNew')}
                >
                  Quartzite v{appVersion}
                </button>
                <button className="btn primary" onClick={() => setShowSettings(false)}>{t('done')}</button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {showGraphModal && (
        <GraphModal
          isOpen={showGraphModal}
          onClose={handleGraphModalCancel}
          files={files}
          onNoteOpen={(name) => loadFile(name.endsWith('.md') ? name : `${name}.md`)}
          lang={lang}
        />
      )}

      {showWhatsNew && (
        <WhatsNewModal
          lang={lang}
          t={t}
          onClose={() => setShowWhatsNew(false)}
        />
      )}
    </div>
  );
}

export default App;