# まるまるでんたく Figma リデザイン仕様

## 成果物

- Figma取り込み用SVG: [figma-redesign-import.svg](/Users/nozomitaguchi/marumaru-calculator/docs/figma-redesign-import.svg)
- 既存の設計資料: [figma-design-brief.md](/Users/nozomitaguchi/marumaru-calculator/docs/figma-design-brief.md)

Figmaでは `figma-redesign-import.svg` をキャンバスへドラッグ&ドロップし、各画面をFrame化してからコンポーネントへ分解する。

## リデザイン方針

中心は「計算する」ではなく「まるをまとめる」。数字、式、ボタンは補助に留め、フィールド内のまる、まとまりそうな光、まとまった瞬間が最も強く見えるようにする。

## 画面

### StageSelect / default

- サイズ: 390 x 844
- 主役: 次のステージ泡と水路マップ
- ヘッダー: 小さな3つのまるをロゴとして使用
- おすすめカード: 白面、3px水色縁、右に目標泡
- 島タブ: 2分割。選択中は濃い水色面、非選択は白面
- マップ: カード一覧に見えないように、水路、地形パッチ、泡装飾を背面に配置

### Game / almost-merge

- サイズ: 390 x 844
- 主役: 画面中央から下の金魚鉢フィールド
- ヘッダー: 戻る、ステージ階層、ステージタイトルのみ
- 演算タブ: フィールド直上に配置。選択中だけ下線を濃くする
- 待機泡: フィールド上部。1個はまる、複数個は泡に包む
- まとまりそうな状態: 7-9個のまるを淡いリングと粒で強調
- 下部: 状態メッセージ、式、やりなおす。視線を奪わないサイズにする

## デザイントークン

| Token | Value | 用途 |
| --- | --- | --- |
| `color.bg` | `#EAFBFF` | 画面背景、フィールド基調 |
| `color.surface` | `#FFFFFF` | カード、パネル |
| `color.surfaceSoft` | `#E0F7FF` | 泡、薄い面 |
| `color.accent` | `#38BDF8` | アクション縁、ルート |
| `color.accentStrong` | `#0EA5E9` | 選択中、強調 |
| `color.accentRim` | `#0284C7` | 濃い縁、影 |
| `color.text` | `#12334A` | 主テキスト |
| `color.textSub` | `#075985` | 補助テキスト |
| `color.line` | `#BAE6FD` | 薄い縁 |
| `color.success` | `#8DEBD8` | できた、まとまり |
| `color.unit` | `#FDE68A` | 1のまる |
| `color.ten` | `#8DEBD8` | 10のまる |
| `color.hundred` | `#7DD3FC` | 100のまる |

## コンポーネント化

| Component | Variants |
| --- | --- |
| `Bead` | `1`, `10`, `100`, `negative`, `almost-merge`, `dragging` |
| `PendingBubble` | `single`, `group`, `multiply`, `divide`, `negative` |
| `OperatorTab` | `plus/active`, `minus`, `multiply`, `divide`, `locked` |
| `StageNode` | `next`, `done`, `waiting` |
| `IslandTab` | `active`, `inactive` |
| `ActionButton` | `primary`, `secondary` |
| `ResultPanel` | `clear`, `failed` |

## タイポグラフィ

- 推奨: `Noto Sans JP`
- 見出し: 28-34 / 900
- ステージタイトル: 24-29 / 900
- ボタン: 15-18 / 900
- 補助文: 12-14 / 800
- 画面上の文言はひらがな中心。漢字は使わない。

## Figmaでの調整ポイント

- 1のまるは重なりやすいので、透明度と縁の強さを実機相当で確認する
- ゲーム画面ではフィールドの高さを最優先し、下部UIを大きくしすぎない
- `つぎ` ノードは最初に押せる場所だとわかる強さを保つ
- `できた!` パネルは情報を増やさず、次のアクションだけを明確にする
