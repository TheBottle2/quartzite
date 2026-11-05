import { Icon as IconifyIcon, addCollection, type IconifyJSON } from '@iconify/react/dist/offline';
import bundle from '../icons/bundle.json';

/**
 * Icon name mappings from our internal names to Lucide icon names.
 * This allows us to keep a stable API while using Lucide icons underneath.
 */
export const ICON_MAP: Record<string, string> = {
  // Navigation & UI
  'menu': 'lucide:menu',
  'plus': 'lucide:plus',
  'refresh': 'lucide:refresh-cw',
  'pen': 'lucide:pen',
  'graph': 'lucide:git-graph',
  'settings': 'lucide:settings',
  'folder': 'lucide:folder',
  'eye': 'lucide:eye',
  'eye-off': 'lucide:eye-off',
  'trash': 'lucide:trash',
  'x': 'lucide:x',
  'search': 'lucide:search',
  'chevron-up': 'lucide:chevron-up',
  'chevron-down': 'lucide:chevron-down',
  'chevron-left': 'lucide:chevron-left',
  'chevron-right': 'lucide:chevron-right',
  'more-horizontal': 'tabler:dots', // Not in Lucide, use Tabler equivalent
  'download': 'lucide:download',
  'camera': 'lucide:camera',
  'map': 'lucide:map',
  'copy': 'lucide:copy',
  'external-link': 'lucide:external-link',
  'command': 'lucide:command',
  'calendar': 'lucide:calendar',
  'hash': 'lucide:hash',
  'list-tree': 'lucide:git-branch',
  'file': 'lucide:file',
  'sun': 'lucide:sun',
  'moon': 'lucide:moon',
  'tag': 'lucide:tag',
  'star': 'lucide:star',
  'home': 'lucide:home',
  'arrow-left': 'lucide:arrow-left',
  'arrow-right': 'lucide:arrow-right',
  'arrow-up': 'lucide:arrow-up',
  'arrow-down': 'lucide:arrow-down',
  'check': 'lucide:check',
  'check-circle': 'lucide:check-circle',
  'alert-circle': 'lucide:alert-circle',
  'alert-triangle': 'lucide:alert-triangle',
  'info': 'lucide:info',
  'help-circle': 'lucide:help-circle',
  'loader': 'lucide:loader',
  'rotate-cw': 'lucide:rotate-cw',
  'rotate-ccw': 'lucide:rotate-ccw',
  'maximize': 'lucide:maximize',
  'minimize': 'lucide:minimize',
  'sidebar': 'lucide:panel-left', // güncel Lucide'da layout-sidebar yok → panel-left
  'panel-left': 'lucide:panel-left',
  'panel-right': 'lucide:panel-right',
  'grid': 'lucide:grid',
  'layers': 'lucide:layers',
  'link': 'lucide:link',
  'unlink': 'lucide:unlink',
  'share': 'lucide:share-2',
  'heart': 'lucide:heart',
  'bookmark': 'lucide:bookmark',
  'flag': 'lucide:flag',
  'bell': 'lucide:bell',
  'bell-off': 'lucide:bell-off',
  'user': 'lucide:user',
  'users': 'lucide:users',
  'lock': 'lucide:lock',
  'unlock': 'lucide:unlock',
  'key': 'lucide:key',
  'shield': 'lucide:shield',
  'activity': 'lucide:activity',
  'zap': 'lucide:zap',
  'cpu': 'lucide:cpu',
  'database': 'lucide:database',
  'server': 'lucide:server',
  'cloud': 'lucide:cloud',
  'wifi': 'lucide:wifi',
  'wifi-off': 'lucide:wifi-off',
  'bluetooth': 'lucide:bluetooth',
  'usb': 'lucide:usb',
  'monitor': 'lucide:monitor',
  'smartphone': 'lucide:smartphone',
  'tablet': 'lucide:tablet',
  'laptop': 'lucide:laptop',
  'printer': 'lucide:printer',
  'camera-off': 'lucide:camera-off',
  'mic': 'lucide:mic',
  'mic-off': 'lucide:mic-off',
  'volume': 'lucide:volume-2',
  'volume-off': 'lucide:volume-x',
  'headphones': 'lucide:headphones',
  'music': 'lucide:music',
  'film': 'lucide:film',
  'image': 'lucide:image',
  'video': 'lucide:video',
  'video-off': 'lucide:video-off',
  'play': 'lucide:play',
  'pause': 'lucide:pause',
  'stop': 'lucide:circle-stop', // güncel Lucide'da stop yok → circle-stop
  'skip-forward': 'lucide:skip-forward',
  'skip-back': 'lucide:skip-back',
  'fast-forward': 'lucide:fast-forward',
  'rewind': 'lucide:rewind',
  'repeat': 'lucide:repeat',
  'shuffle': 'lucide:shuffle',
  'list': 'lucide:list',
  'list-ordered': 'lucide:list-ordered',
  'list-todo': 'lucide:list-todo',
  'layout-list': 'lucide:layout-list',
  'layout-grid': 'lucide:layout-grid',
  'align-left': 'lucide:align-left',
  'align-center': 'lucide:align-center',
  'align-right': 'lucide:align-right',
  'align-justify': 'lucide:align-justify',
  'bold': 'lucide:bold',
  'italic': 'lucide:italic',
  'underline': 'lucide:underline',
  'strikethrough': 'lucide:strikethrough',
  'code': 'lucide:code',
  'code-2': 'lucide:code-2',
  'terminal': 'lucide:terminal',
  'quote': 'lucide:quote',
  'heading-1': 'lucide:heading-1',
  'heading-2': 'lucide:heading-2',
  'heading-3': 'lucide:heading-3',
  'paragraph': 'lucide:letter-text', // güncel Lucide'da paragraph yok → letter-text
  'type': 'lucide:type',
  'text': 'lucide:file-text',
  'undo': 'lucide:undo',
  'redo': 'lucide:redo',
  'replace': 'lucide:replace',
  'find': 'lucide:search',
  'filter': 'lucide:filter',
  'sort-asc': 'lucide:sort-asc',
  'sort-desc': 'lucide:sort-desc',
  'move': 'lucide:move',
  'grip': 'lucide:grip',
  'grip-vertical': 'lucide:grip-vertical',
  'grip-horizontal': 'lucide:grip-horizontal',
  'expand': 'lucide:expand',
  'shrink': 'lucide:shrink',
  'corner-up-left': 'lucide:corner-up-left',
  'corner-up-right': 'lucide:corner-up-right',
  'corner-down-left': 'lucide:corner-down-left',
  'corner-down-right': 'lucide:corner-down-right',
  'scan': 'lucide:scan',
  'scan-line': 'lucide:scan-line',
  'barcode': 'lucide:barcode',
  'qrcode': 'lucide:qr-code', // güncel Lucide'da qrcode yok → qr-code
  'credit-card': 'lucide:credit-card',
  'gift': 'lucide:gift',
  'package': 'lucide:package',
  'box': 'lucide:box',
  'archive': 'lucide:archive',
  'inbox': 'lucide:inbox',
  'mail': 'lucide:mail',
  'send': 'lucide:send',
  'message-square': 'lucide:message-square',
  'message-circle': 'lucide:message-circle',
  'chat': 'lucide:message-circle', // güncel Lucide'da chat yok → message-circle
  'comment': 'lucide:message-square-text',
  'discussion': 'lucide:message-square-more',
  'notification': 'lucide:bell-ring',
  'rss': 'lucide:rss',
  'atom': 'lucide:atom',
  'globe': 'lucide:globe',
  'map-pin': 'lucide:map-pin',
  'navigation': 'lucide:navigation',
  'compass': 'lucide:compass',
  'anchor': 'lucide:anchor',
  'target': 'lucide:target',
  'crosshair': 'lucide:crosshair',
  'zoom-in': 'lucide:zoom-in',
  'zoom-out': 'lucide:zoom-out',
  'maximize-2': 'lucide:maximize-2',
  'minimize-2': 'lucide:minimize-2',
  'fullscreen': 'lucide:fullscreen',
  'fullscreen-exit': 'lucide:minimize-2',
};

