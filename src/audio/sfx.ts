export const SFX = {
  clear: {
    source: require('../../assets/audio/sfx/clear-applause.mp3'),
    volume: 0.26,
  },
  fail: {
    source: require('../../assets/audio/sfx/fail-gasp.mp3'),
    volume: 0.42,
  },
  beadTouch: {
    source: require('../../assets/audio/sfx/bead-touch.mp3'),
    volume: 0.08,
  },
  bubblePop: {
    source: require('../../assets/audio/sfx/bubble-pop.mp3'),
    volume: 0.12,
  },
  backgroundBubble: {
    source: require('../../assets/audio/sfx/bubble-pop.mp3'),
    volume: 0.07,
  },
  uiAction: {
    source: require('../../assets/audio/sfx/bead-touch.mp3'),
    volume: 0.09,
  },
  merge: {
    source: require('../../assets/audio/sfx/merge-suction.mp3'),
    volume: 0.13,
  },
  annihilation: {
    source: require('../../assets/audio/sfx/annihilation-impact.mp3'),
    volume: 0.12,
  },
} as const;
