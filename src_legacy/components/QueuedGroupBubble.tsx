import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NumberObjectStrip } from '@/components/NumberObjectStrip';
import { NumberGroup } from '@/domain/math/types';
import { TextMode } from '@/store/settingsStore';

type QueuedGroupBubbleProps = {
  group?: NumberGroup;
  disabled?: boolean;
  requiresOperator?: boolean;
  highlighted?: boolean;
  hidden?: boolean;
  textMode: TextMode;
  accessibleMode?: boolean;
  onPress: () => void;
};

export function QueuedGroupBubble({
  group,
  disabled = false,
  requiresOperator = false,
  highlighted = false,
  hidden = false,
  textMode,
  accessibleMode,
  onPress,
}: QueuedGroupBubbleProps) {
  if (!group) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.caption}>{textMode === 'hiragana' ? 'つぎのあわはありません' : '次の泡はありません'}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.value}の泡`}
      accessibilityHint={requiresOperator ? '先に演算子を選ぶと落とせます' : 'タップするとボウルへ落ちます'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        hidden ? styles.hidden : null,
        requiresOperator ? styles.waitingForOperator : null,
        highlighted ? styles.highlighted : null,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.caption}>{requiresOperator ? '＋を選んでから' : '次の泡'}</Text>
      <View style={[styles.bubble, highlighted ? styles.highlightedBubble : null]}>
        <NumberObjectStrip
          value={group.value}
          groupId={`queue-${group.id}`}
          accessibleLabel={`${group.value}の泡のおはじき`}
          accessibleMode={accessibleMode}
          scale={0.58}
          gap={3}
          minHeight={42}
        />
        <Text style={styles.value}>{group.value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  empty: {
    opacity: 0.68,
  },
  waitingForOperator: {
    opacity: 0.82,
  },
  hidden: {
    opacity: 0.08,
    transform: [{ scale: 0.86 }],
  },
  highlighted: {
    opacity: 1,
  },
  disabled: {
    opacity: 0.56,
  },
  pressed: {
    opacity: 0.72,
  },
  caption: {
    color: '#746852',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(47, 128, 216, 0.44)',
    borderWidth: 2,
    shadowColor: '#2f80d8',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  highlightedBubble: {
    backgroundColor: 'rgba(255, 248, 224, 0.86)',
    borderColor: 'rgba(241, 166, 56, 0.82)',
  },
  value: {
    color: '#25201a',
    fontSize: 18,
    fontWeight: '800',
  },
});
