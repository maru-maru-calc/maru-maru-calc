import { StyleSheet, View } from 'react-native';

import { OperatorCard } from '@/components/OperatorCard';
import { AdditionReadinessState, OperatorType } from '@/domain/math/types';

type OperatorTrayProps = {
  allowedOperators: OperatorType[];
  activeOperator?: OperatorType;
  readinessState?: AdditionReadinessState;
  disabled?: boolean;
  onPressOperator: (operator: OperatorType) => void;
};

export function OperatorTray({
  allowedOperators,
  activeOperator,
  readinessState,
  disabled = false,
  onPressOperator,
}: OperatorTrayProps) {
  return (
    <View style={styles.tray}>
      {allowedOperators.map((operator) => (
        <OperatorCard
          key={operator}
          operator={operator}
          selected={activeOperator === operator}
          readinessState={readinessState}
          disabled={disabled}
          onPress={() => onPressOperator(operator)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    gap: 8,
  },
});
