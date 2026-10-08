import type { Lang } from './i18n';

export interface ChangelogEntry {
  version: string;
  date: string;
  items: Record<Lang, string[]>;
}

// Tek kaynak: uygulama-içi "Yenilikler" penceresi buradan beslenir.
// Public CHANGELOG.md gerektiğinde bu listeden üretilir (çift kayıt yok).
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.4.4', date: '2026-10-09',
    items: {
      en: ['Right-click menu reworked: Open containing folder / Open this folder, Copy path, New note here, Rename, Delete.', 'Delete and open-location buttons now sit directly on every note and folder row (no right-click needed).', 'Opening a note’s location now opens its containing folder, not the file itself.'],
      tr: ['Sağ tık menüsü yeniden: Bulunduğu konumu aç / Bu klasörü aç, Yolunu kopyala, Buraya yeni not ekle, Yeniden adlandır, Sil.', 'Sil ve konum aç düğmeleri artık her not ve klasör satırında doğrudan (sağ tık gerekmiyor).', 'Notun konumu artık dosyayı değil, içinde bulunduğu klasörü açıyor.'],
      de: ['Rechtsklick-Menü überarbeitet: Enthaltenden Ordner öffnen, Pfad kopieren, Neue Notiz hier, Umbenennen, Löschen.', 'Löschen und Öffnen stehen jetzt direkt an jeder Notiz- und Ordnerzeile (kein Rechtsklick nötig).'],
      fr: ['Menu contextuel refait : Ouvrir le dossier contenant, Copier le chemin, Nouvelle note ici, Renommer, Supprimer.', 'Supprimer et Ouvrir sont désormais sur chaque ligne (clic droit inutile).'],
      es: ['Menú contextual rehecho: Abrir carpeta que lo contiene, Copiar ruta, Nueva nota aquí, Renombrar, Eliminar.', 'Eliminar y Abrir ya están en cada fila (no hace falta clic derecho).'],
    },
  },
  {
    version: '0.4.3', date: '2026-10-07',
    items: {
      en: ['Right-click any folder or note: copy its full path, show it in your file manager, or delete it.', 'Folders can now be deleted (with a note count in the confirmation); open tabs, favorites and recents are cleaned up.', 'New "show in file manager" works on Linux, macOS and Windows.'],
      tr: ['Herhangi bir klasöre veya nota sağ tıkla: tam yolunu kopyala, dosya yöneticisinde göster ya da sil.', 'Klasörler artık silinebiliyor (onayda içindeki not sayısı); açık sekmeler, favoriler ve sonlar temizleniyor.', 'Yeni "dosya yöneticisinde göster" Linux, macOS ve Windows’ta çalışıyor.'],
      de: ['Rechtsklick auf Ordner oder Notiz: Pfad kopieren, im Dateimanager anzeigen oder löschen.', 'Ordner lassen sich jetzt löschen (Bestätigung nennt die Anzahl Notizen); Tabs, Favoriten und Verlauf werden bereinigt.', '„Im Dateimanager anzeigen“ funktioniert unter Linux, macOS und Windows.'],
      fr: ['Clic droit sur un dossier ou une note : copier le chemin complet, l’afficher dans le gestionnaire de fichiers, ou supprimer.', 'Les dossiers peuvent être supprimés (confirmation avec le nombre de notes) ; onglets, favoris et récents sont nettoyés.', '« Afficher dans le gestionnaire de fichiers » fonctionne sous Linux, macOS et Windows.'],
      es: ['Clic derecho en una carpeta o nota: copiar la ruta completa, mostrarla en el gestor de archivos o eliminarla.', 'Ahora puedes eliminar carpetas (la confirmación indica cuántas notas hay); pestañas, favoritos y recientes se limpian.', '«Mostrar en el gestor de archivos» funciona en Linux, macOS y Windows.'],
    },
  },
  {
    version: '0.4.2', date: '2026-10-07',
    items: {
      en: ['Right pane tabs no longer overflow the panel: icon-only buttons with tooltips and counters, safe scrolling.'],
      tr: ['Sağ panel sekmeleri artık taşmıyor: ipuçlu ikon-only düğmeler, sayaçlar, güvenli kaydırma.'],
      de: ['Tabs der rechten Leiste laufen nicht mehr über: Icon-Only-Buttons mit Tooltips und Zählern.'],
      fr: ['Les onglets du panneau droit ne débordent plus : boutons icône seule avec infobulles et compteurs.'],
      es: ['Las pestañas del panel derecho ya no se desbordan: botones solo con icono, tooltip y contadores.'],
    },
  },
  {
    version: '0.4.1', date: '2026-10-06',
    items: {
      en: ['Icons and toolbar now adapt to window size: buttons shrink, low-priority icons hide as space runs out.', 'Transparent background now works with Light mode (panels were always dark).', 'Fixed unreadable code blocks in Light mode (dark background with dark text).'],
      tr: ['İkonlar ve araç çubuğu pencere boyutuna uyum sağlıyor: butonlar küçülür, alan daraldıkça düşük öncelikli ikonlar gizlenir.', 'Şeffaf arka plan artık Açık temayla da çalışıyor (paneller hep koyuydu).', 'Açık temada okunmayan kod blokları düzeltildi (koyu zemin + koyu metin).'],
      de: ['Symbole und Symbolleiste passen sich der Fenstergröße an; Knöpfe schrumpfen, weniger wichtige Symbole verschwinden.', 'Transparenter Hintergrund funktioniert jetzt mit hellem Design (Panels waren immer dunkel).', 'Unlesbare Codeblöcke im Hellen Design behoben.'],
      fr: ['Icônes et barre d’outils s’adaptent à la taille de la fenêtre ; les boutons rétrécissent, les icônes secondaires disparaissent.', 'Le fond transparent fonctionne désormais avec le thème Clair (les panneaux restaient sombres).', 'Blocs de code illisibles en thème Clair corrigés.'],
      es: ['Iconos y barra se adaptan al tamaño de ventana; los botones encogen y los iconos secundarios desaparecen.', 'El fondo transparente ya funciona con el tema Claro (los paneles seguían oscuros).', 'Corregidos los bloques de código ilegibles en tema Claro.'],
    },
  },
  {
    version: '0.4.0', date: '2026-10-06',
    items: {
      en: ['Note tabs: open several notes at once, Ctrl+Tab to cycle, Ctrl+W to close, unsaved dot on the tab.', 'Hover any [[link]] for an instant preview card of the target note (click creates it if missing).', 'Unlinked mentions tab: finds notes that name this one without linking it — the missing half of backlinks.', 'Fixed: switching notes within the 2s autosave window no longer discards your last edits.'],
      tr: ['Not sekmeleri: aynı anda birden fazla not aç, Ctrl+Tab ile gez, Ctrl+W ile kapat, sekmede kaydedilmemiş noktası.', 'Her [[bağlantı]]nın üzerine gelince hedef notun anında önizleme kartı (yoksa tıklayınca oluşur).', 'Bağlantısız anmalar sekmesi: bu notu bağlantı vermeden anan notları bulur — backlink’in eksik yarısı.', 'Düzeltme: 2sn otomatik kayıt penceresinde nota geçince son yazımlar artık silinmiyor.'],
      de: ['Notiz-Tabs: mehrere Notizen gleichzeitig öffnen, Strg+Tab wechselt, Strg+W schließt, ungespeicherter Punkt am Tab.', 'Jeder [[Link]] zeigt auf Hover eine Sofortvorschau der Zielnotiz (fehlt sie, legt Klick sie an).', 'Tab „Unverlinkte Erwähnungen“: findet Notizen, die diese ohne Link nennen — die fehlende Hälfte der Backlinks.', 'Fix: Notizwechsel im 2s-Autosave-Fenster verwirft die letzten Änderungen nicht mehr.'],
      fr: ['Onglets de notes : plusieurs notes ouvertes, Ctrl+Tab pour naviguer, Ctrl+W pour fermer, point non enregistré.', 'Survolez n’importe quel [[lien]] : aperçu instantané de la note cible (clique la crée si absente).', 'Onglet « Mentions non liées » : trouve les notes qui la nomment sans la lier — la moitié manquante des rétroliens.', 'Correction : changer de note dans la fenêtre d’autosave 2 s ne perd plus vos modifications.'],
      es: ['Pestañas de notas: varias notas a la vez, Ctrl+Tab para alternar, Ctrl+W para cerrar, punto sin guardar.', 'Pasa el ratón por cualquier [[enlace]] para ver una vista previa instantánea (clic la crea si falta).', 'Pestaña «Menciones sin enlace»: encuentra notas que la nombran sin enlazarla — la mitad que faltaba.', 'Arreglo: cambiar de nota dentro de los 2 s de autoguardado ya no descarta tus cambios.'],
    },
  },
  {
    version: '0.3.3', date: '2026-10-06',
    items: {
      en: ['Vault search (Ctrl+Shift+F): every match with line context, jump on Enter, replace per file or across the whole vault.'],
      tr: ['Vault araması (Ctrl+Shift+F): satır bağlamlı tüm eşleşmeler, Enter ile atlama, dosya bazında ya da tüm vaultta değiştirme.'],
      de: ['Vault-Suche (Strg+Umschalt+F): alle Treffer mit Zeilenkontext, Enter springt, Ersetzen pro Datei oder vaultweit.'],
      fr: ['Recherche Vault (Ctrl+Maj+F) : tous les résultats avec contexte, Entrée pour aller, remplacement par fichier ou global.'],
      es: ['Búsqueda en vault (Ctrl+Mayús+F): resultados con contexto, Enter para ir, reemplazo por archivo o global.'],
    },
  },
  {
    version: '0.3.2', date: '2026-10-06',
    items: {
      en: ['Theme selection: System (follows OS) + quick sun/moon toggle in the toolbar.', 'Name checks: new notes/folders warn inline about duplicates and invalid names before creating.'],
      tr: ['Tema seçimi: Sistem (OS’i takip eder) + araç çubuğunda hızlı güneş/ay düğmesi.', 'Ad kontrolü: yeni not/klasör çakışmayı ve geçersiz adı oluşturmadan önce satır içinde uyarır.'],
      de: ['Designauswahl: System (folgt dem OS) + Sonnen/Mond-Schnellschalter in der Symbolleiste.', 'Namensprüfung: neue Notizen/Ordner warnen inline vor Duplikaten und ungültigen Namen.'],
      fr: ['Choix du thème : Système (suit l’OS) + bouton soleil/lune rapide dans la barre d’outils.', 'Contrôle des noms : les notes/dossiers signalent doublons et noms invalides avant création.'],
      es: ['Selección de tema: Sistema (sigue el SO) + botón sol/luna rápido en la barra.', 'Control de nombres: notas/carpetas avisan de duplicados y nombres inválidos antes de crear.'],
    },
  },
  {
    version: '0.3.1', date: '2026-10-06',
    items: {
      en: ['Root drop zone ("Files (root)") now appears only while dragging a file.'],
      tr: ['Kök bırakma alanı ("Dosyalar (kök)") artık yalnızca dosya sürüklerken görünüyor.'],
      de: ['Root-Ablagebereich erscheint nur noch beim Ziehen einer Datei.'],
      fr: ['La zone de dépôt racine n’apparaît que pendant le glisser-déposer.'],
      es: ['La zona raíz solo aparece al arrastrar un archivo.'],
    },
  },
  {
    version: '0.3.0', date: '2026-10-06',
    items: {
      en: ['Command palette (Ctrl+K / Ctrl+P): fuzzy note switching, all commands, #tag search with recent + favorites ranking.', 'Right pane tabs: Backlinks / Outline (click to jump) / Tags (click to search vault).', 'Rich preview: clickable [[links]], #tags, ![[embeds]], callouts (> [!note]), clickable tasks, frontmatter table.', 'Favorites + recent notes in sidebar, star in editor, status bar (words/chars/lines/reading time).'],
      tr: ['Komut paleti (Ctrl+K / Ctrl+P): bulanık not geçişi, tüm komutlar, #etiket araması; son + favori öncelikli.', 'Sağ panel sekmeleri: Backlink / Ana hat (tıkla-git) / Etiketler (tıkla-vaultta ara).', 'Zengin önizleme: tıklanabilir [[bağlantı]], #etiket, ![[gömme]], callout (> [!note]), tıklanabilir task, frontmatter tablosu.', 'Kenar çubuğunda favoriler + son açılanlar, editörde yıldız, durum çubuğu (kelime/karakter/satır/okuma süresi).'],
      de: ['Befehlspalette (Strg+K / Strg+P): Fuzzy-Notizwechsel, alle Befehle, #Tag-Suche mit Verlauf + Favoriten.', 'Rechte Tabs: Backlinks / Gliederung (Klick springt) / Tags (Klick sucht im Vault).', 'Reiche Vorschau: klickbare [[Links]], #Tags, ![[Einbettungen]], Callouts, klickbare Tasks, Frontmatter-Tabelle.', 'Favoriten + Verlauf in der Sidebar, Stern im Editor, Statusleiste (Wörter/Zeichen/Zeilen/Lesezeit).'],
      fr: ['Palette de commandes (Ctrl+K / Ctrl+P) : notes floues, toutes commandes, recherche #tag avec récents + favoris.', 'Onglets droits : Rétroliens / Plan (clic pour aller) / Tags (clic pour chercher).', 'Aperçu riche : [[liens]] cliquables, #tags, ![[intégrations]], callouts, tâches cliquables, table frontmatter.', 'Favoris + récents dans la barre, étoile dans l’éditeur, barre d’état (mots/caractères/lignes/lecture).'],
      es: ['Paleta de comandos (Ctrl+K / Ctrl+P): notas difusas, todos los comandos, búsqueda #etiqueta con recientes + favoritos.', 'Pestañas derechas: Backlinks / Esquema (clic para ir) / Etiquetas (clic para buscar).', 'Vista rica: [[enlaces]] clicables, #etiquetas, ![[incrustados]], callouts, tareas clicables, tabla frontmatter.', 'Favoritos + recientes en la barra, estrella en el editor, barra de estado (palabras/caracteres/líneas/lectura).'],
    },
  },
  {
    version: '0.2.27', date: '2026-09-12',
    items: {
      en: ['Harmonized long-line handling: Word Wrap toggle + zoom (Ctrl +/- / Ctrl+Wheel, 10–24px), horizontal scroll when wrap is off.'],
      tr: ['Uzun tek satır için harman: Satır Kaydırma aç/kapat + yakınlaştırma (Ctrl +/- / Ctrl+Tekerlek, 10–24px), kapalıyken yatay kaydırma.'],
      de: ['Kombinierte Langzeilen-Lösung: Zeilenumbruch-Umschalter + Zoom (Strg +/- / Strg+Rad, 10–24px), horizontaler Scroll ohne Umbruch.'],
      fr: ['Gestion harmonisée des longues lignes : retour à la ligne activable + zoom (Ctrl +/- / Ctrl+Molette, 10–24px), défilement horizontal si désactivé.'],
      es: ['Líneas largas armonizadas: ajuste de línea activable + zoom (Ctrl +/- / Ctrl+Rueda, 10–24px), desplazamiento horizontal sin ajuste.'],
    },
  },
  {
    version: '0.2.26', date: '2026-09-12',
    items: {
      en: ['Search now centers the match in the editor, even in long wrapped documents.', 'Create folders from the sidebar; new notes can include subfolders via "/".'],
      tr: ['Arama artık eşleşmeyi — uzun ve sarılmış belgelerde bile — ekranın ortasına getiriyor.', 'Kenar çubuğundan klasör oluşturma; yeni not adında "/" ile alt klasör oluşturma.'],
      de: ['Die Suche zentriert den Treffer jetzt — auch in langen, umgebrochenen Dokumenten.', 'Ordner über die Seitenleiste erstellen; neuer Notizname mit "/" für Unterordner.'],
      fr: ['La recherche centre désormais le résultat — même dans les longs documents enroulés.', 'Créer des dossiers depuis la barre latérale ; "/" dans le nom pour un sous-dossier.'],
      es: ['La búsqueda centra ahora el resultado — incluso en documentos largos con ajuste.', 'Crear carpetas desde la barra lateral; "/" en el nombre para subcarpeta.'],
    },
  },
  {
    version: '0.2.25', date: '2026-09-12',
    items: {
      en: ['Turkish "İ" search now matches correctly; stale highlights cleared when the query changes.'],
      tr: ['Türkçe "İ" araması artık doğru eşleşiyor; sorgu değişince eski vurgular temizleniyor.'],
      de: ['Suche mit türkischem "İ" funktioniert korrekt; alte Hervorhebungen werden gelöscht.'],
      fr: ['La recherche avec "İ" turc fonctionne ; les anciens surlignages sont effacés.'],
      es: ['La búsqueda con "İ" turca ya coincide; los resaltados antiguos se limpian.'],
    },
  },
  {
    version: '0.2.24', date: '2026-09-12',
    items: {
      en: ['Search hits no longer point to wrong regions (live content + exact mirror metrics).'],
      tr: ['Arama isabetleri artık yanlış bölgeleri göstermiyor (canlı içerik + birebir hizalama).'],
      de: ['Suchtreffer zeigen keine falschen Bereiche mehr (live Inhalt + exakte Metriken).'],
      fr: ['Les résultats ne pointent plus vers des zones erronées (contenu live + métriques exactes).'],
      es: ['Los resultados ya no señalan zonas erróneas (contenido vivo + métricas exactas).'],
    },
  },
  {
    version: '0.2.23', date: '2026-09-12',
    items: {
      en: ['Search result opens the file and scrolls the list to its folder.'],
      tr: ['Arama sonucu dosyayı açar ve listeyi klasörüne kaydırır.'],
      de: ['Suchergebnis öffnet die Datei und scrollt die Liste zum Ordner.'],
      fr: ['Le résultat ouvre le fichier et fait défiler la liste vers son dossier.'],
      es: ['El resultado abre el archivo y desplaza la lista a su carpeta.'],
    },
  },
  {
    version: '0.2.22', date: '2026-09-12',
    items: {
      en: ['Click a search hit to jump to it; rename files inline (Enter/Esc).'],
      tr: ['Arama isabetine tıklayınca atlar; dosyaları satır içinde yeniden adlandır (Enter/Esc).'],
      de: ['Klick auf einen Treffer springt hin; Dateien inline umbenennen (Enter/Esc).'],
      fr: ['Cliquez sur un résultat pour y aller ; renommage inline (Entrée/Échap).'],
      es: ['Clic en un resultado para saltar a él; renombrar archivos en línea (Enter/Esc).'],
    },
  },
  {
    version: '0.2.21', date: '2026-09-12',
    items: {
      en: ['Folder tree in sidebar (expandable, remembered) + vault-wide search of names and contents.'],
      tr: ['Kenar çubuğunda klasör ağacı (açılır, hatırlanır) + vault geneli ad ve içerik araması.'],
      de: ['Ordnerbaum in der Sidebar (ausklappbar, gemerkt) + Vault-weite Suche.'],
      fr: ['Arborescence de dossiers dans la barre latérale + recherche dans tout le vault.'],
      es: ['Árbol de carpetas en la barra lateral + búsqueda en todo el vault.'],
    },
  },
  {
    version: '0.2.20', date: '2026-09-12',
    items: {
      en: ['Renamed to Quartzite.'],
      tr: ['Quartzite olarak yeniden adlandırıldı.'],
      de: ['In Quartzite umbenannt.'],
      fr: ['Renommé en Quartzite.'],
      es: ['Renombrado a Quartzite.'],
    },
  },
  {
    version: '0.2.18', date: '2026-09-09',
    items: {
      en: ['Search highlight no longer drifts on scrolled documents.'],
      tr: ['Arama vurgusu kaydırılmış belgelerde artık kaymıyor.'],
      de: ['Such-Hervorhebung verrutscht nicht mehr in gescrollten Dokumenten.'],
      fr: ['La surbrillance de recherche ne dérive plus dans les documents défilés.'],
      es: ['El resaltado de búsqueda ya no se desplaza en documentos con scroll.'],
    },
  },
  {
    version: '0.2.17', date: '2026-09-09',
    items: {
      en: ['Revamped find & replace: styled panel, all-match highlighting, cursor no longer jumps while typing.'],
      tr: ['Bul/değiştir yenilendi: şık panel, tüm eşleşmeler vurgulu, yazarken imleç zıplamıyor.'],
      de: ['Suchen & Ersetzen überarbeitet: gestaltetes Panel, alle Treffer markiert, Cursor springt nicht mehr.'],
      fr: ['Recherche/remplacement repensés : panneau stylé, tous les résultats surlignés, curseur stable.'],
      es: ['Buscar/reemplazar renovado: panel con estilo, todas las coincidencias resaltadas, cursor estable.'],
    },
  },
  {
    version: '0.2.16', date: '2026-09-09',
    items: {
      en: ['Fixed Ctrl+Shift+Z (redo) never firing.'],
      tr: ['Hiç çalışmayan Ctrl+Shift+Z (ileri al) düzeltildi.'],
      de: ['Strg+Umschalt+Z (Wiederherstellen) funktioniert wieder.'],
      fr: ['Ctrl+Maj+Z (rétablir) fonctionne à nouveau.'],
      es: ['Ctrl+Mayús+Z (rehacer) funciona de nuevo.'],
    },
  },
  {
    version: '0.2.15', date: '2026-09-09',
    items: {
      en: ['Graph view overhaul: links render again, click to select, double-click to open, proper SVG/PNG export.'],
      tr: ['Grafik görünümü elden geçti: bağlantılar görünüyor, tıkla-seç, çift tıkla-aç, düzgün SVG/PNG dışa aktarma.'],
      de: ['Graphansicht überholt: Verbindungen sichtbar, Klick zum Auswählen, Doppelklick zum Öffnen, SVG/PNG-Export.'],
      fr: ['Vue graphe révisée : liens visibles, clic pour sélectionner, double-clic pour ouvrir, export SVG/PNG.'],
      es: ['Vista de grafo renovada: enlaces visibles, clic para seleccionar, doble clic para abrir, exportar SVG/PNG.'],
    },
  },
  {
    version: '0.2.14', date: '2026-09-09',
    items: {
      en: ['Fixed broken settings (gear) icon and stretched version badge in Settings footer.'],
      tr: ['Bozuk ayarlar (çark) ikonu ve Ayarlar altındaki uzamış sürüm çerçevesi düzeltildi.'],
      de: ['Defektes Einstellungs-Symbol und gedehntes Versions-Badge korrigiert.'],
      fr: ['Icône paramètres cassée et badge de version étiré corrigés.'],
      es: ['Icono de ajustes roto e insignia de versión estirada corregidos.'],
    },
  },
  {
    version: '0.2.13', date: '2026-09-09',
    items: {
      en: ['Toolbar no longer squeezes the settings button on narrow windows.'],
      tr: ['Dar pencerelerde araç çubuğu ayarlar butonunu artık ezmiyor.'],
      de: ['Symbolleiste quetscht die Einstellungsschaltfläche nicht mehr.'],
      fr: ['La barre d’outils n’écrase plus le bouton paramètres.'],
      es: ['La barra ya no aplasta el botón de ajustes en ventanas estrechas.'],
    },
  },
  {
    version: '0.2.12', date: '2026-09-05',
    items: {
      en: ['Version badge in toolbar and Settings; fully offline (no CDN); editor toolbar styles.'],
      tr: ['Araç çubuğu ve Ayarlar’da sürüm rozeti; tam çevrimdışı; editör araç çubuğu stilleri.'],
      de: ['Versions-Badge in Symbolleiste und Einstellungen; komplett offline; Editor-Stile.'],
      fr: ['Badge de version dans la barre d’outils et les paramètres ; 100 % hors ligne.'],
      es: ['Insignia de versión en la barra y ajustes; totalmente sin conexión.'],
    },
  },
  {
    version: '0.2.11', date: '2026-09-03',
    items: {
      en: ['Undo/redo system, find & replace, formatting toolbar, Lucide icons.'],
      tr: ['Geri/ileri al, bul/değiştir, biçimlendirme araç çubuğu, Lucide ikonları.'],
      de: ['Rückgängig/Wiederherstellen, Suchen & Ersetzen, Formatierungsleiste, Lucide-Icons.'],
      fr: ['Annuler/rétablir, rechercher/remplacer, barre de mise en forme, icônes Lucide.'],
      es: ['Deshacer/rehacer, buscar/reemplazar, barra de formato, iconos Lucide.'],
    },
  },
  {
    version: '0.2.10', date: '2026-09-03',
    items: {
      en: ['Stylesheet rewrite, dark-mode dropdown fixes, graph stability and performance.'],
      tr: ['Stil dosyası baştan yazıldı, koyu mod menü düzeltmeleri, grafik kararlılığı ve hızı.'],
      de: ['Stylesheet neu geschrieben, Dark-Mode-Fixes, Graph-Stabilität und -Tempo.'],
      fr: ['Feuille de style réécrite, correctifs mode sombre, stabilité du graphe.'],
      es: ['Hoja de estilos reescrita, correcciones de modo oscuro, estabilidad del grafo.'],
    },
  },
  {
    version: '0.2.9', date: '2026-09-02',
    items: {
      en: ['Calendar toggle (Ctrl+Shift+C), sidebar search focus (Ctrl+F), Settings readability.'],
      tr: ['Takvim aç/kapat (Ctrl+Shift+C), kenar çubuğu arama odağı (Ctrl+F), Ayarlar okunabilirliği.'],
      de: ['Kalender-Umschalter, Sidebar-Suchfokus, bessere Lesbarkeit der Einstellungen.'],
      fr: ['Bascule du calendrier, focus de recherche, lisibilité des paramètres.'],
      es: ['Alternar calendario, foco de búsqueda, legibilidad de ajustes.'],
    },
  },
  {
    version: '0.2.8', date: '2026-09-02',
    items: {
      en: ['Interface in 5 languages (TR/EN/DE/FR/ES) with auto-detection.'],
      tr: ['Arayüz 5 dilde (TR/EN/DE/FR/ES), otomatik algılamalı.'],
      de: ['Oberfläche in 5 Sprachen mit Auto-Erkennung.'],
      fr: ['Interface en 5 langues avec détection auto.'],
      es: ['Interfaz en 5 idiomas con detección automática.'],
    },
  },
  {
    version: '0.2.7', date: '2026-08-31',
    items: {
      en: ['Daily notes & calendar, vault path memory, configurable folders.'],
      tr: ['Günlük notlar ve takvim, vault yolu hafızası, ayarlanabilir klasörler.'],
      de: ['Tagesnotizen & Kalender, Vault-Pfad wird gemerkt, konfigurierbare Ordner.'],
      fr: ['Notes quotidiennes et calendrier, chemin du vault mémorisé.'],
      es: ['Notas diarias y calendario, ruta del vault recordada.'],
    },
  },
  {
    version: '0.2.0–0.2.6', date: '2026-08',
    items: {
      en: ['Graph view, KaTeX math, transparency & opacity, themes, logo, backlinks, custom vault dialog.'],
      tr: ['Grafik görünümü, KaTeX matematik, şeffaflık, temalar, logo, backlinkler, özel vault penceresi.'],
      de: ['Graphansicht, KaTeX-Mathematik, Transparenz, Designs, Logo, Backlinks.'],
      fr: ['Vue graphe, maths KaTeX, transparence, thèmes, logo, backlinks.'],
      es: ['Vista de grafo, matemáticas KaTeX, transparencia, temas, logo, backlinks.'],
    },
  },
];
