import { describe, expect, it } from 'vitest';

import { a11yLabel } from '@/i18n/a11y-label';

describe('screen reader names', () => {
  it('leaves every name as written for non-Japanese locales', () => {
    for (const label of ['Back', 'next stage', 'bubble-5', 'bead-normal-1', 'sea creature turtle', 'mixed-3-free', '+', 'stage 2: make 10']) {
      expect(a11yLabel(label, 'en')).toBe(label);
    }
  });

  it('reads fixed names in Japanese', () => {
    expect(a11yLabel('Back', 'ja')).toBe('もどる');
    expect(a11yLabel('next stage', 'ja')).toBe('つぎへ');
    expect(a11yLabel('retry', 'ja')).toBe('やりなおす');
    expect(a11yLabel('marumaru mode', 'ja')).toBe('まるまるモード');
    expect(a11yLabel('+', 'ja')).toBe('たしざん');
    expect(a11yLabel('9×9', 'ja')).toBe('くく');
    expect(a11yLabel('plus', 'ja')).toBe('たす');
  });

  it('keeps the number when a name carries one', () => {
    expect(a11yLabel('bubble-5', 'ja')).toBe('あわ 5');
    expect(a11yLabel('multiply-3', 'ja')).toBe('×3のあわ');
    expect(a11yLabel('divide-4', 'ja')).toBe('÷4のあわ');
    expect(a11yLabel('bead-normal-10', 'ja')).toBe('まる 10');
    expect(a11yLabel('bead-product-12', 'ja')).toBe('かけざんのこたえ 12');
    expect(a11yLabel('mixed-3', 'ja')).toBe('3つのあわ');
    expect(a11yLabel('mixed-3-free', 'ja')).toBe('3つのあわ じゆう');
    expect(a11yLabel('stage 2: make 10', 'ja')).toBe('ステージ2 10にしよう');
    expect(a11yLabel('skip the replay', 'ja')).toBe('とばす');
    expect(a11yLabel('3 × ? shuffled', 'ja')).toBe('3 × ? ばらばら');
    expect(a11yLabel('3 × ?', 'ja')).toBe('3 × ?');
  });

  it('names sea creatures, with a general name for an unknown kind', () => {
    expect(a11yLabel('sea creature turtle', 'ja')).toBe('ウミガメ');
    expect(a11yLabel('sea creature blueTang', 'ja')).toBe('ナンヨウハギ');
    expect(a11yLabel('sea creature kraken', 'ja')).toBe('うみのいきもの');
  });

  it('falls back to the name as written when there is no Japanese for it', () => {
    expect(a11yLabel('1 × ?', 'ja')).toBe('1 × ?');
    expect(a11yLabel('くり上がり', 'ja')).toBe('くり上がり');
  });

  it('never makes one kind of maru or bubble name part of another', () => {
    const names = ['bubble-3', 'multiply-3', 'divide-3', 'bead-normal-3', 'bead-multiplicand-3', 'bead-product-3', 'bead-division-3', 'decorative bubble', 'mixed-3'].map((label) => a11yLabel(label, 'ja'));
    for (const name of names) {
      expect(names.filter((other) => other.includes(name))).toEqual([name]);
    }
  });
});
