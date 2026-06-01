import { TextMode } from '@/store/settingsStore';

type CopyKey =
  | 'title'
  | 'continueFromStage'
  | 'continueMarker'
  | 'recommendedMarker'
  | 'clearedMarker'
  | 'stageSelect'
  | 'mvpStages'
  | 'practiceStages'
  | 'allMvpCleared'
  | 'stageMissing'
  | 'retryStageSelect'
  | 'back'
  | 'target'
  | 'carryCompleted'
  | 'expressionHistory'
  | 'play'
  | 'continue'
  | 'replay'
  | 'reset'
  | 'undo'
  | 'hint'
  | 'done'
  | 'moveCount'
  | 'resetCount'
  | 'noResetClear'
  | 'fewestMovesBadge'
  | 'noResetBadge'
  | 'next'
  | 'nextPractice'
  | 'retry'
  | 'stageSelectTo'
  | 'tenReady'
  | 'marblesCount'
  | 'moreToTen'
  | 'carryPreview'
  | 'releaseToPair'
  | 'settings'
  | 'sound'
  | 'effects'
  | 'accessibleMode'
  | 'textDisplay'
  | 'normalText'
  | 'hiraganaText'
  | 'resetProgress';

const copy: Record<CopyKey, Record<TextMode, string>> = {
  title: {
    normal: 'まるまる電卓',
    hiragana: 'まるまるでんたく',
  },
  continueFromStage: {
    normal: 'から続き',
    hiragana: 'からつづき',
  },
  continueMarker: {
    normal: 'つづき',
    hiragana: 'つづき',
  },
  recommendedMarker: {
    normal: 'おすすめ',
    hiragana: 'おすすめ',
  },
  clearedMarker: {
    normal: 'クリア',
    hiragana: 'くりあ',
  },
  stageSelect: {
    normal: 'ステージ選択',
    hiragana: 'すてーじせんたく',
  },
  mvpStages: {
    normal: '足し算の島',
    hiragana: 'たしざんのしま',
  },
  practiceStages: {
    normal: 'れんしゅう',
    hiragana: 'れんしゅう',
  },
  allMvpCleared: {
    normal: '足し算の島クリア',
    hiragana: 'たしざんのしま くりあ',
  },
  stageMissing: {
    normal: 'ステージがありません',
    hiragana: 'すてーじがありません',
  },
  retryStageSelect: {
    normal: 'ステージを選び直してください。',
    hiragana: 'すてーじをえらびなおしてください。',
  },
  back: {
    normal: '戻る',
    hiragana: 'もどる',
  },
  target: {
    normal: '目標',
    hiragana: 'もくひょう',
  },
  carryCompleted: {
    normal: '10個がまとまって、上の位になりました。',
    hiragana: '10こがまとまって、うえのくらいになりました。',
  },
  expressionHistory: {
    normal: 'できた式',
    hiragana: 'できたしき',
  },
  play: {
    normal: 'プレイ',
    hiragana: 'ぷれい',
  },
  continue: {
    normal: 'つづきから',
    hiragana: 'つづきから',
  },
  replay: {
    normal: 'もう一度',
    hiragana: 'もういちど',
  },
  reset: {
    normal: 'リセット',
    hiragana: 'りせっと',
  },
  undo: {
    normal: 'ひとつ戻す',
    hiragana: 'ひとつもどす',
  },
  hint: {
    normal: 'ヒント',
    hiragana: 'ひんと',
  },
  done: {
    normal: 'できた！',
    hiragana: 'できた！',
  },
  moveCount: {
    normal: '手数',
    hiragana: 'てかず',
  },
  resetCount: {
    normal: 'リセット',
    hiragana: 'りせっと',
  },
  noResetClear: {
    normal: 'リセットなし',
    hiragana: 'りせっとなし',
  },
  fewestMovesBadge: {
    normal: 'ぴったり手数',
    hiragana: 'ぴったりてかず',
  },
  noResetBadge: {
    normal: 'リセットなし',
    hiragana: 'りせっとなし',
  },
  next: {
    normal: '次へ',
    hiragana: 'つぎへ',
  },
  nextPractice: {
    normal: 'れんしゅうへ',
    hiragana: 'れんしゅうへ',
  },
  retry: {
    normal: 'もう一度',
    hiragana: 'もういちど',
  },
  stageSelectTo: {
    normal: 'ステージ選択へ',
    hiragana: 'すてーじせんたくへ',
  },
  tenReady: {
    normal: '10個がまとまります',
    hiragana: '10こがまとまります',
  },
  marblesCount: {
    normal: 'のおはじきが',
    hiragana: 'のおはじきが',
  },
  moreToTen: {
    normal: 'こ。あと',
    hiragana: 'こ。あと',
  },
  carryPreview: {
    normal: '10のまとまりができます',
    hiragana: '10のまとまりができます',
  },
  releaseToPair: {
    normal: 'はなすと、この2つをあわせられます',
    hiragana: 'はなすと、この2つをあわせられます',
  },
  settings: {
    normal: '設定',
    hiragana: 'せってい',
  },
  sound: {
    normal: '音',
    hiragana: 'おと',
  },
  effects: {
    normal: '効果音',
    hiragana: 'こうかおん',
  },
  accessibleMode: {
    normal: 'アクセシブル表示',
    hiragana: 'あくせしぶるひょうじ',
  },
  textDisplay: {
    normal: 'テキスト表示',
    hiragana: 'てきすとひょうじ',
  },
  normalText: {
    normal: '通常',
    hiragana: 'つうじょう',
  },
  hiraganaText: {
    normal: 'ひらがな',
    hiragana: 'ひらがな',
  },
  resetProgress: {
    normal: '進捗をリセット',
    hiragana: 'しんちょくをりせっと',
  },
};

export function getCopy(key: CopyKey, textMode: TextMode) {
  return copy[key][textMode];
}
