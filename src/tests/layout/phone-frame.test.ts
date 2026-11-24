import { describe, expect, it } from 'vitest';

import { getPhoneFrameLayout, isSidewaysPhone, PHONE_SHELL_MAX_HEIGHT, PHONE_SHELL_MIN_HEIGHT, PHONE_SHELL_WIDTH, shouldUsePhoneFrame } from '@/layout/phone-frame';

describe('phone frame layout', () => {
  it('keeps the frame at its own size when the space matches it', () => {
    const layout = getPhoneFrameLayout(PHONE_SHELL_WIDTH, PHONE_SHELL_MIN_HEIGHT);

    expect(layout.scale).toBe(1);
    expect(layout.shellHeight).toBe(PHONE_SHELL_MIN_HEIGHT);
    expect(layout.slotWidth).toBe(PHONE_SHELL_WIDTH);
    expect(layout.slotHeight).toBe(PHONE_SHELL_MIN_HEIGHT);
  });

  it('scales the frame up on a large screen', () => {
    const layout = getPhoneFrameLayout(1300, 910);

    expect(layout.scale).toBeCloseTo(1.3);
    expect(layout.shellHeight).toBe(PHONE_SHELL_MIN_HEIGHT);
    expect(layout.slotHeight).toBeCloseTo(910);
  });

  it('scales the frame down on a short window instead of cutting the game off', () => {
    const layout = getPhoneFrameLayout(1200, 490);

    expect(layout.scale).toBeCloseTo(0.7);
    expect(layout.shellHeight).toBe(PHONE_SHELL_MIN_HEIGHT);
    expect(layout.slotHeight).toBeCloseTo(490);
  });

  it('uses spare height for a taller frame when the width limits the scale', () => {
    const layout = getPhoneFrameLayout(PHONE_SHELL_WIDTH, 760);

    expect(layout.scale).toBe(1);
    expect(layout.shellHeight).toBe(760);
  });

  it('never makes the frame taller than its maximum', () => {
    const layout = getPhoneFrameLayout(PHONE_SHELL_WIDTH, 2000);

    expect(layout.scale).toBe(1);
    expect(layout.shellHeight).toBe(PHONE_SHELL_MAX_HEIGHT);
  });

  it('stops scaling at twice the size', () => {
    expect(getPhoneFrameLayout(4000, 4000).scale).toBe(2);
  });

  it('always fits inside the space it is given', () => {
    for (const [width, height] of [[1132, 698], [772, 1058], [552, 902], [1872, 958], [320, 320]]) {
      const layout = getPhoneFrameLayout(width, height);
      expect(layout.slotWidth <= width + 0.001).toBe(true);
      expect(layout.slotHeight <= height + 0.001).toBe(true);
    }
  });
});

describe('choosing between the phone frame and the full-window game', () => {
  it('fills the window on a portrait phone', () => {
    expect(shouldUsePhoneFrame(390, 844)).toBe(false);
    expect(shouldUsePhoneFrame(430, 932)).toBe(false);
  });

  it('uses the frame on tablets and desktop windows', () => {
    expect(shouldUsePhoneFrame(768, 1024)).toBe(true);
    expect(shouldUsePhoneFrame(1180, 820)).toBe(true);
    expect(shouldUsePhoneFrame(1440, 900)).toBe(true);
  });

  it('uses the frame, scaled down, on a wide but short desktop window', () => {
    expect(isSidewaysPhone(1280, 480)).toBe(false);
    expect(shouldUsePhoneFrame(1280, 480)).toBe(true);
  });

  it('treats a phone held sideways as its own case', () => {
    expect(isSidewaysPhone(844, 390)).toBe(true);
    expect(isSidewaysPhone(667, 375)).toBe(true);
    expect(shouldUsePhoneFrame(844, 390)).toBe(false);
    expect(isSidewaysPhone(390, 844)).toBe(false);
    expect(isSidewaysPhone(402, 660)).toBe(false);
  });
});
