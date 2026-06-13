import { Image, StyleSheet, View } from 'react-native';

type OperatorImageIconKind = '+' | '-' | '×' | '÷';

const OPERATOR_ICON_SOURCES = {
  '+': require('../../assets/ui/op-plus.png'),
  '-': require('../../assets/ui/op-minus.png'),
  '×': require('../../assets/ui/op-multiply.png'),
  '÷': require('../../assets/ui/op-divide.png'),
} as const;

export function OperatorImageIcon({ operator, size = 26 }: { operator: OperatorImageIconKind; size?: number }) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Image source={OPERATOR_ICON_SOURCES[operator]} style={[styles.icon, { width: size, height: size }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    resizeMode: 'contain',
  },
});
