import { TextMode } from '@/store/settingsStore';

export type GameMessageKey =
  | 'start'
  | 'reset'
  | 'selectAnother'
  | 'readyToAdd'
  | 'selectTwoBeforeAdd'
  | 'selectOperatorBeforeDrop'
  | 'retrySelection'
  | 'outOfRange'
  | 'carryBuilding'
  | 'merging'
  | 'targetMade'
  | 'resultReady'
  | 'carryMade'
  | 'merged'
  | 'dragging'
  | 'draggingClear'
  | 'placed'
  | 'undone'
  | 'selectionCleared'
  | 'pressPlusAgain'
  | 'selectTwo';

const messages: Record<GameMessageKey, Record<TextMode, string>> = {
  start: {
    normal: '2つの数を選んで、＋であわせよう',
    hiragana: '2つのかずをえらんで、＋であわせよう',
  },
  reset: {
    normal: 'はじめの形にもどしました',
    hiragana: 'はじめのかたちにもどしました',
  },
  selectAnother: {
    normal: 'もう1つの数を選ぼう',
    hiragana: 'もう1つのかずをえらぼう',
  },
  readyToAdd: {
    normal: '＋であわせられます',
    hiragana: '＋であわせられます',
  },
  selectTwoBeforeAdd: {
    normal: '2つの数を選んでから＋を押そう',
    hiragana: '2つのかずをえらんでから＋をおそう',
  },
  selectOperatorBeforeDrop: {
    normal: '先に＋を選ぶと、次の泡を落とせます',
    hiragana: 'さきに＋をえらぶと、つぎのあわをおとせます',
  },
  retrySelection: {
    normal: '選択をやりなおそう',
    hiragana: 'せんたくをやりなおそう',
  },
  outOfRange: {
    normal: '999をこえる数はまだ使えません',
    hiragana: '999をこえるかずはまだつかえません',
  },
  carryBuilding: {
    normal: '10のまとまりができています',
    hiragana: '10のまとまりができています',
  },
  merging: {
    normal: '数が合流しています',
    hiragana: 'かずがあつまっています',
  },
  targetMade: {
    normal: '目標の数ができました。さわってみよう',
    hiragana: 'もくひょうのかずができました。さわってみよう',
  },
  resultReady: {
    normal: 'できた数を次に使えます',
    hiragana: 'できたかずをつぎにつかえます',
  },
  carryMade: {
    normal: '10のまとまりができました',
    hiragana: '10のまとまりができました',
  },
  merged: {
    normal: '数が合流しました',
    hiragana: 'かずがあつまりました',
  },
  dragging: {
    normal: '数を動かしています',
    hiragana: 'かずをうごかしています',
  },
  draggingClear: {
    normal: 'できた数をさわれます',
    hiragana: 'できたかずをさわれます',
  },
  placed: {
    normal: '数を置きました',
    hiragana: 'かずをおきました',
  },
  undone: {
    normal: 'ひとつ前にもどしました',
    hiragana: 'ひとつまえにもどしました',
  },
  selectionCleared: {
    normal: '選択を外しました',
    hiragana: 'せんたくをはずしました',
  },
  pressPlusAgain: {
    normal: 'もう一度＋を押すと合流します',
    hiragana: 'もういちど＋をおすとあつまります',
  },
  selectTwo: {
    normal: '2つの数を選ぼう',
    hiragana: '2つのかずをえらぼう',
  },
};

export function getGameMessage(key: GameMessageKey, textMode: TextMode = 'normal') {
  return messages[key][textMode];
}
