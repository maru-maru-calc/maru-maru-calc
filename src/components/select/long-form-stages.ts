// The worlds and stages of ひっさん (written calculation) mode.
import { DENTAKU_WORLDS, DentakuStage, DentakuWorldId } from '@/game/dentaku';

export const LONG_FORM_WORLDS = DENTAKU_WORLDS.filter((world) => world.id === 'addition' || world.id === 'subtraction' || world.id === 'multiplication' || world.id === 'division');
export const LONG_FORM_STAGES: DentakuStage[] = [
  ...createLongFormStageSet('addition', '+', [
    '2けた + 1けた',
    'くり上がり',
    '2けた + 2けた',
    '一のくらいでくり上がり',
    '百のくらいへ',
    '足し算まとめ',
  ]),
  ...createLongFormStageSet('subtraction', '-', [
    '2けた - 1けた',
    'くり下がり',
    '2けた - 2けた',
    '2けたのくり下がり',
    '引き算まとめ',
  ]),
  // Two digits × one digit come first. They were added later, so the stages after them keep the
  // ids they were saved under.
  ...createLongFormStageSet('multiplication', '×', [
    { title: '2けた × 1けた', id: 'long-form-multiplication-single-1' },
    { title: '2けた × 1けた くり上がり', id: 'long-form-multiplication-single-2' },
    { title: '2けた × 2けた', id: 'long-form-multiplication-1' },
    { title: '2けた × 2けた くり上がり', id: 'long-form-multiplication-2' },
    { title: '2けた × 2けた 大きい数', id: 'long-form-multiplication-3' },
    { title: '掛け算まとめ', id: 'long-form-multiplication-4' },
  ]),
  ...createLongFormStageSet('division', '÷', [
    '商を立てる',
    'かけて引く',
    '次の位を下ろす',
    '割り算まとめ',
  ]),
];

function createLongFormStageSet(worldId: DentakuWorldId, operator: DentakuStage['operator'], titles: Array<string | { title: string; id: string }>): DentakuStage[] {
  return titles.map((entry, index) => {
    const problemNumber = index + 1;
    const title = typeof entry === 'string' ? entry : entry.title;
    return {
      id: typeof entry === 'string' ? `long-form-${worldId}-${problemNumber}` : entry.id,
      worldId,
      title,
      label: `#${problemNumber}`,
      kind: 'binary' as const,
      operator,
      operandCount: 2,
      problemNumber,
    };
  });
}
