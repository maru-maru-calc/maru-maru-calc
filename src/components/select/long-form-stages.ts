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
  ...createLongFormStageSet('multiplication', '×', [
    '部分積',
    '位取りの0',
    '部分積の足し算',
    '掛け算まとめ',
  ]),
  ...createLongFormStageSet('division', '÷', [
    '商を立てる',
    'かけて引く',
    '次の位を下ろす',
    '割り算まとめ',
  ]),
];

function createLongFormStageSet(worldId: DentakuWorldId, operator: DentakuStage['operator'], titles: string[]): DentakuStage[] {
  return titles.map((title, index) => {
    const problemNumber = index + 1;
    return {
      id: `long-form-${worldId}-${problemNumber}`,
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
