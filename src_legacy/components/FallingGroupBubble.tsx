import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { NumberObjectStrip } from '@/components/NumberObjectStrip';
import { NumberGroup } from '@/domain/math/types';

type FallingGroupBubbleProps = {
  group: NumberGroup;
  accessibleMode?: boolean;
  onComplete: () => void;
};

export function FallingGroupBubble({ group, accessibleMode, onComplete }: FallingGroupBubbleProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = 0;
    scale.value = 0.94;
    opacity.value = 1;
    rotation.value = 0;

    translateY.value = withTiming(186, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withSequence(
      withTiming(1.02, { duration: 70, easing: Easing.out(Easing.quad) }),
      withTiming(0.9, { duration: 270, easing: Easing.out(Easing.quad) }),
    );
    opacity.value = withTiming(0.86, { duration: 340 });
    rotation.value = withTiming(8, { duration: 340 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    });
  }, [group.id, opacity, rotation, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.container, animatedStyle]}>
      <Text style={styles.caption}>ぽとん</Text>
      <View style={styles.bubble}>
        <NumberObjectStrip
          value={group.value}
          groupId={`fall-${group.id}`}
          accessibleLabel={`${group.value}の落下中の泡のおはじき`}
          accessibleMode={accessibleMode}
          scale={0.58}
          gap={3}
          minHeight={42}
        />
        <Text style={styles.value}>{group.value}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 132,
    marginLeft: -66,
    alignItems: 'center',
    gap: 6,
    zIndex: 40,
  },
  caption: {
    color: '#746852',
    fontSize: 12,
    fontWeight: '800',
  },
  bubble: {
    minWidth: 132,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    borderColor: 'rgba(47, 128, 216, 0.5)',
    borderWidth: 2,
    shadowColor: '#2f80d8',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  value: {
    color: '#25201a',
    fontSize: 18,
    fontWeight: '800',
  },
});
