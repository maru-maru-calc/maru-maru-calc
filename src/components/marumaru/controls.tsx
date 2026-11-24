// The operator buttons and the expression display.
import { Pressable, Text, View } from 'react-native';

import { OPERATORS, OPERATOR_NAMES } from '@/components/marumaru/constants';
import { canUseOperator } from '@/components/marumaru/operators';
import { styles } from '@/components/marumaru/styles';
import type { OperatorButtonSymbol } from '@/components/marumaru/types';
import { OperatorImageIcon } from '@/components/OperatorImageIcon';
import { OperatorSymbol } from '@/game/expression';
import { BeadSign, OperatorUsageLimits } from '@/game/types';
import { a11yLabel } from '@/i18n/a11y-label';

export function OperatorRail({
  selectedOperator,
  operatorSign,
  operatorUsage,
  hasInputValue,
  hasActiveSelection,
  isLocked,
  onSelect,
}: {
  selectedOperator: OperatorSymbol;
  operatorSign: BeadSign;
  operatorUsage: OperatorUsageLimits;
  hasInputValue: boolean;
  hasActiveSelection: boolean;
  isLocked: boolean;
  onSelect: (operator: OperatorButtonSymbol) => void;
}) {
  return (
    <View style={styles.operatorRail}>
      {OPERATORS.map((operator) => {
        const usage = operatorUsage[operator];
        const isUsable = canUseOperator(usage);
        const isMainSelected = hasActiveSelection && isUsable && operator === selectedOperator;
        const isSignSelected = hasActiveSelection && isUsable && operator === '-' && operatorSign < 0 && (selectedOperator === '×' || selectedOperator === '÷');
        const isSelected = isMainSelected || isSignSelected;
        const isDisabled = !hasInputValue || isLocked || !isUsable;
        return (
          <Pressable
            key={operator}
            accessibilityLabel={a11yLabel(OPERATOR_NAMES[operator])}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            disabled={isDisabled}
            testID={`operator-${operator}`}
            onPress={() => onSelect(operator)}
            style={({ pressed }) => [
              styles.operatorButton,
              isMainSelected && styles.selectedOperatorButton,
              isSignSelected && styles.selectedSignOperatorButton,
              isDisabled && styles.disabledOperatorButton,
              pressed && styles.pressedButton,
            ]}
          >
            <View style={[styles.operatorIconWrap, isDisabled && styles.disabledOperatorIconWrap]}>
              <OperatorImageIcon operator={operator} size={28} />
            </View>
            {typeof usage === 'number' && usage > 0 ? (
              <View testID={`operator-${operator}-usage`} style={styles.operatorUsageBadge}>
                <Text style={styles.operatorUsageBadgeText}>{usage}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ExpressionDisplay({ tokens }: { tokens: string[] }) {
  return (
    <View style={styles.expressionBox} testID="expression-display">
      <Text
        testID="expression-display-text"
        style={[styles.expressionText, tokens.length === 0 && styles.expressionPlaceholder]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {tokens.length > 0 ? tokens.join(' ') : ''}
      </Text>
    </View>
  );
}
