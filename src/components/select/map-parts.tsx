// Small pieces shared by the select screens: the sound switch, the route between buttons, the mermaid, the starfish.
import { Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useBgmControl } from '@/audio/bgm-control';
import { styles } from '@/components/select/styles';
import type { MapNodeLayout } from '@/components/select/types';
import { a11yLabel } from '@/i18n/a11y-label';

export function SoundToggleButton() {
  const { isMuted, toggleMute } = useBgmControl();

  return (
    <Pressable
      accessibilityLabel={a11yLabel(isMuted ? 'turn sound on' : 'turn sound off')}
      accessibilityRole="switch"
      accessibilityState={{ checked: !isMuted }}
      onPress={toggleMute}
      testID="sound-toggle"
      style={({ pressed }) => [styles.soundButton, pressed && styles.pressed]}
    >
      <Text pointerEvents="none" style={[styles.soundButtonNote, isMuted && styles.soundButtonNoteMuted]}>
        ♪
      </Text>
      {isMuted ? <View pointerEvents="none" testID="sound-toggle-muted-mark" style={styles.soundButtonMutedSlash} /> : null}
    </Pressable>
  );
}

export function RoundedStarfish({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const armWidth = size * 0.34;
  const armHeight = size * 0.5;
  const center = size / 2;
  const armRadius = size * 0.23;
  const dotSize = size * 0.12;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = -90 + index * 72;
        const radians = (angle * Math.PI) / 180;
        return (
          <View
            key={index}
            style={[
              styles.roundedStarfishArm,
              {
                width: armWidth,
                height: armHeight,
                borderRadius: armWidth,
                left: center + Math.cos(radians) * armRadius - armWidth / 2,
                top: center + Math.sin(radians) * armRadius - armHeight / 2,
                transform: [{ rotate: `${angle + 90}deg` }],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.roundedStarfishCenter,
          {
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size * 0.21,
            left: center - size * 0.21,
            top: center - size * 0.21,
          },
        ]}
      />
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.roundedStarfishDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: center + Math.cos((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
              top: center + Math.sin((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function BubbleRoute({ from, to }: { from: MapNodeLayout; to: MapNodeLayout }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const bubbleCount = Math.max(3, Math.floor(length / 38));

  return (
    <>
      {Array.from({ length: bubbleCount }).map((_, index) => {
        const progress = (index + 1) / (bubbleCount + 1);
        const wave = Math.sin(progress * Math.PI * 2 + angle) * 9;
        const x = from.x + dx * progress + Math.cos(angle + Math.PI / 2) * wave;
        const y = from.y + dy * progress + Math.sin(angle + Math.PI / 2) * wave;
        const size = 8 + (index % 3) * 3;
        return (
          <View
            key={`route-bubble-${index}`}
            pointerEvents="none"
            style={[
              styles.routeBubble,
              { left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2 },
            ]}
          />
        );
      })}
    </>
  );
}

export function SingingMermaid({
  isVocalEnabled,
  mapWidth,
  onPress,
  style,
}: {
  isVocalEnabled: boolean;
  mapWidth: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const left = Math.min(Math.max(16, mapWidth * 0.08), 46);

  return (
    <Pressable
      accessibilityLabel={a11yLabel(isVocalEnabled ? 'turn off mermaid song' : 'turn on mermaid song')}
      accessibilityRole="switch"
      accessibilityState={{ checked: isVocalEnabled }}
      onPress={onPress}
      testID="singing-mermaid"
      style={({ pressed }) => [styles.singingMermaid, { left }, style, pressed && styles.pressed]}
    >
      <View style={styles.mermaidSongBubbleOne} />
      <View style={styles.mermaidSongBubbleTwo} />
      <View style={styles.mermaidSongBubbleThree} />
      {isVocalEnabled ? (
        <>
          <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteOne]}>
            ♪
          </Text>
          <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteTwo]}>
            ♫
          </Text>
          <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteThree]}>
            ♪
          </Text>
        </>
      ) : null}
      <View style={styles.mermaidRockBack} />
      <View style={styles.mermaidRockLeft} />
      <View style={styles.mermaidRockRight} />
      <View style={styles.mermaidTailFin} />
      <View style={styles.mermaidTail} />
      <View style={styles.mermaidBody} />
      <View style={styles.mermaidArmBack} />
      <View style={styles.mermaidArmFront} />
      <View style={styles.mermaidHairBack} />
      <View style={styles.mermaidLongHair} />
      <View style={styles.mermaidHead} />
      <View style={styles.mermaidHairFront} />
      <View style={styles.mermaidEye} />
      <View style={styles.mermaidMouth} />
      <View style={styles.mermaidHairShine} />
    </Pressable>
  );
}
