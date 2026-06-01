import { useEffect, useRef } from 'react';

import { createSoundEffectEvent, SoundEffectEvent } from '@/animation/sound';
import { playSoundEffect } from '@/animation/playSoundEffect';
import { SoundEffectId, SoundSettings } from '@/domain/game/audio';

type UseSoundEffectOptions = SoundSettings & {
  soundEffectId?: SoundEffectId;
  soundEffectSeq?: number;
  onSoundEffect?: (event: SoundEffectEvent) => void;
};

export function useSoundEffect({
  soundEffectId,
  soundEffectSeq = 0,
  soundEnabled,
  effectsEnabled,
  onSoundEffect,
}: UseSoundEffectOptions) {
  const lastSoundEffectSeq = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!soundEffectId || lastSoundEffectSeq.current === soundEffectSeq) {
      return;
    }

    lastSoundEffectSeq.current = soundEffectSeq;
    const event = createSoundEffectEvent(soundEffectId, { soundEnabled, effectsEnabled });
    playSoundEffect(event);
    onSoundEffect?.(event);
  }, [effectsEnabled, onSoundEffect, soundEffectId, soundEffectSeq, soundEnabled]);
}