/**
 * Type for all available icon names (our internal names).
 * This provides autocomplete in IDEs.
 */
export type IconName = keyof typeof ICON_MAP;

/**
 * Props for the Icon component.
 */
export interface IconProps {
  /** The icon name (from ICON_MAP keys) */
  name: IconName;
  /** Size in pixels (default: 14) */
  size?: number;
  /** Color (default: currentColor) */
  color?: string;
  /** Additional className */
  className?: string;
  /** Inline style */
  style?: React.CSSProperties;
  /** aria-label for accessibility */
  'aria-label'?: string;
  /** aria-hidden (default: true for decorative icons) */
  'aria-hidden'?: boolean;
}

/**
 * Icon component using @iconify/react with Lucide as primary set.
 * 
 * Usage:
 *   <Icon name="menu" size={20} />
 *   <Icon name="settings" color="red" />
 *   <Icon name="star" className="my-icon" />
 */
// ---- Offline ikonlar ----
// Tüm ikonlar build-time'da src/icons/bundle.json'a damıtılır ve bileşenler
// daha önce kaydedilir. @iconify/react'in OFFLINE girişini kullanıyoruz →
// runtime'da api.iconify.design'a hiç bağlanılmaz (yerel-first, ağdan bağımsız).
// DİKKAT: bundle bir DİZİDİR; her IconifyJSON yalnızca tek prefix taşır
// (lucide + tabler) → her öge ayrı kaydedilir. Tek addCollection'e "as cast"
// ile geçmek sizi sessizce bozuk kayda sürükler ve HİÇBİR ikon görünmez.
let registeredCollections = 0;
for (const collection of bundle as unknown as IconifyJSON[]) {
  try {
    addCollection(collection);
    registeredCollections++;
  } catch (err) {
    console.error(`[Icon] IconifyJSON kaydı başarısız (${(collection as { prefix?: string }).prefix}):`, err);
  }
}
// Sessiz boş kayıt: bu durumda offline ikon HİÇBİR yerde görünmez. Bir kez
// ve yalnızca geliştirme modunda görünür sinyal ver.
if (registeredCollections === 0 && import.meta.env.DEV) {
  console.warn('[Icon] Hiçbir icon seti kaydedilemedi — ikonlar boş görünür!');
}

export function Icon({
  name,
  size = 14,
  color = 'currentColor',
  className,
  style,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
  ...props
}: IconProps) {
  const iconName = ICON_MAP[name];
  
  if (!iconName) {
    console.warn(`Icon "${name}" not found in ICON_MAP`);
    return null;
  }

  return (
    <IconifyIcon
      icon={iconName}
      width={size}
      height={size}
      style={{ 
        color, 
        flexShrink: 0, 
        display: 'inline-block',
        ...style 
      }}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      {...props}
    />
  );
}

export default Icon;