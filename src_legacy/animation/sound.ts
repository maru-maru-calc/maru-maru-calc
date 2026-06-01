import { SoundEffectId, SoundSettings, canPlaySoundEffect } from '@/domain/game/audio';

export type SoundEffectEvent = {
  id: SoundEffectId;
  enabled: boolean;
  cue: SoundCue;
};

export type SoundCue = {
  frequencyHz: number;
  durationMs: number;
  vibrationMs: number;
};

const soundCues: Record<SoundEffectId, SoundCue> = {
  select: { frequencyHz: 660, durationMs: 55, vibrationMs: 8 },
  place: { frequencyHz: 440, durationMs: 70, vibrationMs: 12 },
  merge: { frequencyHz: 520, durationMs: 110, vibrationMs: 18 },
  carry: { frequencyHz: 760, durationMs: 150, vibrationMs: 26 },
  invalid: { frequencyHz: 180, durationMs: 90, vibrationMs: 24 },
  clear: { frequencyHz: 880, durationMs: 210, vibrationMs: 34 },
  reset: { frequencyHz: 300, durationMs: 80, vibrationMs: 16 },
};

export function createSoundEffectEvent(id: SoundEffectId, settings: SoundSettings): SoundEffectEvent {
  return {
    id,
    enabled: canPlaySoundEffect(settings),
    cue: getSoundCue(id),
  };
}

export function getSoundCue(id: SoundEffectId): SoundCue {
  return soundCues[id];
}
