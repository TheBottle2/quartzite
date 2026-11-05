// Damıtılmış (curated) Iconify bundle üretir: `src/icons/bundle.json`
// yalnızca `src/components/Icon.tsx` içindeki ICON_MAP'te adı geçen ikonları taşır.
//
// Neden? `@iconify/react` varsayılan modda eksik ikonları RUNTIME'da
// api.iconify.design'dan (ağ) çeker. Yerel-first Tauri uygulaması offline
// çalışmalı → ikonlar paket-içi olmalı. Tam `@iconify-json/*` setleri gömmek
// pahalı (lucide 662KB, tabler 2.1MB raw); damıtılmış set ~40KB.
//
// Çıktı bir DİZİdir: her IconifyJSON tek prefix taşıyabilir (lucide + tabler).
// Kullanım: `node scripts/build-icons.mjs`
// `npm run build` öncesinde otomatik çalışır (prebuild). Yeniden üretim için
// node_modules/@iconify-json/* gerekir (devDependency).

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconSource = path.join(root, 'src/components/Icon.tsx');
const outPath = path.join(root, 'src/icons/bundle.json');

// 1) ICON_MAP'te adı geçen tüm `prefix:name` değerlerini topla.
const src = await readFile(iconSource, 'utf8');
const referenced = [...new Set(src.match(/\b(?:lucide|tabler):[a-z0-9-]+\b/g) ?? [])];
if (referenced.length === 0) {
  throw new Error('Icon.tsx içinde hiç `prefix:name` ikonu bulunamadı — regex güncel mi?');
}

// 2) Kaynak setleri yükle, yalnızca kullanılanları kopyala. Alias'a rastlarsa
//    parent ikonu da bunda tut (Iconify alias'ı parent gövdesinden çizer).
const prefixes = [...new Set(referenced.map((n) => n.split(':')[0]))];
const bundle = [];
let copied = 0;
const missing = [];

for (const prefix of prefixes) {
  const file = path.join(root, `node_modules/@iconify-json/${prefix}/icons.json`);
  const data = JSON.parse(await readFile(file, 'utf8'));
  const collection = { prefix: data.prefix, icons: {}, aliases: {} };
  if (data.width !== undefined) collection.width = data.width;
  if (data.height !== undefined) collection.height = data.height;

  for (const full of referenced) {
    if (!full.startsWith(`${prefix}:`)) continue;
    const name = full.slice(prefix.length + 1);
    const icon = data.icons[name];
    if (icon) {
      collection.icons[name] = icon;
      copied++;
      continue;
    }
    const alias = data.aliases?.[name];
    if (alias) {
      collection.aliases[name] = alias;
      copied++;
      const parent = data.icons[alias.parent];
      if (parent) collection.icons[alias.parent] = parent;
      else missing.push(`${prefix}:${alias.parent} (alias parent)`);
      continue;
    }
    missing.push(full);
  }
  bundle.push(collection);
}

if (missing.length > 0) {
  console.error(`Eksik ikonlar (kaynak setlerde yok): ${missing.join(', ')}`);
  process.exit(1);
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(bundle, null, 2) + '\n', 'utf8');

const bytes = (await stat(outPath)).size;
console.log(`✔ ${referenced.length} ikon disipline edildi → src/icons/bundle.json (${(bytes / 1024).toFixed(1)} KB; setler: ${prefixes.join(', ')})`);
