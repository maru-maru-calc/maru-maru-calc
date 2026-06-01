import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { createMergeAnimationPlan } from '@/animation/merge';
import { CarryStepPreview } from '@/components/CarryStepPreview';
import { NumberObjectStrip } from '@/components/NumberObjectStrip';
import { MergeAnimation } from '@/domain/game/types';

type MergeOverlayProps = {
  merge?: MergeAnimation;
};

export function MergeOverlay({ merge }: MergeOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!merge) {
      opacity.setValue(0);
      scale.setValue(0.92);
      rotate.setValue(0);
      return;
    }

    const plan = createMergeAnimationPlan(merge);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: plan.hasCarry ? 260 : 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 110,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: merge.carryEvents.length > 0 ? 1 : 0.45,
        duration: plan.hasCarry ? 640 : 480,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [merge, opacity, rotate, scale]);

  if (!merge) {
    return null;
  }

  const plan = createMergeAnimationPlan(merge);
  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '8deg'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity, transform: [{ scale }, { rotate: spin }] }]}>
      <View style={styles.row}>
        <Bubble value={merge.leftValue} mergeId={merge.id} side="left" />
        <Text style={styles.plus}>＋</Text>
        <Bubble value={merge.rightValue} mergeId={merge.id} side="right" />
      </View>
      <Text style={styles.arrow}>↓</Text>
      <Bubble value={merge.resultValue} mergeId={merge.id} side="result" highlighted />
      {merge.carrySteps.length > 0 ? (
        <View style={styles.carryList}>
          {merge.carrySteps.map((step) => (
            <CarryStepPreview key={step.fromDigit} step={step} />
          ))}
        </View>
      ) : null}
      <Text style={styles.message}>
        {plan.hasCarry ? '10個がひとつ上の位へ' : 'ひとつにまとまりました'}
      </Text>
    </Animated.View>
  );
}

function Bubble({
  value,
  mergeId,
  side,
  highlighted = false,
}: {
  value: number;
  mergeId: string;
  side: 'left' | 'right' | 'result';
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.bubble, highlighted ? styles.highlightedBubble : null]}>
      <Text style={[styles.bubbleText, highlighted ? styles.highlightedText : null]}>{value}</Text>
      <NumberObjectStrip
        value={value}
        groupId={`${mergeId}-${side}`}
        accessibleLabel={`${value}のおはじき`}
        scale={highlighted ? 0.42 : 0.34}
        gap={2}
        minHeight={highlighted ? 28 : 22}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 48,
    bottom: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 250, 241, 0.76)',
    borderColor: 'rgba(241, 213, 159, 0.86)',
    borderWidth: 1,
    shadowColor: '#c48830',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  plus: {
    color: '#256f5d',
    fontSize: 26,
    fontWeight: '800',
  },
  arrow: {
    color: '#746852',
    fontSize: 20,
    fontWeight: '800',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    minHeight: 72,
    borderRadius: 72,
    backgroundColor: '#ffffff',
    borderColor: '#d7c7ad',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  highlightedBubble: {
    minWidth: 96,
    minHeight: 92,
    borderRadius: 92,
    backgroundColor: '#ecf7f1',
    borderColor: '#256f5d',
    borderWidth: 2,
  },
  bubbleText: {
    color: '#25201a',
    fontSize: 22,
    fontWeight: '800',
  },
  highlightedText: {
    color: '#256f5d',
    fontSize: 28,
  },
  message: {
    color: '#746852',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  carryList: {
    gap: 6,
    width: '100%',
    maxWidth: 260,
  },
});
