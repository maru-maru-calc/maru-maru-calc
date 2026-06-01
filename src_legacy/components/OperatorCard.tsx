import { Pressable, StyleSheet, Text } from 'react-native';

import { AdditionReadinessState, OperatorType } from '@/domain/math/types';

type OperatorCardProps = {
  operator?: OperatorType;
  selected: boolean;
  readinessState?: AdditionReadinessState;
  disabled?: boolean;
  onPress: () => void;
};

export function OperatorCard({ operator = 'add', selected, readinessState = 'none', disabled = false, onPress }: OperatorCardProps) {
  const copy = getOperatorCopy(operator);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.accessibilityLabel}
      accessibilityHint={copy.accessibilityHint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.selected : null,
        readinessState === 'near' ? styles.near : null,
        readinessState === 'ready' ? styles.ready : null,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.symbol}>{copy.symbol}</Text>
      <Text style={styles.label}>{copy.label}</Text>
    </Pressable>
  );
}

function getOperatorCopy(operator: OperatorType) {
  if (operator === 'add') {
    return {
      symbol: '＋',
      label: 'あわせる',
      accessibilityLabel: '足し算',
      accessibilityHint: '選んだ2つの数グループをあわせます',
    };
  }

  return {
    symbol: '＋',
    label: 'あわせる',
    accessibilityLabel: '足し算',
    accessibilityHint: '選んだ2つの数グループをあわせます',
  };
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#d7c7ad',
    borderWidth: 1,
    gap: 2,
  },
  selected: {
    backgroundColor: '#ecf7f1',
    borderColor: '#256f5d',
    borderWidth: 2,
  },
  near: {
    backgroundColor: '#fff0d9',
    borderColor: '#b15c00',
    borderWidth: 2,
  },
  ready: {
    backgroundColor: '#ecf7f1',
    borderColor: '#256f5d',
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
  symbol: {
    color: '#256f5d',
    fontSize: 34,
    fontWeight: '800',
  },
  label: {
    color: '#746852',
    fontSize: 13,
    fontWeight: '800',
  },
});
