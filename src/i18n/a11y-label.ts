/**
 * Names for screen readers. The game shows no words, so these are the only names its controls
 * have. Each one is written in English in the code (the tests find controls by these names) and
 * read out in Japanese when the browser's language is Japanese.
 */
export type A11yLocale = 'ja' | 'en';

const JAPANESE_LABELS: Record<string, string> = {
  Back: 'もどる',
  retry: 'やりなおす',
  Retry: 'やりなおす',
  'next stage': 'つぎへ',
  'skip the replay': 'とばす',
  undo: 'ひとつもどす',
  'puzzles in order': 'じゅんばんにとく',
  'one-minute game': '1ぷんチャレンジ',
  'play again': 'もういちど',
  'share the result': 'けっかをシェアする',
  'share this puzzle': 'このパズルをおくる',
  'share that it is solved': 'とけたよをおくる',
  'make a puzzle': 'パズルをつくる',
  'work it out': 'けいさんしてみる',
  'work it out again': 'もういちどけいさんする',
  'change the bubbles': 'あわをかえる',
  'play this puzzle': 'このパズルをとく',
  'one bubble more': 'あわをふやす',
  'one bubble less': 'あわをへらす',
  'the puzzle you made': 'つくったパズル',
  'make one by chance': 'おまかせでつくる',
  'close': 'とじる',
  'the picture that is sent': 'おくるがぞう',
  'post the link': 'リンクをとうこうする',
  'copy the link': 'リンクをコピーする',
  'save the picture': 'がぞうをほぞんする',
  'send with another app': 'ほかのアプリでおくる',
  'Next stage': 'つぎへ',
  'maru logo': 'まるまる電卓',
  'maru maru calc logo': 'まるまる電卓 トップページ',
  'maru maru calc gameplay preview': 'あそんでいるようす',
  'maru maru calc playable web app': 'まるまる電卓',
  'decorative bubble': 'かざりのあわ',
  'marumaru mode': 'まるまるモード',
  'dentaku mode': 'でんたくモード',
  'long form mode': 'ひっさんモード',
  'turn sound on': 'おとをだす',
  'turn sound off': 'おとをけす',
  'turn on mermaid song': 'にんぎょのうたをながす',
  'turn off mermaid song': 'にんぎょのうたをとめる',
  'clear equation': 'せいかいのしき',
  'failed equation': 'しっぱいのしき',
  'clear starfish': 'クリアのヒトデ',
  'broken medal': 'われたメダル',
  'turn the phone upright': 'スマホをたてにしてください',
  // Worlds
  '+': 'たしざん',
  '-': 'ひきざん',
  '×': 'かけざん',
  '÷': 'わりざん',
  '9×9': 'くく',
  '+−×÷': 'まぜこぜ',
  // Operator buttons and the answer pad
  plus: 'たす',
  minus: 'ひく',
  times: 'かける',
  'divided by': 'わる',
  delete: 'けす',
  answer: 'こたえる',
};

const JAPANESE_SEA_CREATURES: Record<string, string> = {
  fish: 'さかな',
  clownfish: 'クマノミ',
  blueTang: 'ナンヨウハギ',
  puffer: 'フグ',
  seahorse: 'タツノオトシゴ',
  squid: 'イカ',
  ray: 'エイ',
  turtle: 'ウミガメ',
  tuna: 'マグロ',
  shark: 'サメ',
  whale: 'クジラ',
  flatfish: 'ヒラメ',
  jelly: 'クラゲ',
  angler: 'チョウチンアンコウ',
};

const JAPANESE_BEAD_ROLES: Record<string, string> = {
  normal: 'まる',
  multiplicand: 'かけざんのもと',
  product: 'かけざんのこたえ',
  division: 'わりざんのたま',
};

// Names that carry a number or a kind. None of the Japanese forms is contained in another,
// so a control can still be found by part of its name.
const JAPANESE_PATTERNS: Array<[RegExp, (...groups: string[]) => string]> = [
  [/^puzzle (\d+)$/, (number) => `${number}ばん`],
  [/^puzzle (\d+), solved$/, (number) => `${number}ばん とけた`],
  [/^bubble-(-?\d+)$/, (count) => `あわ ${count}`],
  [/^multiply-(-?\d+)$/, (count) => `×${count}のあわ`],
  [/^divide-(-?\d+)$/, (count) => `÷${count}のあわ`],
  [/^bead-([a-z]+)-(-?\d+)$/, (role, count) => `${JAPANESE_BEAD_ROLES[role] ?? 'まる'} ${count}`],
  [/^sea creature ([A-Za-z]+)$/, (kind) => JAPANESE_SEA_CREATURES[kind] ?? 'うみのいきもの'],
  [/^stage (\d+): make (-?\d+)$/, (stageNumber, target) => `ステージ${stageNumber} ${target}にしよう`],
  [/^(\d+) × \? shuffled$/, (dan) => `${dan} × ? ばらばら`],
];

let hostLocale: A11yLocale | undefined;

/** For a host that tells the game the player's language itself (YouTube does): use that, not the browser's. */
export function setA11yLocale(locale: A11yLocale) {
  hostLocale = locale;
}

export function getA11yLocale(): A11yLocale {
  if (hostLocale) {
    return hostLocale;
  }
  // Native builds have no browser language; the app itself is Japanese.
  const language = typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : 'ja';
  return language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

/** Returns the name to read out for `label`: Japanese when it is known and the locale is Japanese, otherwise `label` itself. */
export function a11yLabel(label: string, locale: A11yLocale = getA11yLocale()): string {
  if (locale !== 'ja') {
    return label;
  }

  const exact = JAPANESE_LABELS[label];
  if (exact) {
    return exact;
  }

  for (const [pattern, format] of JAPANESE_PATTERNS) {
    const match = pattern.exec(label);
    if (match) {
      return format(...match.slice(1));
    }
  }

  return label;
}
