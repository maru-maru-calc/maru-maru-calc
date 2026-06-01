import { Platform, Vibration } from 'react-native';

import { SoundEffectEvent } from '@/animation/sound';

type MinimalAudioContext = {
  currentTime: number;
  createOscillator: () => {
    frequency: { value: number };
    type: OscillatorType;
    connect: (destination: unknown) => void;
    start: (time?: number) => void;
    stop: (time?: number) => void;
  };
  createGain: () => {
    gain: {
      setValueAtTime: (value: number, time: number) => void;
      exponentialRampToValueAtTime: (value: number, time: number) => void;
    };
    connect: (destination: unknown) => void;
  };
  destination: unknown;
};

type AudioContextConstructor = new () => MinimalAudioContext;

let audioContext: MinimalAudioContext | undefined;

export function playSoundEffect(event: SoundEffectEvent) {
  if (!event.enabled) {
    return;
  }

  if (Platform.OS === 'web') {
    playWebTone(event);
    return;
  }

  Vibration.vibrate(event.cue.vibrationMs);
}

function playWebTone(event: SoundEffectEvent) {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    return;
  }

  audioContext ??= new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const durationSeconds = event.cue.durationMs / 1000;

  oscillator.type = event.id === 'invalid' ? 'square' : 'sine';
  oscillator.frequency.value = event.cue.frequencyHz;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSeconds);
}

function getAudioContextClass(): AudioContextConstructor | undefined {
  const webGlobal = globalThis as typeof globalThis & {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };

  return webGlobal.AudioContext ?? webGlobal.webkitAudioContext;
}
